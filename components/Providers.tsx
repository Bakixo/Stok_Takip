"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Uygulama geneli hareket ayarı.
 * `reducedMotion="user"` ile işletim sistemindeki "hareketi azalt" tercihi
 * açıksa Framer tüm animasyonları kendiliğinden kısar.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
