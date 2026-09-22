// Günlük Xərclər — Service Worker
// Yalnız tətbiqin öz faylını (HTML/manifest/ikonlar) offline üçün keşləyir.
// Google Drive / Chart.js / Firebase kimi xarici sorğulara toxunmur —
// onlar həmişə şəbəkədən (internet varsa) çəkilir.

// VACİB: Hər yeni versiya buraxdıqda bu adı artır (v3 → v4 → v5 ...).
// Bu, köhnə keşin avtomatik təmizlənməsini təmin edir.
const CACHE_ADI = 'gider-takibi-cache-v7';

const KESLENECEK_FAYLLAR = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => {
      // Hər faylı AYRI-AYRI yüklə: biri uğursuz olsa, digərləri keşlənə bilsin.
      return Promise.all(
        KESLENECEK_FAYLLAR.map((f) =>
          cache.add(new Request(f, { cache: 'reload' })).catch((e) => console.warn('[SW] Keş xətası:', f, e))
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

  // HTML naviqasiya sorğuları üçün NETWORK-FIRST:
  // GitHub Pages cavabı brauzerin HTTP keşində ~10 dəq saxlaya bilər, ona görə
  // cache:'no-store' ilə HƏMİŞƏ serverdən təzə versiyanı çəkirik.
  // Yalnız internet yoxdursa keşdən veririk.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request.url, { cache: 'no-store' })
        .then((cavab) => {
          if (cavab && cavab.ok) {
            const kopya = cavab.clone();
            caches.open(CACHE_ADI).then((cache) => cache.put('./index.html', kopya));
          }
          return cavab;
        })
        .catch(() => caches.match('./index.html'))
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
