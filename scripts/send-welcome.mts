/**
 * Hoş geldin mailini elle gönderir.
 *
 *   npx tsx scripts/send-welcome.mts firuze@ornek.com
 *   npx tsx scripts/send-welcome.mts firuze@ornek.com --dry   (göndermeden önizle)
 *
 * Not metni .env içindeki WELCOME_NOTE değişkeninden gelir.
 * Otomatik değil çünkü bu bir hediye maili — ne zaman gideceğine sen karar ver.
 */
import "@/lib/load-env";
import { writeFile } from "node:fs/promises";
import { env } from "@/lib/env";
import { renderMail } from "@/lib/mail/render";
import { Welcome, welcomeText } from "@/lib/mail/templates/Welcome";
import { sendMail } from "@/lib/mail/send";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const to = args.find((a) => !a.startsWith("--"));

if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
  console.error(
    "Kullanım: npx tsx scripts/send-welcome.mts <e-posta> [--dry]\n" +
      "Örnek   : npx tsx scripts/send-welcome.mts firuze@ornek.com",
  );
  process.exit(1);
}

const e = env();
const note = process.env.WELCOME_NOTE?.trim();

const props = { appUrl: e.APP_URL, note: note || undefined };
const { html, text } = await renderMail(Welcome(props), welcomeText(props));

console.log(`alıcı    : ${to}`);
console.log(`uygulama : ${e.APP_URL}`);
console.log(`not      : ${note ? `"${note}"` : "(yok — not bölümü gizlenecek)"}`);

// Sık yapılan hata: APP_URL yerelde kalmışsa link alıcıda açılmaz.
if (e.APP_URL.includes("localhost")) {
  console.error(
    "\nDUR: APP_URL localhost'u gösteriyor. Maildeki buton alıcının\n" +
      "telefonunda açılmaz. Önce .env içinde canlı adresi yaz.",
  );
  process.exit(1);
}

if (dryRun) {
  await writeFile("recon/out/hosgeldin-onizleme.html", html, "utf8");
  console.log("\n--- DÜZ METİN ---\n");
  console.log(text);
  console.log("\nHTML → recon/out/hosgeldin-onizleme.html");
  console.log("(--dry verildiği için mail GÖNDERİLMEDİ)");
  process.exit(0);
}

const sonuc = await sendMail({
  to,
  subject: "Stokta'ya hoş geldin",
  html,
  text,
});

if (sonuc.ok) {
  console.log(`\n✓ Gönderildi${sonuc.id ? ` (${sonuc.id})` : ""}`);
} else {
  console.error(`\n✗ Gönderilemedi: ${sonuc.error}`);
  process.exit(1);
}
