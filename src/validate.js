const net = require("net");

function isValidIp(value) {
  return net.isIP(value) !== 0;
}

module.exports = { isValidIp };
