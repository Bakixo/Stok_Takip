/**
 * Mailden gelen "bu takibi durdur" linki.
 * PIN gerektirmez — link zaten kullanıcıya özel bir kimlik taşıyor ve
 * yapabildiği tek şey takibi durdurmak.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = { title: "Takip durduruldu · Stokta" };
export const dynamic = "force-dynamic";

export default async function StopWatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const watch = await prisma.watch.findUnique({ where: { id } });

  if (watch && watch.status !== "CANCELLED") {
    await prisma.watch.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <p className="text-fg-subtle text-xs tracking-[0.2em] uppercase">Stokta</p>

      {watch ? (
        <>
          <h1 className="mt-5 text-3xl leading-tight">Takip durduruldu.</h1>
          <p className="text-fg-muted mt-4 text-[15px] text-balance">
            <span className="text-fg">{watch.productName}</span> — {watch.colorName}, beden{" "}
            {watch.size} için artık bildirim göndermeyeceğim.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-3xl leading-tight">Takip bulunamadı.</h1>
          <p className="text-fg-muted mt-4 text-[15px] text-balance">
            Bu takip zaten silinmiş olabilir.
          </p>
        </>
      )}

      <Link
        href="/"
        className="border-border-strong mt-10 inline-flex min-h-12 items-center justify-center border px-5 text-sm"
      >
        Stokta&apos;ya dön
      </Link>
    </main>
  );
}
