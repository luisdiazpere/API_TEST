const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "..", "data.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lookups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    requested_count INTEGER NOT NULL,
    results_json TEXT NOT NULL,
    stats_json TEXT NOT NULL,
    cache_hits INTEGER NOT NULL,
    api_calls INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_lookups_user ON lookups(user_id, created_at DESC);
`);

module.exports = db;
