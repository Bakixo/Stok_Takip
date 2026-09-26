/**
 * Basit PIN erişimi.
 *
 * Ağır bir üyelik sistemi yok: tek bir PIN, imzalı bir çerezle cihazda
 * hatırlanır. Çerez HMAC ile imzalandığı için istemci tarafında üretilemez.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE_NAME = "stokta_oturum";
/** Bildirimlerin gideceği adres — PIN'den sonra bir kez sorulur. */
const EMAIL_COOKIE = "stokta_eposta";
/** Bir yıl — arkadaşın her seferinde PIN girmesin. */
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

function sign(payload: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(payload).digest("base64url");
}

/** Zamanlama saldırılarına karşı sabit süreli karşılaştırma. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Girilen PIN doğru mu? */
export function verifyPin(pin: string): boolean {
  return safeEqual(pin.trim(), env().ACCESS_PIN);
}

/** Çerez değeri: "<sürüm>.<imza>" — PIN değişirse eski çerezler geçersizleşir. */
function tokenValue(): string {
  // PIN'in kendisi çereze yazılmaz; yalnızca ondan türeyen bir imza.
  const version = sign(`pin:${env().ACCESS_PIN}`).slice(0, 16);
  return `${version}.${sign(version)}`;
}

export async function createSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, tokenValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Geçerli bir oturum çerezi var mı? */
export async function hasSession(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const [version, signature] = raw.split(".");
  if (!version || !signature) return false;
  if (!safeEqual(signature, sign(version))) return false;

  // PIN değiştiyse eski oturumlar düşsün.
  return safeEqual(version, sign(`pin:${env().ACCESS_PIN}`).slice(0, 16));
}

// ---------------------------------------------------------------------------
// Bildirim adresi
//
// PIN girildikten hemen sonra bir kez sorulur ve imzalı bir çerezte saklanır.
// Böylece kullanıcı her takipte e-postasını yeniden yazmıyor; adresi bilmeyen
// biri de başkasının adresine bildirim kuramıyor (çerez imzalı).
// ---------------------------------------------------------------------------

/** Basit ama yeterli e-posta kontrolü. */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(v);
}

export async function saveEmail(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  const store = await cookies();
  store.set(EMAIL_COOKIE, `${clean}.${sign(clean)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

/** Kayıtlı bildirim adresi; yoksa null. */
export async function getEmail(): Promise<string | null> {
  const raw = (await cookies()).get(EMAIL_COOKIE)?.value;
  if (!raw) return null;

  // Adres "@" içerebildiği için son noktadan ayırıyoruz.
  const sep = raw.lastIndexOf(".");
  if (sep <= 0) return null;

  const value = raw.slice(0, sep);
  const signature = raw.slice(sep + 1);
  if (!safeEqual(signature, sign(value))) return null;
  return isValidEmail(value) ? value : null;
}

export { COOKIE_NAME, EMAIL_COOKIE };
