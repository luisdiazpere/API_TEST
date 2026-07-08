const { CACHE_TTL_MS } = require("./config");

const store = new Map();

function get(ip) {
  const entry = store.get(ip);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(ip);
    return null;
  }
  return entry.data;
}

function set(ip, data) {
  store.set(ip, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

module.exports = { get, set };
