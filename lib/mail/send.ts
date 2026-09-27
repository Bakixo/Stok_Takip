/**
 * Uygulamanın tek mail gönderme kapısı.
 *
 * Sağlayıcı değişikliği burada tek satır: `activeProvider` başka bir
 * MailProvider'a işaret etmesi yeterli.
 *
 * Her deneme veritabanına yazılır (MailLog). Mailin gidip gitmediği
 * tahmin edilmez, kayda bakılır.
 */
import { prisma } from "@/lib/db";
import { smtpProvider } from "./providers/smtp";
import type { MailMessage, MailProvider, MailResult } from "./types";

const activeProvider: MailProvider = smtpProvider;

/** Geliştirmede maili gerçekten göndermek yerine konsola yazdırmak için. */
const DRY_RUN = process.env.MAIL_DRY_RUN === "true";

/** Mail türü — kayıtta hangi mail olduğunu ayırt etmek için. */
export type MailKind =
  | "stock_alert"
  | "watch_confirmed"
  | "welcome"
  | "renewal"
  | "admin_alert";

export interface SendOptions {
  kind: MailKind;
  watchId?: string;
}

/**
 * Gönderim sonucu.
 *
 * `dryRun` ayrı tutuluyor çünkü "kuru mod"da mail GİTMEZ. Çağıran kod
 * bunu başarı sayarsa (ör. takibi "bulundu" işaretlerse) kullanıcı hiç
 * haber almadan takip kapanır — sessiz kayıp. Bu yüzden ayrı alan.
 */
export interface SendOutcome extends MailResult {
  dryRun: boolean;
}

export async function sendMail(
  message: MailMessage,
  options: SendOptions,
): Promise<SendOutcome> {
  let sonuc: SendOutcome;

  if (DRY_RUN) {
    console.log(
      `[mail:dry-run] → ${message.to}\n  konu: ${message.subject}\n  ${message.text
        .slice(0, 200)
        .replace(/\n/g, "\n  ")}`,
    );
    sonuc = { ok: true, id: "dry-run", dryRun: true };
  } else {
    const r = await activeProvider.send(message);
    sonuc = { ...r, dryRun: false };
    if (!r.ok) {
      console.error(
        `[mail] gönderilemedi (${activeProvider.name}) → ${message.to}: ${r.error}`,
      );
    }
  }

  // Kayıt tutmak gönderimi bloklamasın: mail gittiyse gitmiştir.
  try {
    await prisma.mailLog.create({
      data: {
        to: message.to,
        subject: message.subject,
        kind: options.kind,
        status: sonuc.dryRun ? "dry_run" : sonuc.ok ? "sent" : "failed",
        messageId: sonuc.id ?? null,
        error: sonuc.error?.slice(0, 500) ?? null,
        watchId: options.watchId ?? null,
      },
    });
  } catch (err) {
    console.error("[mail] kayıt yazılamadı:", err);
  }

  return sonuc;
}

export type { MailMessage, MailResult, MailProvider };
