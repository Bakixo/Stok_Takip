/**
 * Zara'ya giden tüm istekler buradan geçer.
 *
 * Kurallar:
 *  - Aynı anda tek istek (eşzamanlılık 1) ve istekler arasında zorunlu bekleme.
 *  - Gerçekçi tarayıcı header'ları.
 *  - Geçici hatalarda üstel geri çekilme; kalıcı engelde (403) hemen pes et.
 */

/** Zara'nın engellediği ya da hata döndürdüğü durumlar için tipli hata. */
export class ZaraError extends Error {
  constructor(
    message: string,
    readonly kind: "blocked" | "not_found" | "http" | "network" | "parse",
    readonly status?: number,
  ) {
    super(message);
    this.name = "ZaraError";
  }

  /** Bot engeli mi? Worker bunu görürse turu durdurur. */
  get isBlocked(): boolean {
    return this.kind === "blocked";
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  Referer: "https://www.zara.com/tr/tr/",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * İstekler arası bekleme: sabit taban + rastgele pay.
 *
 * Ortam değişkenleri her çağrıda okunur (modül yüklenirken değil) — böylece
 * testler beklemeyi sıfırlayabilir ve süreç yeniden başlatmadan ayarlanabilir.
 */
function jitter(): number {
  const min = Number(process.env.ZARA_MIN_GAP_MS ?? 2000);
  const spread = Number(process.env.ZARA_JITTER_MS ?? 6000);
  return min + Math.random() * spread;
}

/**
 * Tek şeritli istek kuyruğu: aynı anda yalnızca bir istek gider ve
 * ardışık istekler arasında rastgele bir bekleme uygulanır.
 */
let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const waited = Date.now() - lastRequestAt;
    const need = jitter() - waited;
    if (need > 0) await sleep(need);
    try {
      return await task();
    } finally {
      lastRequestAt = Date.now();
    }
  });
  // Kuyruğun bir hata yüzünden kopmasını engelle.
  chain = run.catch(() => undefined);
  return run as Promise<T>;
}

interface FetchOptions {
  /** Toplam deneme sayısı (ilk deneme dahil). */
  retries?: number;
  timeoutMs?: number;
  /** Bu isteğe özel Referer. */
  referer?: string;
}

/** Cevabın Akamai engeli olup olmadığını anlar. */
function detectBlock(status: number, body: string): boolean {
  if (status === 403) return true;
  const head = body.slice(0, 600);
  return /Access Denied|errors\.edgesuite|bm-verify|_sec\/verify/i.test(head);
}

/**
 * Zara'dan JSON çeker. Kuyruğa girer, hata durumunda geri çekilerek tekrar dener.
 */
export async function zaraFetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const { retries = 3, timeoutMs = 20_000, referer } = opts;

  let lastError: ZaraError | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    // Her deneme kuyruktan ayrı geçer; böylece tekrarlar da hız sınırına uyar.
    const outcome = await enqueue(async (): Promise<{ ok: true; data: T } | { ok: false; err: ZaraError }> => {
      try {
        const res = await fetch(url, {
          headers: referer ? { ...BASE_HEADERS, Referer: referer } : BASE_HEADERS,
          signal: AbortSignal.timeout(timeoutMs),
        });
        const text = await res.text();

        if (detectBlock(res.status, text)) {
          return { ok: false, err: new ZaraError("Zara isteği engelledi (bot koruması)", "blocked", res.status) };
        }
        if (res.status === 404) {
          return { ok: false, err: new ZaraError("Kaynak bulunamadı", "not_found", 404) };
        }
        if (!res.ok) {
          return { ok: false, err: new ZaraError(`Zara ${res.status} döndürdü`, "http", res.status) };
        }
        try {
          return { ok: true, data: JSON.parse(text) as T };
        } catch {
          return { ok: false, err: new ZaraError("Cevap JSON olarak çözümlenemedi", "parse", res.status) };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, err: new ZaraError(`Ağ hatası: ${msg}`, "network") };
      }
    });

    if (outcome.ok) return outcome.data;
    lastError = outcome.err;

    // Engel ve 404 kalıcıdır; tekrar denemenin anlamı yok.
    if (outcome.err.isBlocked || outcome.err.kind === "not_found") break;

    if (attempt < retries) {
      // Üstel geri çekilme: 2sn, 4sn, 8sn (+ rastgele pay)
      await sleep(2 ** attempt * 1000 + Math.random() * 1000);
    }
  }

  throw lastError ?? new ZaraError("Bilinmeyen hata", "network");
}
