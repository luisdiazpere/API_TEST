const express = require("express");
const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");

const { MAX_IPS_PER_REQUEST, PORT } = require("./src/config");
const { parseIpList } = require("./src/parseInput");
const { isValidIp } = require("./src/validate");
const { extractHostname } = require("./src/hostname");
const { resolveHostname } = require("./src/dnsResolve");
const { lookupIps } = require("./src/ipinfoClient");
const { buildStats } = require("./src/stats");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1 * 1024 * 1024 } });

app.use(express.json({ limit: "50kb" }));
app.use(express.static(path.join(__dirname, "public")));

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post("/api/lookup", lookupLimiter, upload.single("file"), async (req, res) => {
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

  res.json({
    requested: tokens.length,
    results: enrichedResults,
    invalid,
    apiErrors,
    dnsErrors,
    stats,
    meta: { cacheHits, apiCalls },
  });
});

app.listen(PORT, () => {
  console.log(`ip-lookup-app escuchando en http://localhost:${PORT}`);
});
