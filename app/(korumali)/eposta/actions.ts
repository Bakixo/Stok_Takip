"use server";

import { redirect } from "next/navigation";
import { getEmail, isValidEmail, saveEmail } from "@/lib/auth";

export interface EmailState {
  error?: string;
}

/** Bildirim adresini kaydeder ve ana sayfaya döner. */
export async function saveEmailAction(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const email = String(formData.get("eposta") ?? "").trim();

  if (!email) return { error: "E-posta adresi gerekli." };
  if (!isValidEmail(email)) return { error: "Bu adres geçerli görünmüyor." };

  await saveEmail(email);
  redirect("/");
}

export { getEmail };
