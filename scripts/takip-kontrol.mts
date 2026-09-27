/**
 * Aktif takipleri alır ve HER BİRİNİ Zara'ya canlı sorar.
 * Ayrıca son mail kayıtlarını gösterir.
 *
 *   npx tsx scripts/takip-kontrol.mts
 *   npx tsx scripts/takip-kontrol.mts --acik     (adresler maskesiz)
 *
 * Amaç: "mail gitti mi" ve "ürünün gerçekten stoğu var mı" sorularını
 * uygulamadan bağımsız, doğrudan kaynaktan doğrulamak.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";
import { getAvailability, getSizes } from "@/lib/zara/client";
import { AVAILABILITY_LABEL, isPurchasable } from "@/lib/zara/types";

const acik = process.argv.includes("--acik");

function baglantiAdresi(): string {
  const ortam = process.env.DATABASE_URL?.trim();
  if (ortam?.startsWith("postgres")) return ortam;
  for (const dosya of [".env.vercel", ".env"]) {
    const yol = resolve(process.cwd(), dosya);
    if (!existsSync(yol)) continue;
    const m = readFileSync(yol, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (m?.[1]?.startsWith("postgres")) return m[1].trim();
  }
  console.error("Canlı DATABASE_URL bulunamadı (.env.vercel).");
  process.exit(1);
}

const maskele = (e: string) => {
  if (acik) return e;
  const [ad = "", alan = ""] = e.split("@");
  return `${ad.slice(0, 2)}${"*".repeat(Math.max(3, ad.length - 2))}@${alan}`;
};

const TUR: Record<string, string> = {
  stock_alert: "Stokta!",
  watch_confirmed: "Takibe alındı",
  welcome: "Hoş geldin",
  renewal: "Hatırlatma",
  admin_alert: "Admin uyarısı",
};

const c = new Client({ connectionString: baglantiAdresi(), ssl: { rejectUnauthorized: false } });
await c.connect();

try {
  // ---------- 1) Mail kayıtları ----------
  console.log("\n=== SON MAİL KAYITLARI ===\n");
  const { rows: mailler } = await c.query<{
    to: string;
    kind: string;
    status: string;
    error: string | null;
    dk: string;
  }>(`
    SELECT "to", kind, status, error,
           ROUND(EXTRACT(EPOCH FROM (NOW() - "sentAt")) / 60)::text AS dk
    FROM "MailLog" ORDER BY "sentAt" DESC LIMIT 15
  `);

  if (mailler.length === 0) {
    console.log("  Henüz kayıt yok.");
    console.log("  (Kayıt tutma yeni eklendi; bundan sonraki mailler burada görünecek.)");
  }
  for (const m of mailler) {
    const isaret = m.status === "sent" ? "✓" : m.status === "dry_run" ? "○" : "✗";
    console.log(
      `  ${isaret} ${(TUR[m.kind] ?? m.kind).padEnd(16)} ${maskele(m.to).padEnd(26)} ${m.status.padEnd(8)} (${m.dk} dk önce)`,
    );
    if (m.error) console.log(`      ${m.error.slice(0, 140)}`);
  }

  // ---------- 2) Aktif takipler + canlı Zara kontrolü ----------
  const { rows: takipler } = await c.query<{
    id: string;
    email: string;
    productId: string;
    skuId: string;
    productName: string;
    size: string;
    colorName: string;
    status: string;
    olusturuldu_dk: string;
    kontrol_dk: string | null;
  }>(`
    SELECT id, email, "productId", "skuId", "productName", size, "colorName", status,
           ROUND(EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 60)::text     AS olusturuldu_dk,
           ROUND(EXTRACT(EPOCH FROM (NOW() - "lastCheckedAt")) / 60)::text AS kontrol_dk
    FROM "Watch"
    WHERE status IN ('ACTIVE', 'FOUND')
    ORDER BY "createdAt" DESC
  `);

  console.log(`\n=== TAKİPLER — ZARA'YA CANLI SORULUYOR (${takipler.length}) ===\n`);

  for (const t of takipler) {
    console.log(`  ${maskele(t.email)}`);
    console.log(`    ${t.productName} · ${t.colorName} · Beden ${t.size}`);
    console.log(`    uygulama durumu: ${t.status} · oluşturuldu ${t.olusturuldu_dk} dk önce`);
    console.log(`    son kontrol: ${t.kontrol_dk ?? "—"} dk önce`);

    try {
      const canli = await getAvailability(t.productId);
      const durum = canli.get(t.skuId);

      if (!durum) {
        // SKU cevapta yoksa beden listesi değişmiş olabilir.
        const bedenler = await getSizes(t.productId);
        console.log(`    ZARA: bu SKU artık listede yok`);
        console.log(
          `    mevcut bedenler: ${bedenler.map((b) => `${b.name}=${b.availability}`).join(", ")}`,
        );
      } else {
        const alinabilir = isPurchasable(durum);
        console.log(
          `    ZARA: ${AVAILABILITY_LABEL[durum]} (${durum}) ${alinabilir ? "← ALINABİLİR" : ""}`,
        );

        if (alinabilir && t.status === "ACTIVE") {
          console.log(`    >> Stokta ve takip hâlâ ACTIVE: bir sonraki turda mail gitmeli.`);
        } else if (alinabilir && t.status === "FOUND") {
          console.log(`    >> Stokta ama takip zaten FOUND: tekrar mail gitmez.`);
        }
      }
    } catch (err) {
      console.log(`    ZARA: sorgulanamadı — ${err instanceof Error ? err.message : err}`);
    }
    console.log();
  }

  if (!acik) console.log("(Adresler maskeli. Tam hâli için: --acik)\n");
} finally {
  await c.end();
}
