const express = require("express");
const db = require("./db");
const { requireAuth } = require("./auth");

const router = express.Router();
router.use(requireAuth);

function saveLookup(userId, payload) {
  db.prepare(
    `INSERT INTO lookups (user_id, requested_count, results_json, stats_json, cache_hits, api_calls)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    payload.requested,
    JSON.stringify({
      results: payload.results,
      invalid: payload.invalid,
      apiErrors: payload.apiErrors,
      dnsErrors: payload.dnsErrors,
    }),
    JSON.stringify(payload.stats),
    payload.meta.cacheHits,
    payload.meta.apiCalls
  );
}

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, created_at, requested_count, stats_json, cache_hits, api_calls
       FROM lookups WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`
    )
    .all(req.session.userId);

  const sessions = rows.map((row) => {
    const stats = JSON.parse(row.stats_json);
    const topRegion = stats.byContinent && stats.byContinent[0] ? stats.byContinent[0].name : null;
    const totalCalls = row.cache_hits + row.api_calls;
    return {
      id: row.id,
      createdAt: row.created_at,
      requestedCount: row.requested_count,
      topRegion,
      bogonCount: stats.bogonCount ?? 0,
      cachePercent: totalCalls > 0 ? Math.round((row.cache_hits / totalCalls) * 100) : 0,
    };
  });

  res.json({ sessions });
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM lookups WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.session.userId);

  if (!row) return res.status(404).json({ error: "Sesion de consulta no encontrada." });

  const stored = JSON.parse(row.results_json);
  res.json({
    id: row.id,
    createdAt: row.created_at,
    requested: row.requested_count,
    results: stored.results,
    invalid: stored.invalid,
    apiErrors: stored.apiErrors,
    dnsErrors: stored.dnsErrors,
    stats: JSON.parse(row.stats_json),
    meta: { cacheHits: row.cache_hits, apiCalls: row.api_calls },
  });
});

router.delete("/:id", (req, res) => {
  const info = db
    .prepare("DELETE FROM lookups WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.session.userId);
  if (info.changes === 0) return res.status(404).json({ error: "Sesion de consulta no encontrada." });
  res.json({ ok: true });
});

module.exports = { router, saveLookup };
