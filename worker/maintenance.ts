/**
 * Worker'ın bakım işleri: admin uyarısı ve 30 günlük takip hatırlatması.
 */
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail/send";
import { unsubscribeUrl } from "@/lib/mail/notifications";

/** Art arda başarısız turlardan sonra sana gider. */
export async function sendAdminAlert(failures: number, reason: string): Promise<void> {
  const e = env();
  const subject = `Stokta: worker ${failures} turdur başarısız`;
  const text =
    `Worker art arda ${failures} turdur stok kontrolü yapamıyor.\n\n` +
    `Son hata: ${reason}\n\n` +
    `Muhtemel sebep: Zara endpoint'i değişmiş ya da istekler engellenmiş olabilir.\n` +
    `Kontrol: ${e.APP_URL}/admin\n`;

  await sendMail({
    to: e.ADMIN_EMAIL,
    subject,
    text,
    html: `<p>Worker art arda <strong>${failures}</strong> turdur stok kontrolü yapamıyor.</p>
<p>Son hata: <code>${escapeHtml(reason)}</code></p>
<p>Muhtemel sebep: Zara endpoint'i değişmiş ya da istekler engellenmiş olabilir.</p>
<p><a href="${e.APP_URL}/admin">Admin sayfasını aç</a></p>`,
  });

  console.log(`[worker] admin uyarısı gönderildi → ${e.ADMIN_EMAIL}`);
}

/** 30 günü geçmiş aktif takipler için "hâlâ takip edeyim mi?" maili. */
export async function sendRenewalReminders(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stale = await prisma.watch.findMany({
    where: {
      status: "ACTIVE",
      createdAt: { lt: cutoff },
      // Hatırlatma ya hiç gitmemiş ya da 30 günden eski olmalı.
      OR: [{ renewalSentAt: null }, { renewalSentAt: { lt: cutoff } }],
    },
  });

  if (stale.length === 0) return;
  console.log(`[worker] ${stale.length} takip için hatırlatma gönderiliyor`);

  for (const w of stale) {
    const days = Math.floor((Date.now() - w.createdAt.getTime()) / 86_400_000);
    const stop = unsubscribeUrl(w.id);
    const subject = `Hâlâ takip edeyim mi? ${w.productName} (${w.size})`;
    const text =
      `${w.productName} — ${w.colorName}, beden ${w.size} ürününü ${days} gündür takip ediyorum ` +
      `ve henüz stoğa girmedi.\n\n` +
      `Takibe devam etmemi istiyorsan bir şey yapmana gerek yok.\n` +
      `Durdurmak için: ${stop}\n`;

    const ok = await sendMail({
      to: w.email,
      subject,
      text,
      html: `<p><strong>${escapeHtml(w.productName)}</strong> — ${escapeHtml(w.colorName)}, beden ${escapeHtml(w.size)}
ürününü <strong>${days} gündür</strong> takip ediyorum ve henüz stoğa girmedi.</p>
<p>Takibe devam etmemi istiyorsan bir şey yapmana gerek yok.</p>
<p><a href="${stop}">Takibi durdur</a></p>`,
      unsubscribeUrl: stop,
    });

    if (ok.ok) {
      await prisma.watch.update({
        where: { id: w.id },
        data: { renewalSentAt: new Date() },
      });
    }
  }
}

/** Mail gövdesine giren kullanıcı/hata metnini güvenli hâle getirir. */
function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
