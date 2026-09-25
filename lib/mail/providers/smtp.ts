/**
 * Gmail SMTP sağlayıcısı (Nodemailer).
 *
 * Gmail için normal hesap şifresi değil, "uygulama şifresi" gerekir —
 * kurulum adımları README'de.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import type { MailMessage, MailProvider, MailResult } from "../types";

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const e = env();
  transporter = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_SECURE,
    auth: { user: e.SMTP_USER, pass: e.SMTP_PASS },
    // Gmail bağlantıyı bir süre açık tutmayı sever; tur başına tek bağlantı yeter.
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
  });
  return transporter;
}

export const smtpProvider: MailProvider = {
  name: "gmail-smtp",

  async send(message: MailMessage): Promise<MailResult> {
    const e = env();
    try {
      const info = await getTransporter().sendMail({
        from: { name: e.MAIL_FROM_NAME, address: e.SMTP_USER },
        replyTo: e.MAIL_REPLY_TO ?? e.SMTP_USER,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.unsubscribeUrl
          ? {
              // Tek tıkla abonelikten çıkma — Gmail/Outlook bunu arayüzde gösterir.
              "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            }
          : undefined,
      });
      return { ok: true, id: info.messageId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
