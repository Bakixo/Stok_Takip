"use server";

import { redirect } from "next/navigation";
import { createSession, verifyPin } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

/** PIN'i doğrular ve oturum çerezini kurar. */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "");

  if (!pin) return { error: "PIN gerekli." };
  if (!verifyPin(pin)) {
    // Kaba kuvvet denemelerini yavaşlatmak için küçük bir gecikme.
    await new Promise((r) => setTimeout(r, 600));
    return { error: "PIN yanlış." };
  }

  await createSession();
  redirect("/");
}
