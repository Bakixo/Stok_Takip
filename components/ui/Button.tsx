"use client";

import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { pressable } from "@/lib/motion";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium tracking-wide " +
  "transition-colors disabled:pointer-events-none disabled:opacity-40 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:bg-fg/90",
  secondary: "border border-border-strong text-fg hover:bg-fg hover:text-bg",
  ghost: "text-fg-muted hover:text-fg",
};

/** Mobilde başparmakla rahat basılsın diye yükseklikler cömert. */
const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 text-sm",
  lg: "min-h-14 px-6 text-[15px]",
};

interface ButtonProps extends Omit<ComponentProps<typeof motion.button>, "children"> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      {...pressable}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

interface LinkButtonProps extends Omit<ComponentProps<typeof motion.a>, "children"> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

/** Dış bağlantılar için aynı görünüm (ör. "Ürüne Git"). */
export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <motion.a
      {...pressable}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </motion.a>
  );
}
