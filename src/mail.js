const nodemailer = require("nodemailer");
const { SMTP_URL, MAIL_FROM } = require("./config");

function welcome(name) {
  return {
    subject: "Welcome to IP Lookup",
    text: `Hi ${name},\n\n`
        + `Welcome to IP Lookup — your account is ready.\n\n`
        + `IP Lookup batch-resolves IPs, domains, and URLs into geolocation data in one request. `
        + `A few things you can do:\n\n`
        + `- Paste or upload up to 50 IPs, domains, or URLs at once\n`
        + `- Domains and URLs are automatically resolved via DNS before lookup\n`
        + `- See country, continent, ASN, and organization for every result\n`
        + `- Get per-batch stats and export everything as CSV or JSON\n`
        + `- Every batch is saved to your history so you can revisit it later\n\n`
        + `Sign in and paste your first list to get started.\n\n— IP Lookup`,
  };
}

async function sendWelcome(to, name) {
  const { subject, text } = welcome(name);
  if (!SMTP_URL) {
    console.warn(`[mail] SMTP_URL unset — would send to ${to}: ${subject}\n${text}`);
    return false;
  }
  await nodemailer.createTransport(SMTP_URL).sendMail({ from: MAIL_FROM, to, subject, text });
  return true;
}

module.exports = { sendWelcome, welcome };
