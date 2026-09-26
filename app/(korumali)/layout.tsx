import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

/**
 * PIN gerektiren sayfaların ortak düzeni.
 *
 * İki kapı var: önce PIN (burada), sonra bildirim adresi. Adres kontrolü
 * sayfa bazında `requireEmail()` ile yapılıyor — adres sayfasının kendisi
 * o kontrolün dışında kalmalı, yoksa sonsuz yönlendirme olur.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect("/giris");
  return <AppShell>{children}</AppShell>;
}
