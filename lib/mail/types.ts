/**
 * Mail gönderiminin sağlayıcıdan bağımsız arayüzü.
 *
 * Bugün Gmail SMTP (Nodemailer) kullanılıyor. Resend'e geçmek için yalnızca
 * `providers/` altına yeni bir dosya ekleyip `send.ts` içindeki seçimi
 * değiştirmek yeterli — çağıran kod hiç değişmez.
 */

export interface MailMessage {
  to: string;
  subject: string;
  /** HTML gövde. */
  html: string;
  /** Düz metin karşılığı — spam puanını düşürür, metin okuyucular için gerekir. */
  text: string;
  /** Tek tıkla takibi durdurmak için; List-Unsubscribe header'ına konur. */
  unsubscribeUrl?: string;
}

export interface MailResult {
  ok: boolean;
  /** Sağlayıcının verdiği kimlik (varsa). */
  id?: string;
  error?: string;
}

export interface MailProvider {
  readonly name: string;
  send(message: MailMessage): Promise<MailResult>;
}
