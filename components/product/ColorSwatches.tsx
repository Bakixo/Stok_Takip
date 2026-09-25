"use client";

import { motion } from "framer-motion";
import { quick } from "@/lib/motion";
import type { ZaraColor } from "@/lib/zara/types";

/**
 * Renk seçimi.
 *
 * Zara çoğu renk için hex kodu veriyor; onu düz daire olarak gösteriyoruz.
 * Hex yoksa (desenli/çok renkli ürünler) o renge ait ürün görselinin küçük
 * hâline düşüyoruz.
 */
export function ColorSwatches({
  colors,
  selectedId,
  onSelect,
}: {
  colors: ZaraColor[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Renk" className="flex flex-wrap gap-3">
      {colors.map((c) => {
        const active = c.id === selectedId;
        return (
          <motion.button
            key={c.id}
            role="radio"
            aria-checked={active}
            aria-label={c.name}
            onClick={() => onSelect(c.id)}
            whileTap={{ scale: 0.94 }}
            transition={quick}
            // Dokunma hedefi 44px; görsel daire 40px.
            className="relative grid size-11 place-items-center"
          >
            <span
              className={`bg-bg-sunken block size-10 overflow-hidden rounded-full ring-1 transition-all ${
                active ? "ring-fg ring-offset-bg ring-2 ring-offset-2" : "ring-border"
              }`}
              style={c.hexCode ? { backgroundColor: c.hexCode } : undefined}
            >
              {!c.hexCode && c.imageUrl && (
                <img src={c.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
