"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createWatch } from "@/app/actions/watch";
import { revealVariants, transition } from "@/lib/motion";
import type { ZaraColor, ZaraProduct, ZaraSize } from "@/lib/zara/types";

interface Props {
  product: ZaraProduct;
  color: ZaraColor;
  size: ZaraSize;
  citySlug: string;
  productUrl: string;
  /**
   * Bildirim adresi. Girişte bir kez soruluyor ve imzalı çerezte tutuluyor,
   * bu yüzden burada tekrar sorulmuyor — takibe almak tek dokunuş.
   */
  email: string;
}

export function WatchForm({ product, color, size, citySlug, productUrl, email }: Props) {
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function takibeAl() {
    setStatus("saving");
    setError(null);

    const result = await createWatch({
      productId: color.productId,
      reference: product.reference,
      productName: product.name,
      imageUrl: color.imageUrl ?? "",
      productUrl,
      price: product.price,
      colorId: color.id,
      colorName: color.name,
      size: size.name,
      skuId: size.skuId,
      city: citySlug,
      // E-posta bilerek gönderilmiyor: sunucu onu imzalı çerezten okuyor.
    });

    if (result.ok) setStatus("done");
    else {
      setError(result.error ?? "Takip kaydedilemedi.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={revealVariants}
        className="border-border mt-8 border p-6"
      >
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-[var(--color-watching)]" aria-hidden />
          <p className="text-sm tracking-[0.06em] uppercase">Takibe alındı</p>
        </div>
        <p className="text-fg-muted mt-3 text-[15px] text-balance">
          {size.name} bedeni stoğa girdiğinde{" "}
          <strong className="text-fg">{email}</strong> adresine haber vereceğim.
          On beş dakikada bir kontrol ediyorum.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="mt-8">
      <Button
        type="button"
        size="lg"
        fullWidth
        onClick={takibeAl}
        disabled={status === "saving"}
      >
        {status === "saving" ? "Kaydediliyor…" : "Takibe Al"}
      </Button>

      <p className="text-fg-subtle mt-3 text-center text-xs">
        Bildirim {email} adresine gidecek ·{" "}
        <Link href="/eposta" className="hover:text-fg underline transition-colors">
          değiştir
        </Link>
      </p>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="mt-3 text-center text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
