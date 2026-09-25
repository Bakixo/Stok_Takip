"use client";

import { motion } from "framer-motion";
import { quick } from "@/lib/motion";
import { AVAILABILITY_LABEL, isPurchasable, type ZaraSize } from "@/lib/zara/types";

/**
 * Beden seçimi. Tükenmiş bedenler de seçilebilir — asıl amaç zaten
 * onları takibe almak.
 */
export function SizeChips({
  sizes,
  selectedSku,
  onSelect,
}: {
  sizes: ZaraSize[];
  selectedSku: string | null;
  onSelect: (sku: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Beden" className="flex flex-wrap gap-2">
      {sizes.map((s) => {
        const active = s.skuId === selectedSku;
        const available = isPurchasable(s.availability);
        return (
          <motion.button
            key={s.skuId}
            role="radio"
            aria-checked={active}
            aria-label={`${s.name} — ${AVAILABILITY_LABEL[s.availability]}`}
            onClick={() => onSelect(s.skuId)}
            whileTap={{ scale: 0.96 }}
            transition={quick}
            className={`relative min-h-12 min-w-14 border px-4 text-sm transition-colors ${
              active
                ? "border-fg bg-fg text-bg"
                : "border-border hover:border-fg-muted text-fg"
            }`}
          >
            <span className={available ? "" : "opacity-45"}>{s.name}</span>

            {/* Tükenmişi çapraz çizgiyle göster; renk körlüğünde de okunur. */}
            {!available && (
              <span
                aria-hidden
                className={`absolute inset-x-3 top-1/2 h-px -rotate-12 ${
                  active ? "bg-bg/70" : "bg-fg-subtle"
                }`}
              />
            )}

            {s.availability === "low_on_stock" && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full
                           bg-[var(--color-watching)]"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
