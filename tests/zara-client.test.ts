/**
 * Zara istemcisi — kaydedilmiş gerçek cevaplara karşı testler.
 * Ağa çıkmaz: fetch sahteleniyor, cevaplar tests/fixtures/ altından geliyor.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAvailability,
  getProductByReference,
  getSizes,
  getStoresNear,
  parseUserInput,
} from "@/lib/zara/client";
import { ZaraError } from "@/lib/zara/http";

const fixture = (name: string) =>
  readFileSync(resolve(__dirname, "fixtures", `${name}.json`), "utf8");

/** fetch'i tek bir sabit cevapla değiştirir. */
function mockFetch(body: string, init: { status?: number; contentType?: string } = {}) {
  const { status = 200, contentType = "application/json" } = init;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status, headers: { "content-type": contentType } })),
  );
}

beforeEach(() => {
  // Testlerde istekler arası bekleme olmasın.
  process.env.ZARA_MIN_GAP_MS = "0";
  process.env.ZARA_JITTER_MS = "0";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseUserInput", () => {
  it("ürün linkinden referans ve renk varyantını çıkarır", () => {
    const r = parseUserInput(
      "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534",
    );
    expect(r.reference).toBe("08059577");
    expect(r.productId).toBe("580760534");
  });

  it("v1 taşımayan linki de kabul eder", () => {
    const r = parseUserInput("https://www.zara.com/tr/tr/bir-urun-p07701256.html");
    expect(r.reference).toBe("07701256");
    expect(r.productId).toBeUndefined();
  });

  it("üç parçalı ürün kodunu çözer", () => {
    const r = parseUserInput("8059/577/250");
    expect(r.reference).toBe("08059577");
    expect(r.colorId).toBe("250");
  });

  it("renksiz ürün kodunu çözer", () => {
    const r = parseUserInput("8059/577");
    expect(r.reference).toBe("08059577");
    expect(r.colorId).toBeUndefined();
  });

  it("boşlukları ve fazladan karakterleri yok sayar", () => {
    expect(parseUserInput("  8059 / 577 / 250  ").reference).toBe("08059577");
  });

  it("düz sekiz haneli referansı kabul eder", () => {
    expect(parseUserInput("08059577").reference).toBe("08059577");
  });

  it("anlamsız girdide açıklayıcı hata verir", () => {
    expect(() => parseUserInput("merhaba")).toThrowError(ZaraError);
    expect(() => parseUserInput("")).toThrowError(ZaraError);
  });
});

describe("getProductByReference", () => {
  it("tek renkli ürünü Türkçe adıyla çözer", async () => {
    mockFetch(fixture("reference-tek-renk"));
    const p = await getProductByReference("08059577");

    expect(p.name).toBe("PİLİLİ POPLİN GÖMLEK");
    expect(p.displayReference).toBe("8059/577");
    // Zara kuruş döndürür; TL'ye çevrilmiş olmalı.
    expect(p.price).toBe(1890);
    expect(p.seoKeyword).toBe("pilili-poplin-gomlek");
    expect(p.colors).toHaveLength(1);
    expect(p.colors[0]!.name).toBe("Beyaz");
    expect(p.colors[0]!.productId).toBe("580760534");
  });

  it("çok renkli üründe tüm renkleri birleştirir", async () => {
    // Zara her renk için ayrı bir sonuç döndürür; hepsi tek ürüne toplanmalı.
    mockFetch(fixture("reference-cok-renk"));
    const p = await getProductByReference("08417800");

    expect(p.colors.length).toBeGreaterThanOrEqual(4);
    const ids = p.colors.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length); // tekrar yok
    expect(p.colors.map((c) => c.name)).toContain("Sarı");
  });

  it("renklere hex kodu ekler", async () => {
    mockFetch(fixture("reference-cok-renk"));
    const p = await getProductByReference("08417800");
    const sari = p.colors.find((c) => c.name === "Sarı");
    expect(sari?.hexCode).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("görsel URL'i dosya adını yolun sonunda tekrarlar", async () => {
    // .../08059577250-p/08059577250-p.jpg — yalnızca yola .jpg eklemek 404 verir.
    mockFetch(fixture("reference-tek-renk"));
    const p = await getProductByReference("08059577");
    const url = p.colors[0]!.imageUrl!;

    expect(url).toMatch(/^https:\/\/static\.zara\.net\//);
    expect(url).toMatch(/\/(.+)\/\1\.jpg/); // son iki parça aynı
    expect(url).not.toContain("{width}");
  });

  it("ürün yoksa not_found hatası verir", async () => {
    mockFetch(fixture("reference-bulunamadi"));
    await expect(getProductByReference("00000000")).rejects.toMatchObject({
      kind: "not_found",
    });
  });
});

describe("getSizes", () => {
  it("beden adlarını ve SKU'ları döndürür", async () => {
    mockFetch(fixture("product-detail"));
    const sizes = await getSizes("580760534");

    expect(sizes.map((s) => s.name)).toEqual(["XS", "S", "M", "L", "XL"]);
    for (const s of sizes) {
      expect(s.skuId).toMatch(/^\d+$/);
      expect(["in_stock", "low_on_stock", "out_of_stock", "coming_soon"]).toContain(
        s.availability,
      );
    }
  });
});

describe("getAvailability", () => {
  it("SKU → durum haritası döndürür", async () => {
    mockFetch(fixture("availability"));
    const map = await getAvailability("580760534");

    expect(map.size).toBe(5);
    expect(map.get("580756907")).toBeDefined();
  });

  it("tükenmiş bedenleri doğru okur", async () => {
    mockFetch(fixture("availability-karisik"));
    const map = await getAvailability("552262997");
    const states = [...map.values()];

    expect(states).toContain("out_of_stock");
    expect(states).toContain("in_stock");
  });
});

describe("getStoresNear", () => {
  it("mağazaları adres ve harita linkiyle döndürür", async () => {
    mockFetch(fixture("stores-istanbul"));
    const stores = await getStoresNear(41.0082, 28.9784);

    expect(stores.length).toBeGreaterThan(0);
    const s = stores[0]!;
    expect(s.id).toMatch(/^\d+$/);
    expect(s.label.length).toBeGreaterThan(3);
    // Zara adreslerinde çift boşluk olur; temizlenmeli.
    expect(s.label).not.toMatch(/\s{2,}/);
    expect(s.mapsUrl).toContain("google.com/maps");
    expect(s.city).toBeTruthy();
  });
});

describe("hata sınıflandırma", () => {
  it("Akamai engelini blocked olarak işaretler", async () => {
    mockFetch("<HTML><HEAD><TITLE>Access Denied</TITLE></HEAD></HTML>", {
      status: 403,
      contentType: "text/html",
    });
    await expect(getAvailability("1")).rejects.toMatchObject({ kind: "blocked" });
  });

  it("interstitial challenge'ı da engel sayar", async () => {
    mockFetch('<html><head><meta content="5; URL=/?bm-verify=abc" /></head></html>', {
      contentType: "text/html",
    });
    await expect(getAvailability("1")).rejects.toMatchObject({ kind: "blocked" });
  });

  it("404'ü not_found olarak işaretler", async () => {
    mockFetch('{"errorCode":404}', { status: 404 });
    await expect(getAvailability("1")).rejects.toMatchObject({ kind: "not_found" });
  });
});
