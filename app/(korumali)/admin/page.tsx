/**
 * /admin — worker sağlığı.
 * PIN korumalı (korumalı düzenin altında).
 */
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/tr";
import { AVAILABILITY_LABEL, type Availability } from "@/lib/zara/types";

export const metadata = { title: "Admin · Stokta" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

export default async function AdminPage() {
  const since = new Date(Date.now() - DAY);

  const [active, found, cancelled, runs, logs, recentChecks, lastRun] = await Promise.all([
    prisma.watch.count({ where: { status: "ACTIVE" } }),
    prisma.watch.count({ where: { status: "FOUND" } }),
    prisma.watch.count({ where: { status: "CANCELLED" } }),
    prisma.workerRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.checkLog.groupBy({
      by: ["result"],
      where: { checkedAt: { gte: since } },
      _count: { result: true },
    }),
    prisma.checkLog.findMany({
      orderBy: { checkedAt: "desc" },
      take: 20,
      include: { watch: { select: { productName: true, size: true } } },
    }),
    prisma.workerRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);

  const total = logs.reduce((sum, l) => sum + l._count.result, 0);
  const errors = logs.find((l) => l.result === "error")?._count.result ?? 0;
  const errorRate = total > 0 ? (errors / total) * 100 : 0;

  // Art arda kaç tur başarısız? (en yeniden geriye doğru)
  let consecutiveFailures = 0;
  for (const r of runs) {
    if (r.failureReason) consecutiveFailures++;
    else break;
  }

  return (
    <div className="space-y-12 py-4">
      <header>
        <h1 className="text-4xl">Admin</h1>
        <p className="text-fg-subtle mt-2 text-sm">
          {lastRun
            ? `Son tur ${timeAgo(lastRun.startedAt)}`
            : "Worker henüz hiç çalışmadı"}
        </p>
      </header>

      {consecutiveFailures >= 3 && (
        <div className="border-l-2 border-[var(--color-watching)] py-2 pl-4">
          <p className="text-sm">
            Worker art arda <strong>{consecutiveFailures}</strong> turdur başarısız.
          </p>
          <p className="text-fg-muted mt-1 text-sm">
            {runs[0]?.failureReason}
          </p>
        </div>
      )}

      <section>
        <h2 className="text-fg-subtle mb-4 text-xs tracking-[0.16em] uppercase">Takipler</h2>
        <dl className="grid grid-cols-3 gap-px bg-[var(--border)]">
          <Stat label="Aktif" value={active} />
          <Stat label="Bulundu" value={found} />
          <Stat label="İptal" value={cancelled} />
        </dl>
      </section>

      <section>
        <h2 className="text-fg-subtle mb-4 text-xs tracking-[0.16em] uppercase">
          Son 24 saat
        </h2>
        <dl className="grid grid-cols-2 gap-px bg-[var(--border)]">
          <Stat label="Kontrol" value={total} />
          <Stat
            label="Hata oranı"
            value={`%${errorRate.toFixed(1)}`}
            tone={errorRate > 20 ? "warn" : undefined}
          />
        </dl>

        {logs.length > 0 && (
          <ul className="border-border divide-border mt-6 divide-y border-t text-sm">
            {logs
              .sort((a, b) => b._count.result - a._count.result)
              .map((l) => (
                <li key={l.result} className="flex justify-between py-2.5">
                  <span className="text-fg-muted">{resultLabel(l.result)}</span>
                  <span className="tabular-nums">{l._count.result}</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-fg-subtle mb-4 text-xs tracking-[0.16em] uppercase">
          Son turlar
        </h2>
        {runs.length === 0 ? (
          <p className="text-fg-muted text-sm">Henüz tur yok.</p>
        ) : (
          <ul className="border-border divide-border divide-y border-t text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-4 py-3">
                <span className="text-fg-subtle shrink-0 text-xs">
                  {timeAgo(r.startedAt)}
                </span>
                <span className="text-right">
                  {r.failureReason ? (
                    <span className="text-[var(--color-watching)]">başarısız</span>
                  ) : (
                    <span className="text-fg-muted">
                      {r.productCount} ürün · {r.foundCount} bulundu
                      {r.errorCount > 0 && ` · ${r.errorCount} hata`}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-fg-subtle mb-4 text-xs tracking-[0.16em] uppercase">
          Son kontroller
        </h2>
        {recentChecks.length === 0 ? (
          <p className="text-fg-muted text-sm">Henüz kontrol yok.</p>
        ) : (
          <ul className="border-border divide-border divide-y border-t text-sm">
            {recentChecks.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 py-3">
                {/* Beden kesilmesin: ad daralır, beden tam görünür. */}
                <span className="min-w-0 flex-1 truncate">{c.watch.productName}</span>
                <span className="text-fg-subtle shrink-0 text-xs">{c.watch.size}</span>
                <span
                  className={`shrink-0 text-xs ${
                    c.result === "error" ? "text-[var(--color-watching)]" : "text-fg-muted"
                  }`}
                >
                  {resultLabel(c.result)}
                </span>
                <span className="text-fg-subtle shrink-0 text-xs">
                  {timeAgo(c.checkedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "warn";
}) {
  return (
    <div className="bg-bg px-4 py-5">
      <dt className="text-fg-subtle text-xs tracking-[0.1em] uppercase">{label}</dt>
      <dd
        className={`mt-2 text-2xl tabular-nums ${
          tone === "warn" ? "text-[var(--color-watching)]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function resultLabel(result: string): string {
  if (result === "error") return "hata";
  return AVAILABILITY_LABEL[result as Availability] ?? result;
}
