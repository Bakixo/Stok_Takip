"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createWatch } from "@/app/actions/watch";
import { revealVariants, transition } from "@/lib/motion";
import type { ZaraColor, ZaraProduct, ZaraSize } from "@/lib/zara/types";

/** E-posta ilk seferde sorulur, sonra bu cihazda hatırlanır. */
const EMAIL_KEY = "stokta:email";

interface Props {
  product: ZaraProduct;
  color: ZaraColor;
  size: ZaraSize;
  citySlug: string;
  productUrl: string;
}

export function WatchForm({ product, color, size, citySlug, productUrl }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      // Gizli sekmede depolama kapalı olabilir; sorun değil.
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      email: email.trim(),
    });

    if (result.ok) {
      try {
        localStorage.setItem(EMAIL_KEY, email.trim());
      } catch {
        // Depolama yoksa yalnızca hatırlama özelliği kaybolur.
      }
      setStatus("done");
    } else {
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
          {size.name} bedeni stoğa girdiğinde <strong className="text-fg">{email}</strong>{" "}
          adresine haber vereceğim. 15 dakikada bir kontrol ediyorum.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label
          htmlFor="email"
          className="text-fg-subtle mb-2 block text-xs tracking-[0.16em] uppercase"
        >
          E-posta
        </label>
        <input
          id="email"
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          placeholder="ornek@eposta.com"
          className="border-border focus:border-fg min-h-14 w-full border bg-transparent px-4
                     text-[15px] outline-none transition-colors
                     placeholder:text-[var(--fg-subtle)]"
        />
      </div>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}

      <Button type="submit" size="lg" fullWidth disabled={status === "saving" || !email.trim()}>
        {status === "saving" ? "Kaydediliyor…" : "Takibe Al"}
      </Button>
    </form>
  );
}
