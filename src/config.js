// Token hardcodeado por decision explicita del usuario (prototipo).
// Antes de exponer este servicio publicamente, mover a variable de entorno.
const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
const IPINFO_BASE_URL = "https://api.ipinfo.io/lite";
const MAX_IPS_PER_REQUEST = 50;
const CACHE_TTL_MS = 10 * 60 * 1000;
const LOOKUP_CONCURRENCY = 5;
const PORT = 3000;

module.exports = {
  IPINFO_TOKEN,
  IPINFO_BASE_URL,
  MAX_IPS_PER_REQUEST,
  CACHE_TTL_MS,
  LOOKUP_CONCURRENCY,
  PORT,
};
