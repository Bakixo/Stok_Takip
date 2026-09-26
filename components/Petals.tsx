"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/**
 * Uygulama açılışında bir kez düşen çiçek animasyonu.
 *
 * Tasarım notları:
 *  - Oturumda tek sefer. Her gezinmede tekrarlarsa süs olmaktan çıkıp
 *    engel olur; sessionStorage ile bir kereye indiriliyor.
 *  - Gerçek çiçek formu (beş yapraklı, ortası sarı) ve canlı renkler.
 *  - Tıklamayı engellemez (pointer-events: none), ekran okuyucuya görünmez.
 *  - "Hareketi azalt" açıksa hiç çalışmaz.
 */

const ANAHTAR = "stokta:cicekler";
/** Şenlikli ama kalabalık olmayan bir sayı. */
const ADET = 22;

/** Canlı ama birbiriyle uyumlu bir palet. */
const RENKLER = [
  { yaprak: "#f2789f", goz: "#ffd166" }, // pembe
  { yaprak: "#f6a5c0", goz: "#ffe08a" }, // açık pembe
  { yaprak: "#b892d8", goz: "#ffd166" }, // lila
  { yaprak: "#ff9f68", goz: "#ffe08a" }, // şeftali
  { yaprak: "#8ecae6", goz: "#ffd166" }, // açık mavi
  { yaprak: "#fdfcf8", goz: "#f2b705" }, // krem
  { yaprak: "#ef476f", goz: "#ffd166" }, // mercan
];

interface Cicek {
  id: number;
  sol: number;
  gecikme: number;
  sure: number;
  boyut: number;
  donus: number;
  savrulma: number;
  renk: (typeof RENKLER)[number];
  opaklik: number;
}

function uret(): Cicek[] {
  return Array.from({ length: ADET }, (_, i) => ({
    id: i,
    sol: Math.random() * 100,
    gecikme: Math.random() * 2.5,
    sure: 6 + Math.random() * 4.5,
    boyut: 16 + Math.random() * 16,
    donus: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 540),
    savrulma: (Math.random() - 0.5) * 140,
    renk: RENKLER[i % RENKLER.length]!,
    opaklik: 0.75 + Math.random() * 0.25,
  }));
}

/** Beş yapraklı sade çiçek. */
function CicekSvg({ yaprak, goz }: { yaprak: string; goz: string }) {
  // Beş yaprak, 72 derece aralıkla.
  const acilar = [0, 72, 144, 216, 288];
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden focusable="false">
      <g transform="translate(20 20)">
        {acilar.map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-11"
            rx="6.5"
            ry="9"
            fill={yaprak}
            transform={`rotate(${a})`}
          />
        ))}
        <circle cx="0" cy="0" r="4.5" fill={goz} />
      </g>
    </svg>
  );
}

export function Petals() {
  const azalt = useReducedMotion();
  const [goster, setGoster] = useState(false);
  const cicekler = useMemo(uret, []);

  useEffect(() => {
    if (azalt) return;
    try {
      if (sessionStorage.getItem(ANAHTAR)) return;
      sessionStorage.setItem(ANAHTAR, "1");
    } catch {
      // Gizli sekmede depolama kapalı olabilir; animasyon yine de oynasın.
    }
    setGoster(true);
    const t = setTimeout(() => setGoster(false), 13_500);
    return () => clearTimeout(t);
  }, [azalt]);

  if (azalt) return null;

  return (
    <AnimatePresence>
      {goster && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
          {cicekler.map((c) => (
            <motion.span
              key={c.id}
              initial={{ y: "-14vh", x: 0, rotate: 0, opacity: 0 }}
              animate={{
                y: "114vh",
                x: c.savrulma,
                rotate: c.donus,
                opacity: [0, c.opaklik, c.opaklik, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: c.sure,
                delay: c.gecikme,
                ease: "linear",
                opacity: { times: [0, 0.1, 0.8, 1], duration: c.sure, delay: c.gecikme },
              }}
              style={{
                position: "absolute",
                left: `${c.sol}%`,
                width: c.boyut,
                height: c.boyut,
                willChange: "transform, opacity",
              }}
            >
              <CicekSvg yaprak={c.renk.yaprak} goz={c.renk.goz} />
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
