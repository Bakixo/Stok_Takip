/**
 * Uygulamanın tek mail gönderme kapısı.
 *
 * Sağlayıcı değişikliği burada tek satır: `activeProvider` başka bir
 * MailProvider'a işaret etmesi yeterli.
 */
import { smtpProvider } from "./providers/smtp";
import type { MailMessage, MailProvider, MailResult } from "./types";

const activeProvider: MailProvider = smtpProvider;

/** Geliştirmede maili gerçekten göndermek yerine konsola yazdırmak için. */
const DRY_RUN = process.env.MAIL_DRY_RUN === "true";

export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (DRY_RUN) {
    console.log(
      `[mail:dry-run] → ${message.to}\n  konu: ${message.subject}\n  ${message.text.slice(0, 200).replace(/\n/g, "\n  ")}`,
    );
    return { ok: true, id: "dry-run" };
  }

  const result = await activeProvider.send(message);
  if (!result.ok) {
    console.error(`[mail] gönderilemedi (${activeProvider.name}) → ${message.to}: ${result.error}`);
  }
  return result;
}

export type { MailMessage, MailResult, MailProvider };
