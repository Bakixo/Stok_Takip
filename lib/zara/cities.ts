/**
 * Türkiye'nin 81 ili ve il merkezi koordinatları.
 *
 * `hasStore` alanı, `scripts/detect-store-cities.mjs` tarafından Zara'nın mağaza
 * API'sine sorularak belirlenir; elle tahmin edilmez. Mağazası olan iller
 * arayüzde listenin başında gösterilir.
 */

export interface City {
  /** Arama ve URL için sadeleştirilmiş ad. */
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Bu ilde (ya da çok yakınında) Zara mağazası var mı? */
  hasStore: boolean;
  /** Tespit anında bulunan mağaza sayısı. */
  storeCount: number;
}

/** Türkçe arama için: büyük/küçük ve aksan farklarını siler. */
export function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]/g, "");
}

export const CITIES: City[] = [
  { slug: "adana", name: "Adana", latitude: 37.0, longitude: 35.3213, hasStore: true, storeCount: 1 },
  { slug: "adiyaman", name: "Adıyaman", latitude: 37.7648, longitude: 38.2786, hasStore: false, storeCount: 0 },
  { slug: "afyonkarahisar", name: "Afyonkarahisar", latitude: 38.7507, longitude: 30.5567, hasStore: false, storeCount: 0 },
  { slug: "agri", name: "Ağrı", latitude: 39.7191, longitude: 43.0503, hasStore: false, storeCount: 0 },
  { slug: "aksaray", name: "Aksaray", latitude: 38.3687, longitude: 34.037, hasStore: false, storeCount: 0 },
  { slug: "amasya", name: "Amasya", latitude: 40.6499, longitude: 35.8353, hasStore: false, storeCount: 0 },
  { slug: "ankara", name: "Ankara", latitude: 39.9334, longitude: 32.8597, hasStore: true, storeCount: 5 },
  { slug: "antalya", name: "Antalya", latitude: 36.8969, longitude: 30.7133, hasStore: true, storeCount: 2 },
  { slug: "ardahan", name: "Ardahan", latitude: 41.1105, longitude: 42.7022, hasStore: false, storeCount: 0 },
  { slug: "artvin", name: "Artvin", latitude: 41.1828, longitude: 41.8183, hasStore: false, storeCount: 0 },
  { slug: "aydin", name: "Aydın", latitude: 37.856, longitude: 27.8416, hasStore: false, storeCount: 0 },
  { slug: "balikesir", name: "Balıkesir", latitude: 39.6484, longitude: 27.8826, hasStore: false, storeCount: 0 },
  { slug: "bartin", name: "Bartın", latitude: 41.6344, longitude: 32.3375, hasStore: false, storeCount: 0 },
  { slug: "batman", name: "Batman", latitude: 37.8812, longitude: 41.1351, hasStore: false, storeCount: 0 },
  { slug: "bayburt", name: "Bayburt", latitude: 40.2552, longitude: 40.2249, hasStore: false, storeCount: 0 },
  { slug: "bilecik", name: "Bilecik", latitude: 40.1451, longitude: 29.9799, hasStore: false, storeCount: 0 },
  { slug: "bingol", name: "Bingöl", latitude: 38.8847, longitude: 40.4986, hasStore: false, storeCount: 0 },
  { slug: "bitlis", name: "Bitlis", latitude: 38.3938, longitude: 42.1232, hasStore: false, storeCount: 0 },
  { slug: "bolu", name: "Bolu", latitude: 40.576, longitude: 31.5788, hasStore: false, storeCount: 0 },
  { slug: "burdur", name: "Burdur", latitude: 37.7205, longitude: 30.2903, hasStore: false, storeCount: 0 },
  { slug: "bursa", name: "Bursa", latitude: 40.1885, longitude: 29.061, hasStore: true, storeCount: 2 },
  { slug: "canakkale", name: "Çanakkale", latitude: 40.1553, longitude: 26.4142, hasStore: false, storeCount: 0 },
  { slug: "cankiri", name: "Çankırı", latitude: 40.6013, longitude: 33.6134, hasStore: false, storeCount: 0 },
  { slug: "corum", name: "Çorum", latitude: 40.5506, longitude: 34.9556, hasStore: false, storeCount: 0 },
  { slug: "denizli", name: "Denizli", latitude: 37.7765, longitude: 29.0864, hasStore: false, storeCount: 0 },
  { slug: "diyarbakir", name: "Diyarbakır", latitude: 37.9144, longitude: 40.2306, hasStore: false, storeCount: 0 },
  { slug: "duzce", name: "Düzce", latitude: 40.8438, longitude: 31.1565, hasStore: false, storeCount: 0 },
  { slug: "edirne", name: "Edirne", latitude: 41.6818, longitude: 26.5623, hasStore: false, storeCount: 0 },
  { slug: "elazig", name: "Elazığ", latitude: 38.681, longitude: 39.2264, hasStore: false, storeCount: 0 },
  { slug: "erzincan", name: "Erzincan", latitude: 39.75, longitude: 39.5, hasStore: false, storeCount: 0 },
  { slug: "erzurum", name: "Erzurum", latitude: 39.9043, longitude: 41.2679, hasStore: false, storeCount: 0 },
  { slug: "eskisehir", name: "Eskişehir", latitude: 39.7767, longitude: 30.5206, hasStore: true, storeCount: 1 },
  { slug: "gaziantep", name: "Gaziantep", latitude: 37.0662, longitude: 37.3833, hasStore: false, storeCount: 0 },
  { slug: "giresun", name: "Giresun", latitude: 40.9128, longitude: 38.3895, hasStore: false, storeCount: 0 },
  { slug: "gumushane", name: "Gümüşhane", latitude: 40.4386, longitude: 39.5086, hasStore: false, storeCount: 0 },
  { slug: "hakkari", name: "Hakkâri", latitude: 37.5744, longitude: 43.7408, hasStore: false, storeCount: 0 },
  { slug: "hatay", name: "Hatay", latitude: 36.2025, longitude: 36.1606, hasStore: false, storeCount: 0 },
  { slug: "igdir", name: "Iğdır", latitude: 39.9237, longitude: 44.045, hasStore: false, storeCount: 0 },
  { slug: "isparta", name: "Isparta", latitude: 37.7648, longitude: 30.5566, hasStore: false, storeCount: 0 },
  { slug: "istanbul", name: "İstanbul", latitude: 41.0082, longitude: 28.9784, hasStore: true, storeCount: 23 },
  { slug: "izmir", name: "İzmir", latitude: 38.4237, longitude: 27.1428, hasStore: true, storeCount: 3 },
  { slug: "kahramanmaras", name: "Kahramanmaraş", latitude: 37.5858, longitude: 36.9371, hasStore: false, storeCount: 0 },
  { slug: "karabuk", name: "Karabük", latitude: 41.2061, longitude: 32.6204, hasStore: false, storeCount: 0 },
  { slug: "karaman", name: "Karaman", latitude: 37.1759, longitude: 33.2287, hasStore: false, storeCount: 0 },
  { slug: "kars", name: "Kars", latitude: 40.6167, longitude: 43.1, hasStore: false, storeCount: 0 },
  { slug: "kastamonu", name: "Kastamonu", latitude: 41.3887, longitude: 33.7827, hasStore: false, storeCount: 0 },
  { slug: "kayseri", name: "Kayseri", latitude: 38.7312, longitude: 35.4787, hasStore: false, storeCount: 0 },
  { slug: "kilis", name: "Kilis", latitude: 36.7184, longitude: 37.1212, hasStore: false, storeCount: 0 },
  { slug: "kirikkale", name: "Kırıkkale", latitude: 39.8468, longitude: 33.5153, hasStore: false, storeCount: 0 },
  { slug: "kirklareli", name: "Kırklareli", latitude: 41.7333, longitude: 27.2167, hasStore: false, storeCount: 0 },
  { slug: "kirsehir", name: "Kırşehir", latitude: 39.1425, longitude: 34.1709, hasStore: false, storeCount: 0 },
  { slug: "kocaeli", name: "Kocaeli", latitude: 40.8533, longitude: 29.8815, hasStore: false, storeCount: 0 },
  { slug: "konya", name: "Konya", latitude: 37.8667, longitude: 32.4833, hasStore: false, storeCount: 0 },
  { slug: "kutahya", name: "Kütahya", latitude: 39.4167, longitude: 29.9833, hasStore: false, storeCount: 0 },
  { slug: "malatya", name: "Malatya", latitude: 38.3552, longitude: 38.3095, hasStore: false, storeCount: 0 },
  { slug: "manisa", name: "Manisa", latitude: 38.6191, longitude: 27.4289, hasStore: false, storeCount: 0 },
  { slug: "mardin", name: "Mardin", latitude: 37.3212, longitude: 40.7245, hasStore: false, storeCount: 0 },
  { slug: "mersin", name: "Mersin", latitude: 36.8, longitude: 34.6333, hasStore: true, storeCount: 1 },
  { slug: "mugla", name: "Muğla", latitude: 37.2153, longitude: 28.3636, hasStore: false, storeCount: 0 },
  { slug: "mus", name: "Muş", latitude: 38.9462, longitude: 41.7539, hasStore: false, storeCount: 0 },
  { slug: "nevsehir", name: "Nevşehir", latitude: 38.6939, longitude: 34.6857, hasStore: false, storeCount: 0 },
  { slug: "nigde", name: "Niğde", latitude: 37.9667, longitude: 34.6833, hasStore: false, storeCount: 0 },
  { slug: "ordu", name: "Ordu", latitude: 40.9839, longitude: 37.8764, hasStore: false, storeCount: 0 },
  { slug: "osmaniye", name: "Osmaniye", latitude: 37.213, longitude: 36.1763, hasStore: false, storeCount: 0 },
  { slug: "rize", name: "Rize", latitude: 41.0201, longitude: 40.5234, hasStore: false, storeCount: 0 },
  { slug: "sakarya", name: "Sakarya", latitude: 40.7569, longitude: 30.3783, hasStore: false, storeCount: 0 },
  { slug: "samsun", name: "Samsun", latitude: 41.2867, longitude: 36.33, hasStore: true, storeCount: 1 },
  { slug: "sanliurfa", name: "Şanlıurfa", latitude: 37.1591, longitude: 38.7969, hasStore: false, storeCount: 0 },
  { slug: "siirt", name: "Siirt", latitude: 37.9333, longitude: 41.95, hasStore: false, storeCount: 0 },
  { slug: "sinop", name: "Sinop", latitude: 42.0231, longitude: 35.1531, hasStore: false, storeCount: 0 },
  { slug: "sirnak", name: "Şırnak", latitude: 37.4187, longitude: 42.4918, hasStore: false, storeCount: 0 },
  { slug: "sivas", name: "Sivas", latitude: 39.7477, longitude: 37.0179, hasStore: false, storeCount: 0 },
  { slug: "tekirdag", name: "Tekirdağ", latitude: 40.9833, longitude: 27.5167, hasStore: false, storeCount: 0 },
  { slug: "tokat", name: "Tokat", latitude: 40.3167, longitude: 36.5544, hasStore: false, storeCount: 0 },
  { slug: "trabzon", name: "Trabzon", latitude: 41.0015, longitude: 39.7178, hasStore: false, storeCount: 0 },
  { slug: "tunceli", name: "Tunceli", latitude: 39.3074, longitude: 39.4388, hasStore: false, storeCount: 0 },
  { slug: "usak", name: "Uşak", latitude: 38.6823, longitude: 29.4082, hasStore: false, storeCount: 0 },
  { slug: "van", name: "Van", latitude: 38.4891, longitude: 43.4089, hasStore: false, storeCount: 0 },
  { slug: "yalova", name: "Yalova", latitude: 40.65, longitude: 29.2667, hasStore: false, storeCount: 0 },
  { slug: "yozgat", name: "Yozgat", latitude: 39.8181, longitude: 34.8147, hasStore: false, storeCount: 0 },
  { slug: "zonguldak", name: "Zonguldak", latitude: 41.4564, longitude: 31.7987, hasStore: false, storeCount: 0 },
];

export function findCity(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

/** Mağazası olan iller üstte, sonra alfabetik. */
export function sortedCities(): City[] {
  return [...CITIES].sort((a, b) => {
    if (a.hasStore !== b.hasStore) return a.hasStore ? -1 : 1;
    return a.name.localeCompare(b.name, "tr");
  });
}

/** Arama kutusu için basit filtre. */
export function searchCities(query: string): City[] {
  const q = normalizeTr(query);
  if (!q) return sortedCities();
  return sortedCities().filter((c) => normalizeTr(c.name).includes(q));
}
