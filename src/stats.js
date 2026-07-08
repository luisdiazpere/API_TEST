function toSortedArray(counts) {
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function buildStats(results) {
  const byCountry = {};
  const byContinent = {};
  const byAsn = {};
  let bogonCount = 0;

  for (const result of results) {
    if (result.bogon) {
      bogonCount += 1;
      continue;
    }
    byCountry[result.country] = (byCountry[result.country] || 0) + 1;
    byContinent[result.continent] = (byContinent[result.continent] || 0) + 1;
    byAsn[result.as_name || result.asn] = (byAsn[result.as_name || result.asn] || 0) + 1;
  }

  return {
    totalLookups: results.length,
    bogonCount,
    byCountry: toSortedArray(byCountry),
    byContinent: toSortedArray(byContinent),
    byAsn: toSortedArray(byAsn),
  };
}

module.exports = { buildStats };
