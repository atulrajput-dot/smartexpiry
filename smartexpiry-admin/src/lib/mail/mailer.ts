import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

export type MailMessage = { to: string; subject: string; html: string; text: string };

let transporter: Transporter | null = null;
let transporterKey = "";

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = env();
  if (!SMTP_HOST) {
    throw new Error("SMTP is not configured: set SMTP_HOST, SMTP_USER and SMTP_PASS in .env.");
  }

  // Recreate the transporter if the SMTP settings in .env change.
  const key = [SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS].join("|");
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  transporterKey = key;
  return transporter;
}

/**
 * Sends an email through SMTP. Throws if SMTP isn't configured or sending
 * fails; callers show the user a friendly message and log the details.
 * Email contents (e.g. verification codes) are never written to the logs.
 */
export async function sendMail(message: MailMessage) {
  await getTransporter().sendMail({ from: env().MAIL_FROM, ...message });
}
