// Günlük Xərclər — Service Worker
// Yalnız tətbiqin öz faylını (HTML/manifest/ikonlar) offline üçün keşləyir.
// Google Drive / Chart.js / Firebase kimi xarici sorğulara toxunmur —
// onlar həmişə şəbəkədən (internet varsa) çəkilir.

// VACİB: Hər yeni versiya buraxdıqda bu adı artır (v2 → v3 → v4 ...).
// Bu, köhnə keşin avtomatik təmizlənməsini təmin edir.
const CACHE_ADI = 'gider-takibi-cache-v2';

const KESLENECEK_FAYLLAR = [
  './kanan.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => {
      // Hər faylı AYRI-AYRI yüklə: biri uğursuz olsa, digərləri keşlənə bilsin.
      // (addAll istifadə etsək, bir fayl tapılmasa HAMI uğursuz olurdu.)
      return Promise.all(
        KESLENECEK_FAYLLAR.map((f) =>
          cache.add(f).catch((e) => console.warn('[SW] Keş xətası:', f, e))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((adlar) =>
      Promise.all(adlar.filter((ad) => ad !== CACHE_ADI).map((ad) => caches.delete(ad)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Yalnız öz origin-imizdəki GET sorğularını keşlə; xarici (Google, CDN) sorğulara toxunma.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // HTML naviqasiya sorğuları üçün NETWORK-FIRST strategiyası:
  // Əvvəlcə şəbəkədən yeni versiyanı çək. Uğursuz olsa, keşdən ver.
  // Bu, istifadəçinin köhnə versiyada ilişib qalmasının qarşısını alır.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((cavab) => {
          if (cavab && cavab.ok) {
            const kopya = cavab.clone();
            caches.open(CACHE_ADI).then((cache) => cache.put(event.request, kopya));
          }
          return cavab;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./kanan.html')))
    );
    return;
  }

  // Digər öz resurslarımız (manifest, ikonlar) üçün CACHE-FIRST.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const shebekeden = fetch(event.request)
        .then((cavab) => {
          if (cavab && cavab.ok) {
            const kopya = cavab.clone();
            caches.open(CACHE_ADI).then((cache) => cache.put(event.request, kopya));
          }
          return cavab;
        })
        .catch(() => cached);
      return cached || shebekeden;
    })
  );
});