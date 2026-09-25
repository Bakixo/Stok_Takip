# Stokta

Zara Türkiye'de beklediğin bedeni takip eden, stoğa girdiğinde e-posta gönderen
küçük bir web uygulaması. Telefondan kullanılmak üzere tasarlandı.

---

## Ne yapar

1. Zara ürün linkini ya da ürün kodunu (`8059/577/250`) yapıştırırsın.
2. Ürünün adı, görseli, fiyatı, renkleri ve bedenleri gelir.
3. Renk, beden ve şehir seçersin.
4. **Beden stoktaysa** doğrudan ürün sayfasına giden bir buton çıkar.
   **Stokta değilse** takibe alırsın.
5. Arka planda çalışan worker 15 dakikada bir kontrol eder; beden geldiğinde
   e-posta gönderir ve takibi kapatır.

### Bilinmesi gereken bir sınır

Zara'nın **mağaza bazlı stok** sorgusu dışarıya kapalı. Bu yüzden takip
**online stok** üzerinden çalışıyor. Şehir seçimi duruyor ve o şehirdeki Zara
mağazalarını adres + harita linkiyle gösteriyor, ama "şu mağazada var" bilgisi
verilemiyor. Ayrıntılar ve denenen yollar: [`FAZ0-RAPOR.md`](./FAZ0-RAPOR.md).

Zara'ya giden istekler seyrek ve insan benzeri: takip başına 15 dakikada bir,
istekler arası 2–8 saniye rastgele bekleme, aynı ürünü birden çok kişi
izliyorsa tek istek.

---

## Kurulum (Windows / PowerShell)

Gereken: **Node.js 20 veya üstü**.

```powershell
# 1. Bağımlılıklar
npm install

# 2. Ortam değişkenleri
Copy-Item .env.example .env
```

`.env` dosyasını aç ve doldur. En az şunlar gerekli:

| Değişken | Ne olmalı |
|---|---|
| `ACCESS_PIN` | Arkadaşının gireceği PIN (ör. `4821`) |
| `SESSION_SECRET` | Rastgele uzun bir dize (aşağıda üretme komutu var) |
| `SMTP_USER` | Gmail adresin |
| `SMTP_PASS` | Gmail **uygulama şifresi** (aşağıda) |
| `ADMIN_EMAIL` | Hata uyarılarının geleceği adres |
| `APP_URL` | Uygulamanın adresi (yerelde `http://localhost:3000`) |

`SESSION_SECRET` üretmek için:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sonra veritabanını kur ve çalıştır:

```powershell
# 3. Veritabanı (SQLite dosyası oluşur)
npm run db:push

# 4. Web + worker birlikte
npm run dev:all
```

`http://localhost:3000` açılır, PIN'i girersin.

Sadece web istersen `npm run dev`, sadece worker istersen `npm run worker`.

---

## Gmail uygulama şifresi alma

Gmail'in normal hesap şifresi SMTP'de çalışmaz; ayrı bir "uygulama şifresi"
gerekir.

