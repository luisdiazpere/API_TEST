const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
if (!IPINFO_TOKEN) throw new Error("IPINFO_TOKEN env var is required — set it in .env");

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET env var is required — set it in .env");

const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
if (!CLERK_PUBLISHABLE_KEY) throw new Error("CLERK_PUBLISHABLE_KEY env var is required — set it in .env");

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY env var is required — set it in .env");

const IPINFO_BASE_URL = "https://api.ipinfo.io/lite";
const MAX_IPS_PER_REQUEST = 50;
const CACHE_TTL_MS = 10 * 60 * 1000;
const LOOKUP_CONCURRENCY = 5;
const PORT = 3000;

module.exports = {
  IPINFO_TOKEN,
  SESSION_SECRET,
  CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY,
  IPINFO_BASE_URL,
  MAX_IPS_PER_REQUEST,
  CACHE_TTL_MS,
  LOOKUP_CONCURRENCY,
  PORT,
};
