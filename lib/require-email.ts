import { redirect } from "next/navigation";
import { getEmail } from "./auth";

/**
 * Bildirim adresi kayıtlı değilse kullanıcıyı adres sayfasına gönderir.
 *
 * Düzende (layout) değil sayfa bazında çağrılıyor: /eposta sayfasının
 * kendisi bu kontrolün dışında kalmalı, aksi hâlde sonsuz yönlendirme olur.
 */
export async function requireEmail(): Promise<string> {
  const email = await getEmail();
  if (!email) redirect("/eposta");
  return email;
}
