/**
 * Worker'ın mail adımı.
 *
 * Şablonlar ve gönderim mantığı lib/mail/notifications.ts içinde; burası
 * yalnızca worker'ın kullandığı yüzey.
 */
export { sendStockAlert, unsubscribeUrl } from "@/lib/mail/notifications";
