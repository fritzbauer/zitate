const CACHE_NAME = 'zitate-pwa-v1';
const CACHE_MANIFEST_URL = 'cache-manifest.json';
const CACHE_MANIFEST_META_URL = '/__zitate_cache_manifest__';
const MANIFEST_CHECK_INTERVAL_MS = 60 * 1000;
let lastManifestCheck = 0;
let manifestSyncPromise = null;

const FALLBACK_CACHE_FILES = [
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
];

function normalizeManifest(manifest) {
  const sourceFiles = Array.isArray(manifest?.files)
    ? manifest.files
    : FALLBACK_CACHE_FILES.map(path => ({ path, hash: '' }));
  const fileMap = new Map();

  for (const sourceFile of sourceFiles) {
    if (typeof sourceFile === 'string') {
      fileMap.set(sourceFile, { path: sourceFile, hash: '' });
      continue;
    }
    if (sourceFile && typeof sourceFile.path === 'string') {
      fileMap.set(sourceFile.path, {
        path: sourceFile.path,
        hash: String(sourceFile.hash ?? '')
      });
    }
  }

  if (!fileMap.has(CACHE_MANIFEST_URL)) {
    fileMap.set(CACHE_MANIFEST_URL, { path: CACHE_MANIFEST_URL, hash: '' });
  }

  return {
    version: String(manifest?.version ?? 1),
    files: [...fileMap.values()]
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
  const fetchResults = await Promise.all(
    files.map(async file => {
      try {
        const request = new Request(file, { cache: 'no-cache' });
        const response = await fetch(request);
        if (!response.ok) {
          return { file, error: `HTTP ${response.status}` };
        }
        return { file, request, response };
      } catch (error) {
        return { file, error: String(error) };
      }
    })
  );

  const failedFiles = fetchResults.filter(result => result.error).map(result => result.file);
  if (failedFiles.length) {
    throw new Error(`Could not cache files: ${failedFiles.join(', ')}`);
  }

  await Promise.all(
    fetchResults.map(result => cache.put(result.request, result.response.clone()))
  );
}

function manifestHashMap(manifestFiles) {
  return new Map(manifestFiles.map(file => [file.path, file.hash]));
}

function hasSameFileHashes(firstFiles, secondFiles) {
  const firstMap = manifestHashMap(firstFiles);
  const secondMap = manifestHashMap(secondFiles);
  if (firstMap.size !== secondMap.size) return false;
  return [...firstMap.entries()].every(([path, hash]) => secondMap.get(path) === hash);
}

async function getFilesToDownload(cache, previousManifest, nextManifest) {
  if (!previousManifest) {
    return nextManifest.files.map(file => file.path);
  }

  const previousHashes = manifestHashMap(previousManifest.files);
  const decisionList = await Promise.all(
    nextManifest.files.map(async file => {
      const previousHash = previousHashes.get(file.path);
      if (previousHash !== undefined && previousHash === file.hash && await cache.match(file.path)) {
        return null;
      }
      return file.path;
    })
  );

  return decisionList.filter(Boolean);
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
      !hasSameFileHashes(previousManifest.files, nextManifest.files);

    if (!hasChanged) return;

    const filesToDownload = await getFilesToDownload(cache, previousManifest, nextManifest);
    await cacheFiles(cache, filesToDownload);

    if (previousManifest && Array.isArray(previousManifest.files)) {
      const nextPaths = new Set(nextManifest.files.map(file => file.path));
      await Promise.all(
        previousManifest.files
          .map(file => typeof file === 'string' ? file : file.path)
          .filter(file => !nextPaths.has(file))
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
  event.waitUntil(
    Promise.all([syncCacheWithManifest(true), self.skipWaiting()])
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        )
      ),
      syncCacheWithManifest(true),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  if (event.request.mode === 'navigate') {
    event.waitUntil(syncCacheWithManifest(false));
  }
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
