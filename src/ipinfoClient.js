const { IPINFO_TOKEN, IPINFO_BASE_URL, LOOKUP_CONCURRENCY } = require("./config");
const cache = require("./cache");

async function fetchIp(ip) {
  const response = await fetch(`${IPINFO_BASE_URL}/${ip}`, {
    headers: { Authorization: `Bearer ${IPINFO_TOKEN}` },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Token de ipinfo.io invalido o sin autorizacion");
    if (response.status === 429) throw new Error("Limite de solicitudes de ipinfo.io alcanzado");
    if (response.status === 400) throw new Error("ipinfo.io rechazo la IP como invalida");
    throw new Error(`ipinfo.io respondio con estado ${response.status}`);
  }

  return response.json();
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    const current = nextIndex++;
    if (current >= items.length) return;
    results[current] = await worker(items[current]);
    await runNext();
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(runners);
  return results;
}

async function lookupIps(ips) {
  const results = [];
  const apiErrors = [];
  let cacheHits = 0;
  let apiCalls = 0;

  await mapLimit(ips, LOOKUP_CONCURRENCY, async (ip) => {
    const cached = cache.get(ip);
    if (cached) {
      cacheHits += 1;
      results.push({ ...cached, fromCache: true });
      return;
    }

    try {
      apiCalls += 1;
      const data = await fetchIp(ip);
      cache.set(ip, data);
      results.push({ ...data, fromCache: false });
    } catch (error) {
      apiErrors.push({ ip, reason: error.message });
    }
  });

  return { results, apiErrors, cacheHits, apiCalls };
}

module.exports = { lookupIps };
