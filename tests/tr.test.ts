/**
 * Türkçe metin yardımcıları.
 * Ek uyumu ve büyük harf kuralları maillerde ve arayüzde görünür yerlerde
 * kullanıldığı için ayrıca test ediliyor.
 */
import { describe, expect, it } from "vitest";
import { formatPrice, locative, locativeAdj, lowerTr, timeAgo, upperTr } from "@/lib/tr";

describe("locative (bulunma hâli eki)", () => {
  it("kalın ünlüyle biten adlara -da ekler", () => {
    expect(locative("İstanbul")).toBe("İstanbul'da");
    expect(locative("Ankara")).toBe("Ankara'da");
    expect(locative("Bursa")).toBe("Bursa'da");
    expect(locative("Samsun")).toBe("Samsun'da");
  });

  it("ince ünlüyle biten adlara -de ekler", () => {
    expect(locative("İzmir")).toBe("İzmir'de");
    expect(locative("Mersin")).toBe("Mersin'de");
    expect(locative("Eskişehir")).toBe("Eskişehir'de");
    expect(locative("Kayseri")).toBe("Kayseri'de");
  });

  it("sert ünsüzle biten adlarda -ta/-te kullanır", () => {
    expect(locative("Sinop")).toBe("Sinop'ta");
    expect(locative("Gaziantep")).toBe("Gaziantep'te");
    expect(locative("Uşak")).toBe("Uşak'ta");
    expect(locative("Bilecik")).toBe("Bilecik'te");
  });

  it("sıfat hâlini üretir", () => {
    expect(locativeAdj("İstanbul")).toBe("İstanbul'daki");
    expect(locativeAdj("İzmir")).toBe("İzmir'deki");
    expect(locativeAdj("Gaziantep")).toBe("Gaziantep'teki");
  });
});

describe("Türkçe büyük/küçük harf", () => {
  it("noktalı i harfini korur", () => {
    // JS'in toUpperCase()'i "i" → "I" yapar; Türkçede doğrusu "İ".
    expect(upperTr("geldi")).toBe("GELDİ");
    expect(upperTr("istanbul")).toBe("İSTANBUL");
    expect("geldi".toUpperCase()).not.toBe(upperTr("geldi"));
  });

  it("noktasız ı harfini korur", () => {
    expect(lowerTr("IŞIK")).toBe("ışık");
    expect(lowerTr("İSTANBUL")).toBe("istanbul");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  const ago = (ms: number) => timeAgo(new Date(now.getTime() - ms), now);

  it("çok yakın zamanı 'az önce' der", () => {
    expect(ago(10_000)).toBe("az önce");
  });

  it("bir dakikanın altını asla '0 dk önce' demez", () => {
    expect(ago(50_000)).toBe("az önce");
    expect(ago(59_000)).toBe("az önce");
  });

  it("gelecekteki tarihi 'az önce' sayar", () => {
    // Sunucu ile istemci saati arasındaki küçük fark negatif süre üretebilir.
    expect(timeAgo(new Date(now.getTime() + 5_000), now)).toBe("az önce");
  });

  it("dakika, saat ve günü ayırt eder", () => {
    expect(ago(12 * 60_000)).toBe("12 dk önce");
    expect(ago(3 * 3_600_000)).toBe("3 sa önce");
    expect(ago(26 * 3_600_000)).toBe("dün");
    expect(ago(5 * 86_400_000)).toBe("5 gün önce");
  });

  it("ay ve yılı özetler", () => {
    expect(ago(60 * 86_400_000)).toBe("2 ay önce");
    expect(ago(400 * 86_400_000)).toBe("1 yıl önce");
  });
});

describe("formatPrice", () => {
  it("Türk lirası biçiminde yazar", () => {
    const out = formatPrice(1890);
    // Ayraçlar ortama göre değişebilir; önemli olan rakamlar ve para birimi.
    expect(out).toContain("1.890");
    expect(out).toMatch(/₺|TRY/);
  });
});
