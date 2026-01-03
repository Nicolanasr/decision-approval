import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST ?? "";
const smtpPort = Number(process.env.SMTP_PORT ?? "587");
const smtpUser = process.env.SMTP_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? "";
const fromEmail = process.env.SMTP_FROM_EMAIL ?? "";
const fromName = process.env.SMTP_FROM_NAME ?? "Decision Log";

function hasSmtpConfig() {
  return smtpHost && smtpUser && smtpPass && fromEmail;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!hasSmtpConfig()) {
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
