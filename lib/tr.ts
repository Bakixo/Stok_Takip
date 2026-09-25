/**
 * Türkçe metin yardımcıları.
 * Arayüzde ve maillerde doğru ek ve doğru büyük harf için.
 */

const BACK_VOWELS = "aıouâû";
const FRONT_VOWELS = "eiöüî";
/** Sert ünsüzler — ek "d" yerine "t" ile başlar. */
const VOICELESS = "fstkçşhp";

/** Kelimedeki son ünlüyü bulur; ek uyumu buna göre belirlenir. */
function lastVowel(word: string): string | null {
  const w = word.toLocaleLowerCase("tr");
  for (let i = w.length - 1; i >= 0; i--) {
    const ch = w[i]!;
    if (BACK_VOWELS.includes(ch) || FRONT_VOWELS.includes(ch)) return ch;
  }
  return null;
}

/**
 * Özel ada bulunma hâli eki ekler: "İstanbul" → "İstanbul'da".
 * Özel adlarda ek kesme işaretiyle ayrılır.
 */
export function locative(properNoun: string): string {
  const v = lastVowel(properNoun);
  const back = v === null || BACK_VOWELS.includes(v);
  const lastLetter = properNoun.at(-1)?.toLocaleLowerCase("tr") ?? "";
  const d = VOICELESS.includes(lastLetter) ? "t" : "d";
  return `${properNoun}'${d}${back ? "a" : "e"}`;
}

/**
 * "İstanbul" → "İstanbul'daki". Sıfat hâli.
 */
export function locativeAdj(properNoun: string): string {
  return `${locative(properNoun)}ki`;
}

/**
 * Türkçe büyük harf. JS'in toUpperCase()'i "i" harfini "I" yapar;
 * Türkçede doğrusu "İ".
 */
export function upperTr(s: string): string {
  return s.toLocaleUpperCase("tr");
}

/** Türkçe küçük harf ("I" → "ı"). */
export function lowerTr(s: string): string {
  return s.toLocaleLowerCase("tr");
}

/** Göreli zaman: "12 dk önce", "3 sa önce", "dün". */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  // Gelecekteki bir tarih (saat farkı) "az önce" sayılır.
  if (seconds < 45) return "az önce";
  const minutes = Math.floor(seconds / 60);
  // 45–59 sn aralığı 0 dakikaya yuvarlanır; "0 dk önce" demek yerine.
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "dün";
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  return `${Math.floor(months / 12)} yıl önce`;
}

/** Fiyatı Türk lirası biçiminde yazar. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}
