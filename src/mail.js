const nodemailer = require("nodemailer");
const { SMTP_URL, MAIL_FROM } = require("./config");

function welcome(name) {
  return {
    subject: "Welcome to IP Lookup",
    text: `Hi ${name},\n\nYour IP Lookup account is ready. Sign in to run batch IP and `
        + `domain lookups and keep a searchable history of every batch.\n\n— IP Lookup`,
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
