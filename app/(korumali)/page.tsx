import { prisma } from "@/lib/db";
import { SearchInput } from "@/components/SearchInput";
import { WatchList } from "@/components/WatchList";
import { toWatchCard } from "@/lib/watch-card";
import { requireEmail } from "@/lib/require-email";
import { Petals } from "@/components/Petals";

export const metadata = { title: "Stokta" };
/** Takip listesi her girişte tazelensin. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Bildirim adresi yoksa önce onu sor.
  await requireEmail();

  const watches = await prisma.watch.findMany({
    where: { status: { in: ["ACTIVE", "FOUND"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 8,
  });

  return (
    <div className="space-y-12">
      <Petals />
      <section className="pt-6">
        <h1 className="text-[2.75rem] leading-[1.05] text-balance">
          Beklediğin beden
          <br />
          gelince haber ver.
        </h1>
        <div className="mt-8">
          <SearchInput />
        </div>
      </section>

      {watches.length > 0 && (
        <section>
          <h2 className="text-fg-subtle mb-5 text-xs tracking-[0.16em] uppercase">
            Takiplerin
          </h2>
          <WatchList watches={watches.map(toWatchCard)} />
        </section>
      )}
    </div>
  );
}
