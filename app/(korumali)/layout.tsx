import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

/**
 * PIN gerektiren sayfaların ortak düzeni.
 * Oturum yoksa giriş sayfasına yönlendirir.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  if (!(await hasSession())) redirect("/giris");
  return <AppShell>{children}</AppShell>;
}
