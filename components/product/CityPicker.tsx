"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { quick } from "@/lib/motion";
import { CITIES, normalizeTr, type City } from "@/lib/zara/cities";

/**
 * Aranabilir şehir listesi. Zara mağazası olan iller üstte;
 * mağazası olmayanlar da seçilebilir (online stok takibi her yerde çalışır).
 */
export function CityPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");

  const { withStores, others } = useMemo(() => {
    const q = normalizeTr(query);
    const match = (c: City) => !q || normalizeTr(c.name).includes(q);
    const sorted = [...CITIES].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return {
      withStores: sorted.filter((c) => c.hasStore && match(c)),
      others: sorted.filter((c) => !c.hasStore && match(c)),
    };
  }, [query]);

  const empty = withStores.length === 0 && others.length === 0;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        autoComplete="off"
        aria-label="Şehir ara"
        placeholder="Şehir ara"
        className="border-border focus:border-fg min-h-12 w-full border bg-transparent px-4
                   text-[15px] outline-none transition-colors placeholder:text-[var(--fg-subtle)]"
      />

      <div className="mt-4 max-h-64 overflow-y-auto overscroll-contain">
        {withStores.length > 0 && (
          <Group label="Zara mağazası olan iller">
            {withStores.map((c) => (
              <CityChip key={c.slug} city={c} active={c.slug === value} onSelect={onChange} />
            ))}
          </Group>
        )}

        {others.length > 0 && (
          <Group label="Diğer iller">
            {others.map((c) => (
              <CityChip key={c.slug} city={c} active={c.slug === value} onSelect={onChange} />
            ))}
          </Group>
        )}

        {empty && <p className="text-fg-muted py-4 text-sm">Böyle bir il bulamadım.</p>}
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-fg-subtle mb-2 text-[11px] tracking-[0.12em] uppercase">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function CityChip({
  city,
  active,
  onSelect,
}: {
  city: City;
  active: boolean;
  onSelect: (slug: string) => void;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(city.slug)}
      whileTap={{ scale: 0.96 }}
      transition={quick}
      className={`min-h-11 border px-3.5 text-sm transition-colors ${
        active ? "border-fg bg-fg text-bg" : "border-border hover:border-fg-muted"
      }`}
    >
      {city.name}
      {city.hasStore && (
        <span className={`ml-1.5 text-xs ${active ? "text-bg/60" : "text-fg-subtle"}`}>
          {city.storeCount}
        </span>
      )}
    </motion.button>
  );
}
