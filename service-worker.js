const CACHE_NAME = 'zitate-pwa-v1';
const CACHE_MANIFEST_URL = 'cache-manifest.json';
const CACHE_MANIFEST_META_URL = '/__zitate_cache_manifest__';
const MANIFEST_CHECK_INTERVAL_MS = 60 * 1000;
let lastManifestCheck = 0;
let manifestSyncPromise = null;

const FALLBACK_CACHE_MANIFEST = {
  version: 1,
  files: [
    './',
    'index.html',
    'manifest.json',
    'import.html',
    'export.html',
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
  ]
};

function normalizeManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.files)) {
    return {
      version: String(FALLBACK_CACHE_MANIFEST.version),
      files: [...FALLBACK_CACHE_MANIFEST.files, CACHE_MANIFEST_URL]
    };
  }

  return {
    version: String(manifest.version ?? ''),
    files: [...new Set([...manifest.files, CACHE_MANIFEST_URL])]
  };
}

async function loadManifestFromServer() {
  try {
    const response = await fetch(`${CACHE_MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    return normalizeManifest(await response.json());
  } catch (error) {
    return normalizeManifest(FALLBACK_CACHE_MANIFEST);
  }
}

async function cacheFiles(cache, files) {
  await Promise.all(
    files.map(async file => {
      const request = new Request(file, { cache: 'no-cache' });
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
    })
  );
}

async function syncCacheWithManifest(force = false) {
  const now = Date.now();
  if (!force && manifestSyncPromise) return manifestSyncPromise;
  if (!force && now - lastManifestCheck < MANIFEST_CHECK_INTERVAL_MS) return Promise.resolve();
  lastManifestCheck = now;

  manifestSyncPromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const previousManifestResponse = await cache.match(CACHE_MANIFEST_META_URL);
    const previousManifest = previousManifestResponse ? await previousManifestResponse.json() : null;
    const nextManifest = await loadManifestFromServer();

    const hasChanged =
      !previousManifest ||
      previousManifest.version !== nextManifest.version ||
      JSON.stringify(previousManifest.files) !== JSON.stringify(nextManifest.files);

    if (!hasChanged) return;

    await cacheFiles(cache, nextManifest.files);

    if (previousManifest && Array.isArray(previousManifest.files)) {
      await Promise.all(
        previousManifest.files
          .filter(file => !nextManifest.files.includes(file))
          .map(file => cache.delete(file))
      );
    }

    await cache.put(
      CACHE_MANIFEST_META_URL,
      new Response(JSON.stringify(nextManifest), {
        headers: { 'content-type': 'application/json' }
      })
    );
  })().finally(() => {
    manifestSyncPromise = null;
  });

  return manifestSyncPromise;
}

self.addEventListener('install', event => {
  event.waitUntil(syncCacheWithManifest(true));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )
      ),
      syncCacheWithManifest(true)
    ])
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  event.waitUntil(syncCacheWithManifest(false));
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
