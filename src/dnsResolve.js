const dns = require("dns");
const { promisify } = require("util");

const lookup = promisify(dns.lookup);

async function resolveHostname(hostname) {
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.map((entry) => entry.address);
  } catch (error) {
    throw new Error(`No se pudo resolver "${hostname}" (${error.code || error.message})`);
  }
}

module.exports = { resolveHostname };