1. [myaccount.google.com](https://myaccount.google.com) → **Güvenlik**.
2. **2 Adımlı Doğrulama**'yı aç (kapalıysa uygulama şifresi seçeneği çıkmaz).
3. Aynı sayfada **Uygulama şifreleri**'ne gir
   (doğrudan: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
4. Bir ad yaz (ör. `Stokta`) → **Oluştur**.
5. Çıkan **16 haneli** şifreyi `.env` içindeki `SMTP_PASS` alanına yapıştır.
   Boşluklu hâliyle (`abcd efgh ijkl mnop`) yapıştırabilirsin.

> Bu şifre yalnızca bir kez gösterilir. Kaybedersen yenisini üretirsin.

Test etmek için `.env` içinde `MAIL_DRY_RUN="true"` yaparsan mailler
gönderilmez, konsola yazılır.

---

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Web uygulaması (geliştirme) |
| `npm run worker` | Worker (cron ile sürekli) |
| `npm run dev:all` | İkisi birden |
| `npm run worker:once` | Worker'ı bir tur çalıştırıp çıkar |
| `npm run build` | Üretim derlemesi |
| `npm run start:all` | Üretim modunda web + worker (yerel) |
| `npm run start:prod` | Canlı giriş noktası: şemayı uygula + web + worker |
| `npm run db:push` | Şemayı veritabanına uygula |
| `npm run db:studio` | Veritabanını tarayıcıda gez |
| `npm test` | Birim testleri |
| `npm run email:preview` | Mail şablonlarını tarayıcıda önizle (port 3001) |
| `npm run typecheck` | TypeScript kontrolü |

Yardımcı betikler:

```powershell
# Hoş geldin mailini gönder (not .env içindeki WELCOME_NOTE'tan gelir)
npx tsx scripts/send-welcome.mts firuze@ornek.com
npx tsx scripts/send-welcome.mts firuze@ornek.com --dry   # göndermeden önizle

# Mailleri HTML olarak dosyaya çıkar
npx tsx scripts/preview-mails.mts

# Zara cevaplarını test fixture'ı olarak yeniden kaydet
node scripts/record-fixtures.mjs

# Hangi illerde Zara mağazası var, yeniden tespit et
node scripts/detect-store-cities.mjs
```

---

## Canlıya alma (Vercel — ücretsiz)

Vercel sürekli çalışan bir süreç barındırmaz, bu yüzden stok kontrolü
`node-cron` yerine bir uç noktadan tetiklenir: `/api/kontrol`. Ücretsiz bir
cron servisi bu adresi 15 dakikada bir çağırır. Aynı `runCheckCycle` kodu
çalışır; yalnızca tetikleyici değişir.

Toplam maliyet: **0 TL** (Vercel Hobby + Supabase Free + cron-job.org).

### 1. Veritabanı (Supabase)

Panelde üstteki **Connect** butonu → **Direct** sekmesi. İki adres lazım:

**Uygulama için — Transaction pooler (port 6543):**

```
postgresql://postgres.<ref>:<ŞİFRE>@aws-0-<bölge>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Serverless ortam çok sayıda kısa ömürlü bağlantı açar; Supabase bunun için
transaction pooler'ı öneriyor. `pgbouncer=true` Prisma'nın prepared statement
kullanmasını kapatır (transaction modu desteklemiyor), `connection_limit=1`
her fonksiyon örneğinin tek bağlantı açmasını sağlar.

**Tabloları oluşturmak için — Session pooler (port 5432):**

Tabloları bir kez kendi bilgisayarından oluşturursun, Vercel'de migration
çalışmaz:

```powershell
node scripts/test-db-connection.mjs
```

Session pooler adresini verirsin; betik bağlanır, tabloları kurar ve şemayı
yerel `sqlite` ayarına geri alır.

### 2. Cron sırrı

`/api/kontrol` uç noktasını korumak için bir sır üret:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub reposunu seç.
2. Framework otomatik **Next.js** algılanır; derleme ayarlarına dokunma.
3. **Environment Variables** bölümüne şunları gir:

   ```
   DATABASE_PROVIDER = postgresql
   DATABASE_URL      = (transaction pooler adresi, ?pgbouncer=true ile)
   ACCESS_PIN        = ...
   SESSION_SECRET    = ...
   SMTP_USER         = ...
   SMTP_PASS         = ...
   ADMIN_EMAIL       = ...
   MAIL_FROM_NAME    = Stokta
   MAIL_DRY_RUN      = false
   CRON_SECRET       = (2. adımdaki sır)
   APP_URL           = https://<proje>.vercel.app
   ```

   `APP_URL`'i Vercel'in vereceği adresle doldur. Adresi baştan bilmiyorsan
   önce deploy et, adresi gör, sonra değişkeni güncelleyip yeniden dağıt.

4. **Deploy**.

### 4. Cron kurulumu

[cron-job.org](https://cron-job.org) üzerinde ücretsiz hesap aç → **Create cronjob**:

| Alan | Değer |
|---|---|
| URL | `https://<proje>.vercel.app/api/kontrol` |
| Schedule | Every 15 minutes |
| Request method | GET |
| Header | `Authorization: Bearer <CRON_SECRET>` |

Header eklemek istemezsen adresin sonuna `?key=<CRON_SECRET>` de yazabilirsin;
uç nokta ikisini de kabul eder.

Kaydettikten sonra **Test run** ile dene. Şuna benzer bir cevap dönmeli:

```json
{"ok":true,"productCount":2,"foundCount":0,"errorCount":0,"durationMs":9310}
```

`401` alıyorsan sır uyuşmuyor. `productCount` hep 0 ise aktif takip yoktur.

### Süre sınırı

Vercel'in ücretsiz planında bir fonksiyon en fazla 300 saniye çalışır. Tur,
süre dolmadan durup kalan ürünleri bir sonraki tura bırakır — takipler en
eski kontrolden başlayarak sıralandığı için hiçbiri aç kalmaz. Cevaptaki
`skippedCount` kaç ürünün ertelendiğini söyler; sürekli sıfırdan büyükse
cron sıklığını artırabilirsin.

### Alternatif: Docker (Railway / Render / Fly)

Sürekli çalışan bir süreç barındırabilen bir platform kullanacaksan
`Dockerfile` hazır: web ve worker aynı konteynerde çalışır, `node-cron`
kendi içinde döner, `/api/kontrol` ve dış cron gerekmez.

Açılışta `scripts/start-production.mjs` çalışır: önce eksik ortam
değişkeni var mı kontrol eder, sonra `prisma db push` ile tabloları kurar,
ardından web ve worker'ı başlatır. Bu senaryoda **Session pooler** (port
5432) adresini kullan — `pgbouncer=true` gerekmez.

> Bu platformların ücretsiz planları bu uygulamaya yetmiyor: Railway'in
> Free planı ayda $1 kredi ve 0.5 GB veriyor (uygulama ~330 MB kullanıyor),
> Render'ın ücretsiz web servisi 15 dakika hareketsizlikte uykuya geçiyor.

---

## Telefonda ana ekrana ekleme

Uygulama PWA: ana ekrana eklenince tam ekran, kendi ikonuyla açılır.

**iPhone (Safari):**
1. Uygulamayı Safari'de aç.
2. Alttaki **Paylaş** simgesine (yukarı ok) dokun.
3. Listeyi kaydır, **Ana Ekrana Ekle** → **Ekle**.

**Android (Chrome):**
1. Uygulamayı Chrome'da aç.
2. Sağ üstteki **⋮** menüsüne dokun.
3. **Ana ekrana ekle** → **Yükle**.

PIN bir kez girilir, cihazda bir yıl hatırlanır.

---

## Proje yapısı

```
app/
  (korumali)/        PIN gerektiren sayfalar
    page.tsx           ana sayfa — arama + takip listesi
    urun/              ürün sayfası
    takiplerim/        takip listesi
    admin/             worker sağlığı
  giris/             PIN girişi
  takip/[id]/durdur/ mailden gelen "takibi durdur" linki
  api/
    bedenler/          bir rengin bedenleri + canlı stok
    magazalar/         şehirdeki Zara mağazaları
    kontrol/           stok kontrolünü dışarıdan tetikler (cron çağırır)
  actions/           takip oluştur / iptal et

lib/
  zara/              Zara istemcisi (http, client, types, cities)
  mail/              sendMail + React Email şablonları
  auth.ts            PIN oturumu
  env.ts             doğrulanmış ortam değişkenleri
  tr.ts              Türkçe ek ve biçim yardımcıları

worker/              cron kontrol döngüsü
prisma/              veri şeması
tests/               birim testleri + gerçek Zara cevapları (fixtures)
scripts/             tek seferlik yardımcı betikler
recon/               Faz 0 keşif betikleri (üretime dahil değil)
```

---

## Veri modeli

- **Watch** — bir "ürün + renk + beden" takibi. Durum: `ACTIVE` → `FOUND`
  (stok bulundu, mail gitti) ya da `CANCELLED`.
- **CheckLog** — her kontrolün sonucu. `/admin` sayfasındaki hata oranı
  buradan gelir.
- **WorkerRun** — her turun özeti; art arda başarısızlık buradan izlenir.

---

## Bakım notları

**Worker hata verirse.** Art arda 5 başarısız turdan sonra `ADMIN_EMAIL`
adresine uyarı gider. `/admin` sayfasında son turlar ve hata oranı görünür.

**Zara bir endpoint'i değiştirirse.** İstemci tek dosyada toplu:
`lib/zara/client.ts`. Testler kaydedilmiş gerçek cevaplara karşı çalıştığı
için (`tests/fixtures/`) bozulmayı erken yakalar. Cevap şekli değişmişse
`node scripts/record-fixtures.mjs` ile kayıtları tazele, testleri gözden geçir.

**Mail sağlayıcısını değiştirmek.** `lib/mail/providers/` altına yeni bir
dosya ekle ve `lib/mail/send.ts` içindeki `activeProvider` satırını değiştir.
Çağıran kodun hiçbiri değişmez.

**Mağaza listesi güncelleme.** Zara mağaza açar/kapatırsa
`node scripts/detect-store-cities.mjs` çalıştır; `lib/zara/cities.ts`
kendini günceller.

---

## Güvenlik

- Zara şifresi **hiçbir yerde istenmez ve saklanmaz**. Sepete ekleme, ürün
  sayfasına derin link ile yönlendirilerek yapılır.
- Gizli bilgilerin hepsi `.env` içinde; bu dosya git'e girmez.
- Oturum çerezi HMAC ile imzalanır, `httpOnly` ve üretimde `secure`.
- PIN değişirse eski oturumlar kendiliğinden düşer.
