import Link from "next/link";
import { getProductByReference, parseUserInput } from "@/lib/zara/client";
import { ZaraError } from "@/lib/zara/http";
import { ProductView } from "@/components/product/ProductView";
import { requireEmail } from "@/lib/require-email";
import type { ZaraProduct } from "@/lib/zara/types";

export const metadata = { title: "Ürün · Stokta" };
/** Fiyat ve renkler her zaman taze gelsin. */
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ giris?: string }>;
}

export default async function ProductPage({ searchParams }: Props) {
  // Bildirim adresi bir kez sorulur; takip formu artık e-posta istemiyor.
  const email = await requireEmail();
  const { giris } = await searchParams;

  if (!giris) return <Problem title="Ürün belirtilmedi" detail="Ana sayfadan bir link ya da kod gir." />;

  let product: ZaraProduct;
  let preselectedColorId: string | undefined;

  try {
    const parsed = parseUserInput(giris);
    product = await getProductByReference(parsed.reference);

    // Link v1= taşıyorsa o renk varyantı, kod renk içeriyorsa o renk seçili gelsin.
    preselectedColorId = parsed.productId
      ? product.colors.find((c) => c.productId === parsed.productId)?.id
      : parsed.colorId && product.colors.some((c) => c.id === parsed.colorId)
        ? parsed.colorId
        : undefined;
  } catch (err) {
    return <Problem {...describeError(err)} />;
  }

  return (
    <ProductView product={product} preselectedColorId={preselectedColorId} email={email} />
  );
}

/** Hatayı kullanıcının anlayacağı dile çevirir. */
function describeError(err: unknown): { title: string; detail: string } {
  if (err instanceof ZaraError) {
    switch (err.kind) {
      case "parse":
        return {
          title: "Girdiyi anlayamadım",
          detail: "Zara ürün linkini ya da 8059/577 biçiminde bir kodu dene.",
        };
      case "not_found":
        return {
          title: "Ürün bulunamadı",
          detail: "Kod yanlış olabilir ya da ürün artık satışta değil.",
        };
      case "blocked":
        return {
          title: "Zara şu an cevap vermiyor",
          detail: "İstek engellendi. Birkaç dakika sonra tekrar dene.",
        };
      default:
        return { title: "Ürün alınamadı", detail: "Bağlantı sorunu olabilir; tekrar dene." };
    }
  }
  return { title: "Beklenmeyen bir hata", detail: "Tekrar denemek işe yarayabilir." };
}

function Problem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="py-16">
      <h1 className="text-3xl">{title}</h1>
      <p className="text-fg-muted mt-3 text-[15px] text-balance">{detail}</p>
      <Link
        href="/"
        className="border-border-strong mt-8 inline-flex min-h-12 items-center border px-5 text-sm"
      >
        Başa dön
      </Link>
    </div>
  );
}
