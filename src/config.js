const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
if (!IPINFO_TOKEN) throw new Error("IPINFO_TOKEN env var is required — set it in .env");

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
