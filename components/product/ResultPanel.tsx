"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { StoreList } from "./StoreList";
import { WatchForm } from "./WatchForm";
import { revealVariants, transition } from "@/lib/motion";
import { locativeAdj } from "@/lib/tr";
import { findCity } from "@/lib/zara/cities";
import { isPurchasable, AVAILABILITY_LABEL, type ZaraColor, type ZaraProduct, type ZaraSize, type ZaraStore } from "@/lib/zara/types";

interface Props {
  product: ZaraProduct;
  color: ZaraColor;
  size: ZaraSize;
  citySlug: string;
  productUrl: string;
  /** Bildirim adresi — girişte bir kez sorulup çerezde tutuluyor. */
  email: string;
}

export function ResultPanel({ product, color, size, citySlug, productUrl, email }: Props) {
  const city = findCity(citySlug);
  const available = isPurchasable(size.availability);
  const [stores, setStores] = useState<ZaraStore[] | null>(null);

  // Şehirde mağaza varsa listeyi getir (stok bilgisi içermez, yalnızca konum).
  useEffect(() => {
    if (!city?.hasStore) {
      setStores([]);
      return;
    }
    let cancelled = false;
    setStores(null);
    fetch(`/api/magazalar?sehir=${citySlug}`)
      .then((r) => (r.ok ? r.json() : { stores: [] }))
      .then((body) => {
        if (!cancelled) setStores(body.stores ?? []);
      })
      .catch(() => {
        if (!cancelled) setStores([]);
      });
    return () => {
      cancelled = true;
    };
  }, [citySlug, city?.hasStore]);

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={revealVariants}
      className="border-border mt-12 border-t pt-8"
    >
      {available ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.1 }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="size-2 rounded-full bg-[var(--color-stock)]"
                aria-hidden
              />
              <p className="text-sm tracking-[0.06em] uppercase">
                {size.availability === "low_on_stock" ? "Son birkaç adet" : "Stokta"}
              </p>
            </div>

            <h2 className="mt-4 text-3xl leading-tight text-balance">
              {size.name} bedeni online satışta.
            </h2>
            <p className="text-fg-muted mt-3 text-[15px] text-balance">
              Ürün sayfası doğru renkle açılır; bedeni seçip sepete eklemen yeterli.
            </p>
          </motion.div>

          <LinkButton
            href={productUrl}
            target="_blank"
            rel="noreferrer"
            size="lg"
            fullWidth
            className="mt-8"
          >
            Ürüne Git
          </LinkButton>

          <p className="text-fg-subtle mt-3 text-center text-xs">
            Stoklar hızlı tükenebilir.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <span className="bg-fg-subtle size-2 rounded-full" aria-hidden />
            <p className="text-fg-muted text-sm tracking-[0.06em] uppercase">
              {AVAILABILITY_LABEL[size.availability]}
            </p>
          </div>

          <h2 className="mt-4 text-3xl leading-tight text-balance">
            {size.name} bedeni şu an yok.
          </h2>
          <p className="text-fg-muted mt-3 text-[15px] text-balance">
            Takibe alayım; stoğa girdiği anda sana e-posta göndereyim.
          </p>

          <WatchForm
            product={product}
            color={color}
            size={size}
            citySlug={citySlug}
            productUrl={productUrl}
            email={email}
          />
        </>
      )}

      {stores === null && city?.hasStore && (
        <section className="mt-12" aria-busy="true">
          <p className="text-fg-subtle text-xs tracking-[0.16em] uppercase">
            {locativeAdj(city.name)} mağazalar
          </p>
          <div className="border-border mt-5 space-y-3 border-t pt-4">
            {Array.from({ length: Math.min(city.storeCount, 4) }).map((_, i) => (
              <div key={i} className="shimmer h-5" style={{ width: `${70 - i * 8}%` }} />
            ))}
          </div>
        </section>
      )}

      {stores && stores.length > 0 && (
        <StoreList stores={stores} cityName={city?.name ?? citySlug} />
      )}

      {stores !== null && stores.length === 0 && city && !city.hasStore && (
        <p className="text-fg-subtle mt-10 text-sm text-balance">
          {city.name}&apos;de Zara mağazası yok — takip online stok üzerinden çalışır.
        </p>
      )}
    </motion.section>
  );
}
