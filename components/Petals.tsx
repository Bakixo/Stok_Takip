"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/**
 * Uygulama açılışında bir kez düşen yaprak animasyonu.
 *
 * Tasarım notları:
 *  - Oturumda tek sefer. Her gezinmede tekrarlarsa süs olmaktan çıkıp
 *    engel olur; sessionStorage ile bir kereye indiriliyor.
 *  - Sakin ve az sayıda: 14 yaprak, düşük opaklık, yavaş düşüş. Uygulamanın
 *    siyah-beyaz editoryal diline karışmasın diye pudra/krem tonları.
 *  - Tıklamayı engellemez (pointer-events: none) ve ekran okuyucuya görünmez.
 *  - "Hareketi azalt" açıksa hiç çalışmaz.
 */

const ANAHTAR = "stokta:yapraklar";
/** Yaprak sayısı: az olsun ki şirin değil zarif dursun. */
const ADET = 14;

interface Yaprak {
  id: number;
  sol: number;
  gecikme: number;
  sure: number;
  boyut: number;
  donus: number;
  savrulma: number;
  renk: string;
  opaklik: number;
}

/** Pudra, krem ve soluk gül tonları — vurgu renkleriyle yarışmayacak kadar soft. */
const RENKLER = ["#f2d9d5", "#e8cfc6", "#f6e6de", "#e6cdd4", "#efdcd0"];

function uret(): Yaprak[] {
  return Array.from({ length: ADET }, (_, i) => ({
    id: i,
    sol: Math.random() * 100,
    gecikme: Math.random() * 2.2,
    sure: 6 + Math.random() * 4,
    boyut: 10 + Math.random() * 12,
    donus: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    savrulma: (Math.random() - 0.5) * 120,
    renk: RENKLER[i % RENKLER.length]!,
    opaklik: 0.35 + Math.random() * 0.35,
  }));
}

export function Petals() {
  const azalt = useReducedMotion();
  const [goster, setGoster] = useState(false);
  const yapraklar = useMemo(uret, []);

  useEffect(() => {
    if (azalt) return;
    try {
      if (sessionStorage.getItem(ANAHTAR)) return;
      sessionStorage.setItem(ANAHTAR, "1");
    } catch {
      // Gizli sekmede depolama kapalı olabilir; animasyon yine de oynasın.
    }
    setGoster(true);
    // En uzun yaprak (gecikme + süre) bitince kaldır.
    const t = setTimeout(() => setGoster(false), 12_500);
    return () => clearTimeout(t);
  }, [azalt]);

  if (azalt) return null;

  return (
    <AnimatePresence>
      {goster && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        >
          {yapraklar.map((y) => (
            <motion.span
              key={y.id}
              initial={{ y: "-12vh", x: 0, rotate: 0, opacity: 0 }}
              animate={{
                y: "112vh",
                x: y.savrulma,
                rotate: y.donus,
                opacity: [0, y.opaklik, y.opaklik, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: y.sure,
                delay: y.gecikme,
                ease: "linear",
                opacity: { times: [0, 0.12, 0.75, 1], duration: y.sure, delay: y.gecikme },
              }}
              style={{
                position: "absolute",
                left: `${y.sol}%`,
                width: y.boyut,
                height: y.boyut * 1.35,
                background: y.renk,
                // Yaprak formu: bir ucu sivri, diğeri yuvarlak.
                borderRadius: "60% 0 60% 0",
                willChange: "transform, opacity",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
