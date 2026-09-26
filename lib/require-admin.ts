import { notFound } from "next/navigation";
import { getEmail } from "./auth";
import { env } from "./env";

/**
 * /admin yalnızca uygulamayı kuran kişiye açık.
 *
 * PIN herkeste ortak olduğu için tek başına yetmiyor: admin sayfası
 * bütün kullanıcıların takiplerini ve ürün adlarını gösteriyor.
 * Ayırt edici olarak kayıtlı bildirim adresi ADMIN_EMAIL'e eşit mi,
 * ona bakıyoruz.
 *
 * Yetkisizde 404 dönüyoruz (403 değil): sayfanın varlığını da ele vermesin.
 */
export async function requireAdmin(): Promise<string> {
  const email = await getEmail();
  const admin = env().ADMIN_EMAIL.trim().toLowerCase();

  if (!email || email.trim().toLowerCase() !== admin) notFound();
  return email;
}
