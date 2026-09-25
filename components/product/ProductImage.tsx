"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * Ürün görseli — kaydırdıkça hafif parallax.
 * Hareket kısıtlıyken MotionConfig bunu kendiliğinden bastırır.
 */
export function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  if (!src) {
    return <div className="bg-bg-sunken aspect-[3/4] w-full" aria-hidden />;
  }

  return (
    <div ref={ref} className="bg-bg-sunken relative aspect-[3/4] w-full overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        style={{ y }}
        className="h-[112%] w-full object-cover"
        // İlk görülen görsel: erken yüklensin.
        fetchPriority="high"
      />
    </div>
  );
}
