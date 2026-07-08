const HOSTNAME_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/;

function extractHostname(token) {
  let candidate = token;

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(token)) {
    try {
      candidate = new URL(token).hostname;
    } catch {
      return null;
    }
  }

  return HOSTNAME_REGEX.test(candidate) ? candidate.toLowerCase() : null;
}

module.exports = { extractHostname };
