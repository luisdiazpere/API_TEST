process.env.IPINFO_TOKEN ||= "test";
process.env.SESSION_SECRET ||= "test";
process.env.CLERK_PUBLISHABLE_KEY ||= "test";
process.env.CLERK_SECRET_KEY ||= "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const { welcome, sendWelcome } = require("../src/mail");

test("welcome() includes the recipient's name", () => {
  const { text } = welcome("Ada");
  assert.match(text, /Hi Ada,/);
});

test("sendWelcome() skips sending and returns false when SMTP_URL is unset", async () => {
  const sent = await sendWelcome("ada@example.com", "Ada");
  assert.equal(sent, false);
});
