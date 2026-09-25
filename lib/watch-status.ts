/**
 * Takip durumları.
 *
 * Prisma enum'u yerine String kullanıyoruz çünkü SQLite (geliştirme ortamı)
 * enum desteklemiyor. Tip güvenliği bu dosyadan geliyor.
 */

export const WATCH_STATUS = {
  /** İzleniyor. */
  ACTIVE: "ACTIVE",
  /** Stok bulundu, mail gitti. */
  FOUND: "FOUND",
  /** Kullanıcı iptal etti. */
  CANCELLED: "CANCELLED",
} as const;

export type WatchStatus = (typeof WATCH_STATUS)[keyof typeof WATCH_STATUS];

export const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
  ACTIVE: "Takipte",
  FOUND: "Bulundu",
  CANCELLED: "İptal edildi",
};

export function isWatchStatus(v: string): v is WatchStatus {
  return v in WATCH_STATUS;
}
