"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendWatchConfirmed } from "@/lib/mail/notifications";
import { findCity } from "@/lib/zara/cities";

const createSchema = z.object({
  productId: z.string().regex(/^\d+$/, "Geçersiz ürün"),
  reference: z.string().min(4),
  productName: z.string().min(1),
  imageUrl: z.string().url().or(z.literal("")),
  productUrl: z.string().url(),
  price: z.number().nonnegative(),
  colorId: z.string().min(1),
  colorName: z.string().min(1),
  size: z.string().min(1),
  skuId: z.string().regex(/^\d+$/, "Geçersiz beden"),
  city: z.string().min(1),
  email: z.string().email("Geçerli bir e-posta gir"),
});

export type CreateWatchInput = z.infer<typeof createSchema>;

export interface ActionResult {
  ok: boolean;
  error?: string;
  watchId?: string;
}

/** Ürünü takibe alır. Aynı kişi + aynı beden zaten varsa onu yeniden etkinleştirir. */
export async function createWatch(input: CreateWatchInput): Promise<ActionResult> {
  if (!(await hasSession())) return { ok: false, error: "Oturum gerekli." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Girdi geçersiz." };
  }
  const data = parsed.data;

  if (!findCity(data.city)) return { ok: false, error: "Şehir tanınmadı." };

  try {
    const watch = await prisma.watch.upsert({
      where: { email_skuId: { email: data.email, skuId: data.skuId } },
      // Daha önce bulunmuş ya da iptal edilmişse yeniden izlemeye al.
      update: {
        status: "ACTIVE",
        city: data.city,
        foundAt: null,
        foundState: null,
        renewalSentAt: null,
      },
      create: { ...data, status: "ACTIVE" },
    });

    // Onay maili takibi bloklamasın: kayıt başarılı, mail gitmese de olur.
    void sendWatchConfirmed(watch).catch((err) => {
      console.error("[watch] onay maili gönderilemedi:", err);
    });

    revalidatePath("/");
    revalidatePath("/takiplerim");
    return { ok: true, watchId: watch.id };
  } catch {
    return { ok: false, error: "Takip kaydedilemedi." };
  }
}

/** Takibi iptal eder (kayıt silinmez, durumu değişir). */
export async function cancelWatch(id: string): Promise<ActionResult> {
  if (!(await hasSession())) return { ok: false, error: "Oturum gerekli." };

  try {
    await prisma.watch.update({ where: { id }, data: { status: "CANCELLED" } });
    revalidatePath("/");
    revalidatePath("/takiplerim");
    return { ok: true };
  } catch {
    return { ok: false, error: "Takip iptal edilemedi." };
  }
}
