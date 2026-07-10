require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const SqliteStore = require("better-sqlite3-session-store")(session);

const { MAX_IPS_PER_REQUEST, PORT, SESSION_SECRET } = require("./src/config");
const db = require("./src/db");
const { parseIpList } = require("./src/parseInput");
const { isValidIp } = require("./src/validate");
const { extractHostname } = require("./src/hostname");
const { resolveHostname } = require("./src/dnsResolve");
const { lookupIps } = require("./src/ipinfoClient");
const { buildStats } = require("./src/stats");
const { router: authRouter, requireAuth } = require("./src/auth");
const { router: historyRouter, saveLookup } = require("./src/history");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1 * 1024 * 1024 } });

app.use(express.json({ limit: "50kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 15 * 60 * 1000 } }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authRouter);
app.use("/api/history", historyRouter);

app.post("/api/lookup", requireAuth, lookupLimiter, upload.single("file"), async (req, res) => {
  const tokens = parseIpList(req.body.ips, req.file ? req.file.buffer : null);

  if (tokens.length === 0) {
    return res.status(400).json({ error: "No se recibio ninguna IP o dominio para consultar." });
  }

  if (tokens.length > MAX_IPS_PER_REQUEST) {
    return res.status(400).json({
      error: `Se recibieron ${tokens.length} entradas, el maximo permitido por solicitud es ${MAX_IPS_PER_REQUEST}.`,
    });
  }

  const invalid = [];
  const hostnames = [];
  const directEntries = [];

  for (const token of tokens) {
    if (isValidIp(token)) {
      directEntries.push({ ip: token, resolvedFrom: null });
      continue;
    }
    const hostname = extractHostname(token);
    if (!hostname) {
      invalid.push({ ip: token, reason: "Formato de IP o dominio invalido" });
      continue;
    }
    hostnames.push(hostname);
  }

  const dnsErrors = [];
  const resolvedEntries = [];

  await Promise.all(
    hostnames.map(async (hostname) => {
      try {
        const addresses = await resolveHostname(hostname);
        for (const ip of addresses) resolvedEntries.push({ ip, resolvedFrom: hostname });
      } catch (error) {
        dnsErrors.push({ host: hostname, reason: error.message });
      }
    })
  );

  const uniqueEntries = new Map();
  for (const entry of [...directEntries, ...resolvedEntries]) {
    if (!uniqueEntries.has(entry.ip)) uniqueEntries.set(entry.ip, entry);
  }
  const ipEntries = Array.from(uniqueEntries.values());

  const { results, apiErrors, cacheHits, apiCalls } = await lookupIps(ipEntries.map((entry) => entry.ip));
  const resolvedFromByIp = new Map(ipEntries.map((entry) => [entry.ip, entry.resolvedFrom]));
  const enrichedResults = results.map((result) => ({
    ...result,
    resolvedFrom: resolvedFromByIp.get(result.ip) || null,
  }));

  const stats = buildStats(enrichedResults);

  const payload = {
    requested: tokens.length,
    results: enrichedResults,
    invalid,
    apiErrors,
    dnsErrors,
    stats,
    meta: { cacheHits, apiCalls },
  };

  try {
    saveLookup(req.session.userId, payload);
  } catch (error) {
    console.error("No se pudo guardar el historial:", error.message);
  }

  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`ip-lookup-app escuchando en http://localhost:${PORT}`);
});
