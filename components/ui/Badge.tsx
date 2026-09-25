"use client";

import { motion } from "framer-motion";
import { quick } from "@/lib/motion";
import type { WatchStatus } from "@/lib/watch-status";

const tones: Record<WatchStatus, { dot: string; text: string; label: string }> = {
  ACTIVE: { dot: "bg-[var(--color-watching)]", text: "text-fg", label: "Takipte" },
  FOUND: { dot: "bg-[var(--color-stock)]", text: "text-fg", label: "Bulundu" },
  CANCELLED: { dot: "bg-[var(--color-gone)]", text: "text-fg-subtle", label: "Durduruldu" },
};

/** Durum rozeti — renk geçişi yumuşak olsun diye animasyonlu. */
export function StatusBadge({ status }: { status: WatchStatus }) {
  const tone = tones[status];
  return (
    <motion.span
      layout
      transition={quick}
      className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] tracking-[0.1em] whitespace-nowrap uppercase ${tone.text}`}
    >
      <motion.span
        layout
        transition={quick}
        className={`size-1.5 rounded-full ${tone.dot}`}
        aria-hidden
      />
      {tone.label}
    </motion.span>
  );
}
