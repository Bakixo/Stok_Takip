"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getEmail, hasSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendWatchConfirmed } from "@/lib/mail/notifications";
import { findCity } from "@/lib/zara/cities";

/**
 * Takip girdisi.
 *
 * E-posta bilerek burada YOK: istemciden gelen adrese güvenmiyoruz.
 * Adres, girişte sorulup imzalı çerezte tutulan değerden okunuyor —
 * aksi hâlde PIN'i bilen biri istediği adrese bildirim kurabilirdi.
 */
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

  const email = await getEmail();
  if (!email) return { ok: false, error: "Önce e-posta adresini kaydet." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Girdi geçersiz." };
  }
  const data = parsed.data;

  if (!findCity(data.city)) return { ok: false, error: "Şehir tanınmadı." };

  try {
    const watch = await prisma.watch.upsert({
      where: { email_skuId: { email, skuId: data.skuId } },
      // Daha önce bulunmuş ya da iptal edilmişse yeniden izlemeye al.
      update: {
        status: "ACTIVE",
        city: data.city,
        foundAt: null,
        foundState: null,
        renewalSentAt: null,
      },
      create: { ...data, email, status: "ACTIVE" },
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

/**
 * Takibi iptal eder (kayıt silinmez, durumu değişir).
 *
 * Sahiplik kontrolü şart: uygulamayı birden fazla kişi aynı PIN'le
 * kullanıyor, kimse başkasının takibini silememeli.
 */
export async function cancelWatch(id: string): Promise<ActionResult> {
  if (!(await hasSession())) return { ok: false, error: "Oturum gerekli." };

  const email = await getEmail();
  if (!email) return { ok: false, error: "Önce e-posta adresini kaydet." };

  try {
    const sonuc = await prisma.watch.updateMany({
      // email koşulu sahiplik kontrolü: başkasının kaydı eşleşmez.
      where: { id, email },
      data: { status: "CANCELLED" },
    });

    if (sonuc.count === 0) return { ok: false, error: "Takip bulunamadı." };

    revalidatePath("/");
    revalidatePath("/takiplerim");
    return { ok: true };
  } catch {
    return { ok: false, error: "Takip iptal edilemedi." };
  }
}
