import Link from "next/link";
import { prisma } from "@/lib/db";
import { WatchesClient } from "./WatchesClient";
import { toWatchCard } from "@/lib/watch-card";

export const metadata = { title: "Takiplerim · Stokta" };
export const dynamic = "force-dynamic";

export default async function WatchesPage() {
  const watches = await prisma.watch.findMany({
    where: { status: { in: ["ACTIVE", "FOUND"] } },
    // Bulunanlar üstte (ACTIVE < FOUND alfabetik olduğu için açıkça sıralıyoruz).
    orderBy: [{ foundAt: "desc" }, { createdAt: "desc" }],
  });

  if (watches.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl">Henüz takip yok</h1>
        <p className="text-fg-muted mt-3 text-[15px] text-balance">
          Bir Zara linki yapıştır, beden gelince haber vereyim.
        </p>
        <Link
          href="/"
          className="border-border-strong mt-8 inline-flex min-h-12 items-center border px-5 text-sm"
        >
          Ürün ara
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mt-4 text-4xl">Takiplerim</h1>
      <p className="text-fg-subtle mt-2 text-sm">
        Silmek için kartı sola kaydır.
      </p>
      <div className="mt-8">
        <WatchesClient watches={watches.map(toWatchCard)} />
      </div>
    </div>
  );
}
