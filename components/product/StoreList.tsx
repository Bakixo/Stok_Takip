"use client";

import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { locativeAdj } from "@/lib/tr";
import type { ZaraStore } from "@/lib/zara/types";

/**
 * Şehirdeki Zara mağazaları.
 *
 * Zara'nın mağaza bazlı stok sorgusu dışarıya kapalı olduğu için burada
 * stok durumu gösterilmez; bu yüzden not açıkça yazılıyor — kullanıcı
 * "burada var" sanmasın.
 */
export function StoreList({ stores, cityName }: { stores: ZaraStore[]; cityName: string }) {
  return (
    <section className="mt-12">
      <h3 className="text-fg-subtle text-xs tracking-[0.16em] uppercase">
        {locativeAdj(cityName)} mağazalar
      </h3>
      <p className="text-fg-subtle mt-2 text-xs text-balance">
        Mağaza stoğu Zara tarafından dışarıya verilmiyor; bu liste yalnızca
        nereye bakacağını göstermek için.
      </p>

      <motion.ul
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="border-border divide-border mt-5 divide-y border-t"
      >
        {stores.map((s) => (
          <motion.li key={s.id} variants={staggerItem}>
            <a
              href={s.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{s.label}</p>
                {s.sections.length > 0 && (
                  <p className="text-fg-subtle mt-0.5 text-xs">
                    {s.sections.map(sectionLabel).join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-fg-subtle shrink-0 text-xs tracking-[0.1em] uppercase">
                Harita
              </span>
            </a>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

const SECTIONS: Record<string, string> = {
  Woman: "Kadın",
  Man: "Erkek",
  Kids: "Çocuk",
  Home: "Home",
  Beauty: "Beauty",
};

function sectionLabel(s: string): string {
  return SECTIONS[s] ?? s;
}
