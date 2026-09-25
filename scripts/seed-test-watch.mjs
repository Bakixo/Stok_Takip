/**
 * Faz 1 doğrulaması: gerçek bir Zara ürününden test takibi oluşturur.
 *
 *   node scripts/seed-test-watch.mjs <zara-linki-veya-kodu> [beden] [sehir-slug] [email]
 *
 * Örnek:
 *   node scripts/seed-test-watch.mjs 8059/577/250 M istanbul test@example.com
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (existsSync(resolve(process.cwd(), ".env"))) process.loadEnvFile();

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

const STORE = 11766;
const H = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Referer: "https://www.zara.com/tr/tr/",
};

const getJson = async (url) => {
  const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(25000) });
  const t = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
  return JSON.parse(t);
};

const [input = "8059/577/250", wantedSize, city = "istanbul", email = "test@example.com"] =
  process.argv.slice(2);

// --- girdiyi çöz ---
let reference, productIdFromUrl, colorIdFromCode;
const fromUrl = input.match(/-p(\d{6,10})\.html/i);
if (fromUrl) {
  reference = fromUrl[1];
  productIdFromUrl = input.match(/[?&]v1=(\d+)/)?.[1];
} else {
  const parts = input.split("/").map((p) => p.replace(/\D/g, "")).filter(Boolean);
  reference = `${parts[0]}${parts[1] ?? ""}`.padStart(8, "0");
  colorIdFromCode = parts[2];
}

console.log(`referans: ${reference}`);

const ref = await getJson(
  `https://www.zara.com/itxrest/1/search/store/${STORE}/reference` +
    `?reference=${reference}&locale=tr_TR&scope=default&origin=search&ajax=true`,
);
const content = ref.results?.[0]?.content;
if (!content) throw new Error(`Ürün bulunamadı: ${reference}`);

const colors = content.detail.colors;
const color =
  colors.find((c) => String(c.productId) === productIdFromUrl) ??
  colors.find((c) => c.id === colorIdFromCode) ??
  colors[0];

console.log(`ürün    : ${content.name}`);
console.log(`renk    : ${color.name} (${color.id}) → productId ${color.productId}`);

await new Promise((r) => setTimeout(r, 2000));

const detail = await getJson(
  `https://www.zara.com/api/storefront/1/stores/${STORE}/products/id/${color.productId}`,
);
const sizes = detail.simplifiedCommercialComponent.sizes.map((s) => ({
  name: s.nomenclature.name,
  sku: String(s.identifier.sku),
  availability: s.availability,
}));

console.log("bedenler:");
for (const s of sizes) console.log(`   ${s.name.padEnd(5)} ${s.sku}  ${s.availability}`);

// Test için tükenmiş bir beden tercih edilir (worker'ın "bulamadı" yolunu görmek için)
const size =
  sizes.find((s) => s.name === wantedSize) ??
  sizes.find((s) => s.availability === "out_of_stock") ??
  sizes[0];

const img = color.xmedia?.[0];
const imageUrl = img
  ? `https://static.zara.net${img.path}.jpg?ts=${img.timestamp}&w=750`
  : "";

const watch = await prisma.watch.upsert({
  where: { email_skuId: { email, skuId: size.sku } },
  update: { status: "ACTIVE", foundAt: null, foundState: null },
  create: {
    productId: String(color.productId),
    reference,
    productName: content.name,
    imageUrl,
    productUrl: `https://www.zara.com/tr/tr/${content.seo.keyword}-p${content.seo.seoProductId}.html?v1=${color.productId}`,
    price: content.price / 100,
    colorId: color.id,
    colorName: color.name,
    size: size.name,
    skuId: size.sku,
    city,
    email,
    status: "ACTIVE",
  },
});

console.log(`\n✓ Takip oluşturuldu: ${watch.id}`);
console.log(`  ${watch.productName} — ${watch.colorName}, beden ${watch.size} (${size.availability})`);
console.log(`  ${watch.email} · ${watch.city}`);

await prisma.$disconnect();
