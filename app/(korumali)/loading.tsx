/**
 * Sekmeler arası geçişte anında görünen iskelet.
 *
 * Bu dosya olmadan Next.js, sunucu veriyi döndürene kadar eski sayfada
 * bekliyor ve geçiş "donmuş" gibi hissettiriyor. Burada geçiş anında
 * oluyor, veri gelene kadar parıltılı iskelet duruyor.
 */
export default function Loading() {
  return (
    <div className="space-y-12 pt-6" aria-busy="true" aria-label="Yükleniyor">
      {/* Başlık */}
      <div className="space-y-3">
        <div className="shimmer h-10 w-3/4" />
        <div className="shimmer h-10 w-1/2" />
      </div>

      {/* Giriş alanı / içerik bloğu */}
      <div className="shimmer h-14 w-full" />

      {/* Liste satırları */}
      <div className="border-border divide-border divide-y border-t">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 py-4">
            <div className="shimmer h-24 w-[4.5rem] shrink-0" />
            <div className="flex-1 space-y-2.5 pt-1">
              <div className="shimmer h-4 w-2/3" />
              <div className="shimmer h-3.5 w-1/3" />
              <div className="shimmer h-3.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
