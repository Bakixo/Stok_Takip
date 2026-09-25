/**
 * Üç maili de HTML + düz metin olarak üretip dosyaya yazar.
 * Tarayıcıda açıp görünümü kontrol etmek için.
 *
 *   npx tsx scripts/preview-mails.mts
 */
import "@/lib/load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { renderMail } from "@/lib/mail/render";
import { StockAlert, stockAlertText } from "@/lib/mail/templates/StockAlert";
import { WatchConfirmed, watchConfirmedText } from "@/lib/mail/templates/WatchConfirmed";
import { Welcome, welcomeText } from "@/lib/mail/templates/Welcome";

const OUT = "recon/out/mails";
await mkdir(OUT, { recursive: true });

const jobs = [
  {
    name: "1-stokta",
    element: StockAlert(StockAlert.PreviewProps),
    text: stockAlertText(StockAlert.PreviewProps),
  },
  {
    name: "2-takibe-alindi",
    element: WatchConfirmed(WatchConfirmed.PreviewProps),
    text: watchConfirmedText(WatchConfirmed.PreviewProps),
  },
  {
    name: "3-hosgeldin",
    element: Welcome(Welcome.PreviewProps),
    text: welcomeText(Welcome.PreviewProps),
  },
];

for (const job of jobs) {
  const { html, text } = await renderMail(job.element, job.text);
  await writeFile(`${OUT}/${job.name}.html`, html, "utf8");
  await writeFile(`${OUT}/${job.name}.txt`, text, "utf8");
  console.log(`${job.name.padEnd(18)} html ${String(html.length).padStart(6)} b · metin ${String(text.length).padStart(4)} b`);
}

console.log(`\nDosyalar: ${OUT}/`);
