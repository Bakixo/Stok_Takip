"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { quick } from "@/lib/motion";

const NAV = [
  { href: "/", label: "Ara" },
  { href: "/takiplerim", label: "Takiplerim" },
] as const;

/**
 * Mobil öncelikli kabuk: üstte ince başlık, altta başparmakla erişilebilir
 * gezinme. İçerik alanı güvenli alanları (çentik / ev çubuğu) hesaba katar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border bg-bg/85 sticky top-0 z-20 border-b backdrop-blur-md">
        <div
          className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <Link href="/" className="font-[family-name:var(--font-display)] text-xl">
            Stokta
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6 pb-28">{children}</main>

      <nav
        aria-label="Ana gezinme"
        className="border-border bg-bg/90 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-2xl">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-14 flex-1 items-center justify-center text-[13px]
                           tracking-[0.08em] uppercase"
              >
                <span className={active ? "text-fg" : "text-fg-subtle"}>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={quick}
                    className="bg-fg absolute inset-x-6 top-0 h-px"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
