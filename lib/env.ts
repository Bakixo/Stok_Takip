/**
 * Ortam değişkenleri — tek yerden, doğrulanmış olarak okunur.
 * Eksik bir değişken varsa uygulama sessizce yanlış çalışmak yerine açıkça hata verir.
 */
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // --- Veritabanı ---
  DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).default("sqlite"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL gerekli"),

  // --- Erişim ---
  /**
   * Uygulamaya girerken kullanılan PIN.
   * En az 6 hane: 4 hane yalnızca 10.000 olasılık demek ve kaba kuvvetle
   * denenebilir; 6 hane bunu bir milyona çıkarıyor.
   */
  ACCESS_PIN: z.string().min(6, "ACCESS_PIN en az 6 haneli olmalı"),
  /** Oturum çerezini imzalamak için rastgele uzun bir dize. */
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET en az 16 karakter olmalı"),

  // --- E-posta ---
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().email("SMTP_USER geçerli bir e-posta olmalı"),
  /** Gmail uygulama şifresi (normal hesap şifresi değil). */
  SMTP_PASS: z.string().min(1, "SMTP_PASS gerekli"),
  MAIL_FROM_NAME: z.string().default("Stokta"),
  MAIL_REPLY_TO: z.string().email().optional(),
  /** Hata uyarılarının gideceği adres (senin adresin). */
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL gerekli"),

  // --- Uygulama ---
  /** Maillerdeki linkler için tam adres, ör. https://stokta.up.railway.app */
  APP_URL: z.string().url("APP_URL tam bir adres olmalı (https:// ile)"),

  // --- Worker ---
  /** Kontrol sıklığı (cron ifadesi). Varsayılan: her 15 dakikada bir. */
  CRON_SCHEDULE: z.string().default("*/15 * * * *"),
  /** Worker bu süreçte de çalışsın mı? Tek servis dağıtımında true. */
  RUN_WORKER: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Doğrulanmış ortam değişkenlerini döndürür.
 * İlk çağrıda doğrular; sonraki çağrılarda önbellekten verir.
 */
export function env(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Ortam değişkenleri eksik ya da hatalı:\n${issues}\n\n` +
        `.env.example dosyasını .env olarak kopyalayıp doldur.`,
    );
  }

  cached = parsed.data;
  return cached;
}
