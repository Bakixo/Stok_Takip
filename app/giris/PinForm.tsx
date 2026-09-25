"use client";

import { motion } from "framer-motion";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { pageVariants, transition } from "@/lib/motion";
import { login, type LoginState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? "Kontrol ediliyor…" : "Gir"}
    </Button>
  );
}

export function PinForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants}>
      <h1 className="text-5xl leading-none">Stokta</h1>
      <p className="text-fg-muted mt-4 text-[15px] text-balance">
        Zara&apos;da beklediğin beden gelince haber veriyorum.
      </p>

      <form action={formAction} className="mt-12 space-y-4">
        <label htmlFor="pin" className="text-fg-subtle block text-xs tracking-[0.16em] uppercase">
          Erişim kodu
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          required
          aria-describedby={state.error ? "pin-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          className="border-border focus:border-fg bg-bg-elevated w-full border px-4 py-4
                     text-center text-2xl tracking-[0.5em] outline-none transition-colors"
        />

        {state.error && (
          <motion.p
            id="pin-error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="text-center text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </motion.p>
        )}

        <Submit />
      </form>
    </motion.div>
  );
}
