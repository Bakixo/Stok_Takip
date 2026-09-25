"use client";

import { motion } from "framer-motion";

/** Bedenler yüklenirken parıltılı iskelet. */
export function SizeSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-wrap gap-2"
      aria-busy="true"
      aria-label="Bedenler yükleniyor"
    >
      {[14, 14, 16, 14, 16].map((w, i) => (
        <div key={i} className="shimmer h-12" style={{ width: `${w * 0.25}rem` }} />
      ))}
    </motion.div>
  );
}
