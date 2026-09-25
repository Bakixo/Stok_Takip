"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ColorSwatches } from "./ColorSwatches";
import { SizeChips } from "./SizeChips";
import { CityPicker } from "./CityPicker";
import { ResultPanel } from "./ResultPanel";
import { ProductImage } from "./ProductImage";
import { SizeSkeleton } from "./SizeSkeleton";
import { formatPrice } from "@/lib/tr";
import { pageVariants, transition } from "@/lib/motion";
import { buildProductUrl, type ZaraProduct, type ZaraSize } from "@/lib/zara/types";

interface Props {
  product: ZaraProduct;
  preselectedColorId?: string;
}

export function ProductView({ product, preselectedColorId }: Props) {
  const [colorId, setColorId] = useState(preselectedColorId ?? product.colors[0]!.id);
  const [sizes, setSizes] = useState<ZaraSize[] | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [skuId, setSkuId] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0]!;
  const selectedSize = sizes?.find((s) => s.skuId === skuId) ?? null;

  // Renk değişince bedenleri yeniden yükle.
  useEffect(() => {
    let cancelled = false;
    setSizes(null);
    setSizeError(null);
    setSkuId(null);

    fetch(`/api/bedenler?productId=${color.productId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Bedenler alınamadı");
        return body.sizes as ZaraSize[];
      })
      .then((loaded) => {
        if (!cancelled) setSizes(loaded);
      })
      .catch((err: Error) => {
        if (!cancelled) setSizeError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [color.productId]);

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="pb-8">
      <ProductImage src={color.imageUrl} alt={`${product.name} — ${color.name}`} />

      <header className="mt-6">
        <h1 className="text-[1.75rem] leading-tight">{product.name}</h1>
        <p className="text-fg-muted mt-2 text-[15px]">{formatPrice(product.price)}</p>
        <p className="text-fg-subtle mt-1 text-xs tracking-wide">
          {product.displayReference} / {color.id}
        </p>
      </header>

      {product.colors.length > 1 && (
        <Section label="Renk">
          <ColorSwatches
            colors={product.colors}
            selectedId={colorId}
            onSelect={setColorId}
          />
          <p className="text-fg-muted mt-3 text-sm">{color.name}</p>
        </Section>
      )}

      <Section label="Beden">
        <AnimatePresence mode="wait">
          {sizeError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition}
              className="text-fg-muted text-sm"
              role="alert"
            >
              {sizeError}
            </motion.p>
          ) : sizes ? (
            <motion.div key="sizes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>
              <SizeChips sizes={sizes} selectedSku={skuId} onSelect={setSkuId} />
            </motion.div>
          ) : (
            <SizeSkeleton key="skeleton" />
          )}
        </AnimatePresence>
      </Section>

      <AnimatePresence>
        {selectedSize && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <Section label="Şehir">
              <CityPicker value={city} onChange={setCity} />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSize && city && (
          <ResultPanel
            product={product}
            color={color}
            size={selectedSize}
            citySlug={city}
            productUrl={buildProductUrl(product, color.productId)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-fg-subtle mb-4 text-xs tracking-[0.16em] uppercase">{label}</h2>
      {children}
    </section>
  );
}
