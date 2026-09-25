/** Ürün görsellerinin gerçekten yüklendiğini doğrular. */
import "@/lib/load-env";
import { getProductByReference } from "@/lib/zara/client";

const refs = process.argv.slice(2);
if (refs.length === 0) refs.push("08059577");

for (const ref of refs) {
  const p = await getProductByReference(ref);
  console.log(`\n${p.name} (${p.displayReference})`);
  for (const c of p.colors) {
    if (!c.imageUrl) {
      console.log(`  ${c.name.padEnd(14)} görsel yok`);
      continue;
    }
    const res = await fetch(c.imageUrl, { method: "HEAD" });
    console.log(
      `  ${c.name.padEnd(14)} ${res.status} ${res.headers.get("content-type") ?? "-"}`,
    );
  }
}
