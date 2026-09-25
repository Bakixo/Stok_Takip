"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { transition } from "@/lib/motion";

/**
 * Ana giriş: Zara linki ya da ürün kodu.
 * Yapıştır butonu panoyu okur (tarayıcı izin verirse).
 */
export function SearchInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setValue(text.trim());
        setError(null);
      }
    } catch {
      setError("Panoya erişemedim. Elle yapıştırabilirsin.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = value.trim();
    if (!input) return;

    setError(null);
    startTransition(() => {
      // Çözümleme ürün sayfasında yapılır; girdiyi sorgu olarak taşıyoruz.
      router.push(`/urun?giris=${encodeURIComponent(input)}`);
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="border-border focus-within:border-fg flex items-stretch border transition-colors">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Zara linki veya ürün kodu"
          aria-invalid={error ? true : undefined}
          placeholder="Zara linkini veya ürün kodunu yapıştır"
          className="min-h-14 min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none
                     placeholder:text-[var(--fg-subtle)]"
        />
        <button
          type="button"
          onClick={paste}
          className="text-fg-subtle hover:text-fg shrink-0 px-4 text-xs tracking-[0.1em] uppercase
                     transition-colors"
        >
          Yapıştır
        </button>
      </div>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="text-fg-muted mt-2 text-sm"
        >
          {error}
        </motion.p>
      )}

      <p className="text-fg-subtle mt-3 text-xs">Örnek kod: 8059/577/250</p>

      <Button
        type="submit"
        size="lg"
        fullWidth
        className="mt-5"
        disabled={!value.trim() || pending}
      >
        {pending ? "Aranıyor…" : "Ürünü bul"}
      </Button>
    </form>
  );
}
