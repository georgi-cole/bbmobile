// Service Worker with audio pre-cache (no YouTube)
// NOTE: bump CACHE_NAME when core assets list changes.
const CACHE_NAME = 'bb-pwa-v-audio-files-1';

// Make sure these filenames match your repository structure.
// Default audio folder is /audio as in your screenshot.
const CORE = [
  './',
  './index.html',
  './styles.css',
  './site.webmanifest',

  // Audio tracks (pre-cache for offline playback)
  './audio/intro.mp3',
  './audio/competition.mp3',
  './audio/nominations.mp3',
  './audio/twist.mp3',
  './audio/eviction.mp3',
  './audio/live%20vote.mp3',
  './audio/final%20jury%20vote.mp3',
  './audio/victory.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(CORE); } catch {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME) ? null : caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Static assets runtime cache (added mp3)
    if (/\.(?:js|css|png|jpg|jpeg|gif|svg|webp|woff2?|mp3)$/i.test(url.pathname)) {
      e.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const fresh = fetch(req).then(res => { try { cache.put(req, res.clone()); } catch {} return res; }).catch(() => cached);
        return cached || fresh;
      })());
      return;
    }

    // HTML navigation
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      e.respondWith((async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          try { cache.put(req, fresh.clone()); } catch {}
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(req)) || (await cache.match('./index.html'));
        }
      })());
      return;
    }
  }

  // Network-first for everything else
  e.respondWith((async () => {
    try { return await fetch(req); }
    catch {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(req);
      return match || new Response('', { status: 504 });
    }
  })());
});