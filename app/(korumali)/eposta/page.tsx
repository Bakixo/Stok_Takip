import { getEmail } from "@/lib/auth";
import { EmailForm } from "./EmailForm";

export const metadata = { title: "E-posta · Stokta" };
export const dynamic = "force-dynamic";

/**
 * PIN'den sonra bir kez sorulan bildirim adresi.
 * Kayıtlıysa bu sayfa adresi değiştirmek için de kullanılır.
 */
export default async function EmailPage() {
  const mevcut = await getEmail();
  return <EmailForm mevcut={mevcut} />;
}
