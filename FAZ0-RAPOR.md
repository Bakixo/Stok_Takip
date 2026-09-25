# Faz 0 — Zara TR Endpoint Keşfi (Rapor)

Tarih: 25 Eylül 2026 · Test ürünü: `PİLİLİ POPLİN GÖMLEK` (8059/577, productId `580760534`)

## Özet

Ürün tarafı **tamamen çözüldü**: ad, görsel, fiyat, renkler, bedenler, SKU'lar ve
**beden bazında canlı stok** hiçbir bot koruması olmadan, düz `fetch` ile alınabiliyor.

**Mağaza bazında stok alınamıyor.** Zara bu tek endpoint'i sert bir Akamai WAF
kuralının arkasına koymuş; sunucudan da, otomasyonla sürülen gerçek Chrome'dan da
`403 Access Denied` dönüyor.

## Türkiye sabitleri

App shell (`window.zara.appConfig`) içinden doğrulandı:

| Sabit | Değer |
|---|---|
| `storeId` | `11766` |
| `catalogId` | `33054` |
| `langId` | `240` |
| locale | `tr_TR` |

## Çalışan endpoint'ler

Hepsi çerezsiz, oturumsuz, düz `fetch` ile `200` döndü.

### 1. Referanstan ürün çözümleme — **Türkçe isimler burada**

```
GET /itxrest/1/search/store/11766/reference
    ?reference=08059577&locale=tr_TR&scope=default&origin=search&ajax=true
```

```json
{ "status": "SUCCESS", "results": [{ "content": {
  "id": 580756904, "name": "PİLİLİ POPLİN GÖMLEK", "price": 189000,
  "familyName": "GÖMLEK",
  "detail": { "displayReference": "8059/577",
    "colors": [{ "id": "250", "name": "Beyaz", "productId": 580760534, "xmedia": [...] }] },
  "seo": { "keyword": "pilili-poplin-gomlek", "seoProductId": "08059577" }
}}]}
```

Hem kullanıcı ürün kodu (`8059/577/250`) yazdığında hem de link yapıştırdığında
bu çağrı kullanılacak. Fiyat kuruş cinsinden (`189000` = 1.890,00 TL).

### 2. Ürün detayı — bedenler ve SKU'lar

```
GET /api/storefront/1/stores/11766/products/id/580760534
```

`sizes[]` → `identifier.sku`, `nomenclature.name` (XS/S/M/L/XL), `availability`, `pricing`.
Ayrıca `color` (hex kodu dahil), `media[]` (görsel URL'leri), `seo`.

> ⚠️ Bu endpoint ürün adını **İngilizce** döndürüyor ve `locale`/`languageId`/
> `Accept-Language` parametrelerinin hiçbiri bunu değiştirmiyor. Bu yüzden Türkçe
> ad/renk için (1) numaralı endpoint kaynak alınacak, bedenler buradan gelecek.

### 3. Canlı stok — worker'ın kullanacağı asıl çağrı

```
GET /api/storefront/1/stores/11766/products/id/580760534/availability
```

```json
{"sizes":[{"sku":580756907,"availability":"in_stock","colorId":"250"}, ...]}
```

Sadece **311 bayt**. Periyodik kontrol için ideal.

**Availability sözlüğü** (40 ürün / 275 beden taranarak doğrulandı):

| Değer | Görülme |
|---|---|
| `in_stock` | 166 |
| `out_of_stock` | 52 |
| `low_on_stock` | 31 |
| `coming_soon` | 26 |

### 4. Şehir bazında mağaza listesi

```
GET /itxrest/1/bam/store/11766/physical-store
    ?latitude=41.0082&longitude=28.9784&languageId=240&appId=1
```

Koordinata en yakın mağazaları döndürüyor: `id`, `addressLines`, `city`, `latitude`,
`longitude`, `sections`, `phones`, `openingHours`, `stockThreshold`.
Doğrulandı: İstanbul 23, Ankara 5, İzmir 3 mağaza.

> Yanıtta mağaza **adı alanı yok** — etiket olarak `addressLines[0]` kullanılacak
> (örn. "ŞİŞLİ TEŞVİKİYE CADDESİ, 41").

### 5. Kategori ağacı ve ürün listesi (yardımcı)

```
GET /tr/tr/categories?ajax=true                  → 1.746 yaprak kategori
GET /tr/tr/category/{categoryId}/products?ajax=true  → Türkçe adlarla ürün gridi
```

## Engellenen endpoint'ler

| Endpoint | Sonuç | Not |
|---|---|---|
| `/tr/tr/store-product-availability?productId=…&physicalStoreIds=…` | **403 Akamai** | **Mağaza bazlı stok — asıl istediğimiz** |
| `/tr/tr/products-details?productIds=…` | 403 Akamai | (2) ile ikame edildi |
| `/tr/tr/{slug}-p{ref}.html` (PDP HTML) | Akamai interstitial | JSON API'lerle ikame edildi |
| `/itxrest/1/bam/…/physical-store/product/availability` | 404 gateway | Config'de yazıyor ama gateway yönlendirmiyor |

### Mağaza stoğu neden alınamıyor

Zara'nın kendi arayüzünde bu özellik var ("MAĞAZADAKİ STOK DURUMU" → beden seç →
"STOK DURUMUNU SORGULA"). Gerçek Chrome'da bu akışı çalıştırıp isteği yakaladım:

```
GET /tr/tr/store-product-availability?productId=580760534
    &physicalStoreIds=16004&physicalStoreIds=9280&…(23 mağaza)&ajax=true
→ 403 Access Denied (Akamai, errors.edgesuite.net)
```

Akamai interstitial'ı çözmüş, geçerli çerezleri olan gerçek Chrome bile bu yoldan
403 aldı. Korumasız bir `/api/storefront/` muadili aradım — 11 varyant denendi,
hiçbiri yok. Bu, bilinçli ve hedefli bir anti-scraping kuralı.

Bunu aşmak Akamai'nin bot tespitini atlatmak anlamına gelir; bu yola girmedim.

## Riskler

- **Tek nokta bağımlılığı:** `/api/storefront/` görece yeni bir namespace. Zara bunu
  da WAF arkasına alırsa ürün/stok akışı durur. Azaltma: istemciyi tek modülde
  topla, 403'te admin'e uyarı maili at.
- **Yerelleştirme:** Türkçe ad tek bir endpoint'ten (referans arama) geliyor.
- **Nezaket:** Bugün ~120 istek attım, hiç engel yemedim. Yine de planladığın
  15–30 dk aralık + jitter + ürün bazlı dedupe fazlasıyla güvenli.

## Karar gerektiren nokta

Mağaza bazlı stok alınamadığı için uygulamanın kapsamı için üç seçenek var:

1. **Online stok takibi** — Beden bazında online stoğu izle, gelince mail at.
   Tamamen çalışıyor, sağlam, bugün kurulabilir.
2. **Online + mağaza listesi** — Yukarıdakine ek olarak, seçilen şehirdeki Zara
   mağazalarını adres/harita linkiyle göster (stok durumu olmadan, "bu şehirde şu
   mağazalar var" bilgisi olarak).
3. **Yarı otomatik mağaza kontrolü** — Worker içinde gerçek tarayıcı (Playwright)
   çalıştırıp mağaza panelini sürmek. Bugünkü testte 403 aldı; çalışması için bot
   tespitini atlatmak gerekir. **Önermiyorum.**

Önerim: **2 numara.** Uygulamanın asıl vaadi ("istediğin beden gelince haber ver")
online stokla eksiksiz karşılanıyor; mağaza listesi de şehir bağlamını koruyor.
