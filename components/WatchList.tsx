"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";
import { staggerContainer, staggerItem, transition } from "@/lib/motion";
import { formatPrice, timeAgo } from "@/lib/tr";
import type { WatchCard } from "@/lib/watch-card";

interface Props {
  watches: WatchCard[];
  /** Verilirse kartlar kaydırılarak silinebilir. */
  onCancel?: (id: string) => Promise<void>;
}

export function WatchList({ watches, onCancel }: Props) {
  const [items, setItems] = useState(watches);

  async function cancel(id: string) {
    if (!onCancel) return;
    // İyimser çıkarma: sunucu hata verirse geri koy.
    const previous = items;
    setItems((list) => list.filter((w) => w.id !== id));
    try {
      await onCancel(id);
    } catch {
      setItems(previous);
    }
  }

  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="border-border divide-border divide-y border-t"
    >
      <AnimatePresence initial={false}>
        {items.map((w) => (
          <WatchRow key={w.id} watch={w} onCancel={onCancel ? () => cancel(w.id) : undefined} />
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

function WatchRow({ watch, onCancel }: { watch: WatchCard; onCancel?: () => void }) {
  const checked = watch.lastCheckedAt ? new Date(watch.lastCheckedAt) : null;

  return (
    <motion.li
      layout
      variants={staggerItem}
      exit={{ opacity: 0, height: 0, marginTop: 0, transition }}
      // Kaydırarak silme: sola çekip bırakınca iptal edilir.
      drag={onCancel ? "x" : false}
      dragConstraints={{ left: -120, right: 0 }}
      dragElastic={0.15}
      onDragEnd={(_, info) => {
        if (onCancel && info.offset.x < -90) onCancel();
      }}
      className="bg-bg relative overflow-hidden"
    >
      <a href={watch.productUrl} target="_blank" rel="noreferrer" className="flex gap-4 py-4">
        <img
          src={watch.imageUrl}
          alt=""
          loading="lazy"
          // Görsel yüklenemezse (eski kayıt, silinmiş ürün) boş kutu kalsın,
          // kırık görsel simgesi değil.
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
          className="bg-bg-sunken h-24 w-[4.5rem] shrink-0 object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-medium">{watch.productName}</p>
            <StatusBadge status={watch.status} />
          </div>

          <p className="text-fg-muted mt-1 text-sm">
            {watch.colorName} · Beden {watch.size}
          </p>
          <p className="text-fg-subtle mt-0.5 text-sm">{formatPrice(watch.price)}</p>

          <p className="text-fg-subtle mt-2 text-xs">
            {watch.status === "FOUND" && watch.foundAt
              ? `${timeAgo(new Date(watch.foundAt))} bulundu`
              : checked
                ? `${timeAgo(checked)} kontrol edildi`
                : "Henüz kontrol edilmedi"}
            {" · "}
            {watch.cityName}
          </p>
        </div>
      </a>
    </motion.li>
  );
}
