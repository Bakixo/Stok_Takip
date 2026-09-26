"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { pageVariants, transition } from "@/lib/motion";
import { saveEmailAction, type EmailState } from "./actions";

function Submit({ ilk }: { ilk: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? "Kaydediliyor…" : ilk ? "Devam" : "Kaydet"}
    </Button>
  );
}

export function EmailForm({ mevcut }: { mevcut: string | null }) {
  const [state, formAction] = useActionState<EmailState, FormData>(saveEmailAction, {});
  const ilk = mevcut === null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      className="flex min-h-[70dvh] flex-col justify-center"
    >
      <h1 className="text-[2.5rem] leading-[1.1] text-balance">
        {ilk ? "Seni nereden bulayım?" : "E-posta adresin"}
      </h1>

      <p className="text-fg-muted mt-4 text-[15px] text-balance">
        {ilk
          ? "Beklediğin beden stoğa girdiğinde bu adrese haber vereceğim. Bir kez soruyorum, sonra hatırlıyorum."
          : "Bildirimler bu adrese gidiyor. Değiştirebilirsin."}
      </p>

      <form action={formAction} className="mt-10 space-y-4">
        <label
          htmlFor="eposta"
          className="text-fg-subtle block text-xs tracking-[0.16em] uppercase"
        >
          E-posta
        </label>
        <input
          id="eposta"
          name="eposta"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus={ilk}
          required
          defaultValue={mevcut ?? ""}
          placeholder="ornek@eposta.com"
          aria-describedby={state.error ? "eposta-hata" : undefined}
          aria-invalid={state.error ? true : undefined}
          className="border-border focus:border-fg min-h-14 w-full border bg-transparent px-4
                     text-[15px] outline-none transition-colors
                     placeholder:text-[var(--fg-subtle)]"
        />

        {state.error && (
          <motion.p
            id="eposta-hata"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="text-sm text-red-600 dark:text-red-400"
          >
            {state.error}
          </motion.p>
        )}

        <Submit ilk={ilk} />
      </form>

      {!ilk && (
        <Link
          href="/"
          className="text-fg-subtle hover:text-fg mt-6 text-center text-sm transition-colors"
        >
          Vazgeç
        </Link>
      )}
    </motion.div>
  );
}
