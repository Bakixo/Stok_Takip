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

Toplam maliyet: **0 TL** (Vercel Hobby + Supabase Free + Cloudflare Workers +
cron-job.org).

### Neden bu kurulum böyle — okumadan değiştirme

Zara'nın bot koruması (Akamai) **veri merkezi IP'lerini engelliyor**. Ölçüldü:

| Nereden | Zara |
|---|---|
| Ev bağlantısı (Türkiye) | 200 |
| Vercel — AWS Virginia (`iad1`) | 403 |
| Vercel — AWS Frankfurt (`fra1`) | 403 |
| GitHub Actions (Azure) | 200 |
| Cloudflare — Paris (CDG) | 403 |
| Cloudflare — İstanbul (IST) | 200 |
| **Cloudflare — Stockholm (ARN)** | **200** |

Bu yüzden iki şey yapılıyor:

1. **Zara istekleri Cloudflare Worker'ı üzerinden geçiyor** (`cloudflare/zara-proxy.js`).
   Vercel'den Zara'ya doğrudan gidilemiyor.
2. **Vercel `arn1` (Stockholm) bölgesinde çalışıyor** (`vercel.json`). Bölge,
   Cloudflare'in hangi merkezinden çıkılacağını belirliyor; Frankfurt seçilirse
   Cloudflare Paris'ten çıkar ve Zara yine engeller.

> `vercel.json` içindeki `regions` değerini değiştirirsen Zara erişimi bozulabilir.
> Değiştirmen gerekirse `scripts/bolge-dene.mjs` ile yeni bölgeyi ölç.

Arka plan stok kontrolü `node-cron` yerine `/api/kontrol` ucundan tetikleniyor
(Vercel sürekli süreç barındırmaz); ücretsiz bir cron servisi bu adresi 15
dakikada bir çağırıyor. Aynı `runCheckCycle` kodu çalışır.

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

### 2. Cloudflare aracısı

Zara isteklerinin geçeceği worker. CLI gerekmez:

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Start with Hello World!** → **Deploy**
2. **Edit code** → `cloudflare/zara-proxy.js` içeriğini yapıştır → **Deploy**
3. **Settings → Variables and Secrets** → tür **Secret**, ad `PROXY_KEY`,
   değer uzun rastgele bir dize → **Deploy**

Worker adresi Vercel'de `ZARA_PROXY_URL`, anahtar `ZARA_PROXY_SECRET` olacak.
İkisi Cloudflare'deki `PROXY_KEY` ile birebir aynı olmalı.

Aracının hem çalıştığını hem güvenli olduğunu sına:

```powershell
npx tsx scripts/test-proxy.mts https://<worker>.workers.dev <PROXY_KEY>
```

Anahtarsız istek 401, başka bir site 403 dönmeli — aracı yalnızca uygulamanın
kullandığı dört Zara adresine izin verir, açık proxy değildir.

Aracının hangi Cloudflare merkezinden çıktığını görmek için (anahtar gerekmez):

```
https://<worker>.workers.dev/?tani=1
```

### 3. Cron sırrı

`/api/kontrol` uç noktasını korumak için bir sır üret:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### 4. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub reposunu seç.
2. Framework otomatik **Next.js** algılanır; derleme ayarlarına dokunma.
3. **Environment Variables** bölümüne şunları gir:

   ```
   DATABASE_PROVIDER = postgresql
   DATABASE_URL      = (transaction pooler adresi, ?pgbouncer=true&connection_limit=1 ile)
   ACCESS_PIN        = ...
   SESSION_SECRET    = ...
   SMTP_HOST         = smtp.gmail.com
   SMTP_PORT         = 465
   SMTP_SECURE       = true
   SMTP_USER         = ...
   SMTP_PASS         = ...
   MAIL_REPLY_TO     = ...
   ADMIN_EMAIL       = ...
   MAIL_FROM_NAME    = Stokta
   MAIL_DRY_RUN      = false
   CRON_SECRET       = (3. adımdaki sır)
   APP_URL           = https://<proje>.vercel.app
   ZARA_PROXY_URL    = https://<worker>.workers.dev
   ZARA_PROXY_SECRET = (Cloudflare'deki PROXY_KEY ile aynı)
   ```

   `APP_URL`'i Vercel'in vereceği adresle doldur. Adresi baştan bilmiyorsan
   önce deploy et, adresi gör, sonra değişkeni güncelleyip yeniden dağıt.

   > Kutuları **boş bırakma**. Varsayılanlar yalnızca değişken hiç tanımlı
   > değilse devreye giriyor; boş bir değer varsayılanı devre dışı bırakır
   > (ör. `SMTP_PORT` boşsa 465 yerine 0 olur ve mail gitmez).

4. **Deploy**.

### 5. Cron kurulumu

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
  PIN değişirse eski oturumlar kendiliğinden düşer.
- **PIN en az 6 hane** olmalı; `lib/env.ts` bunu zorunlu tutar. 4 hane yalnızca
  10.000 olasılık demek ve kaba kuvvetle denenebiliyor.
- **Takipler kişiye bağlı.** Uygulamayı birden fazla kişi aynı PIN'le
  kullanabildiği için bütün sorgular bildirim adresine göre filtrelenir;
  kimse başkasının takibini göremez veya silemez.
- **Bildirim adresi istemciden alınmaz.** Girişte bir kez sorulup imzalı
  çerezte tutulur; takip oluşturulurken sunucu onu çerezten okur. Aksi hâlde
  PIN'i bilen biri istediği adrese bildirim kurabilirdi.
- **`/admin` yalnızca `ADMIN_EMAIL` sahibine açık.** PIN ortak olduğu için tek
  başına yetmiyor; yetkisiz kullanıcıya 404 döner.
- Cloudflare aracısı hem anahtarla korunur hem de yalnızca uygulamanın
  kullandığı dört Zara adresine izin verir — açık proxy değildir.
- Maildeki "takibi durdur" linki kimlik sormaz (tek tıkla çalışsın diye);
  yapabildiği tek şey o takibi durdurmaktır.
