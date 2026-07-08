function parseIpList(text, fileBuffer) {
  const raw = [];
  if (text && text.trim()) raw.push(text);
  if (fileBuffer) raw.push(fileBuffer.toString("utf-8"));

  const tokens = raw
    .join(",")
    .split(/[\n,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  return Array.from(new Set(tokens));
}

module.exports = { parseIpList };
