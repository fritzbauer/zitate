const CACHE_NAME = 'zitate-pwa-v1';
const OFFLINE_URLS = [
  './',
  'index.html',
  'manifest.json',
  // technical files
  'technical/app.js',
  'technical/clipboard.js',
  'technical/database.js',
  'technical/search_logic.js',
  'technical/snowball_languages.json',
  'technical/sql-wasm.js',
  'technical/sql-wasm.wasm',
  'technical/styles.css',
  'technical/ui.js',
  // icons
  'technical/icons/icon-72.png',
  'technical/icons/icon-144.png',
  'technical/icons/icon-192.png',
  'technical/icons/icon-256.png',
  'technical/icons/icon-384.png',
  'technical/icons/icon-512.png',
  'technical/icons/icon.png',
  'technical/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
