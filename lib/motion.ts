/**
 * Ortak Framer Motion ayarları.
 *
 * Tek yerden yönetilir ki uygulamanın her yerinde aynı ritim olsun.
 * `prefers-reduced-motion` açıkken Framer hareketi kendisi kısar
 * (MotionConfig reducedMotion="user"), ayrıca globals.css süreleri düşürür.
 */
import type { Transition, Variants } from "framer-motion";

/** Zara'nın sakin estetiğine uyan yumuşak yavaşlama. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const transition: Transition = { duration: 0.45, ease: EASE };
export const quick: Transition = { duration: 0.25, ease: EASE };

/** Sayfa geçişi: hafif yukarı kayarak belirme. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition },
  exit: { opacity: 0, y: -8, transition: quick },
};

/** Liste kapsayıcısı: çocukları sırayla göster. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** Listedeki tek öğe. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition },
};

/** Butonlarda basma geri bildirimi. */
export const pressable = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.01 },
  transition: quick,
} as const;

/** Sonuç ekranındaki "bulundu" belirişi — konfeti değil, zarif bir açılma. */
export const revealVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: EASE },
  },
};
