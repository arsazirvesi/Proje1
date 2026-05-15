/* Arsa Yatırım Zirvesi 2026 — Service Worker
 *
 * Cache strategy:
 *  - Static assets (JS/CSS/fonts/images): cache-first
 *  - HTML pages (navigations): network-first with offline fallback
 *  - API GET requests: stale-while-revalidate (instant cached data + background refresh)
 *  - API POST/PUT/DELETE: always network (never cached)
 *
 * Bump SW_VERSION whenever you ship a new release to invalidate old caches.
 */

const SW_VERSION = "v1.0.0-2026-02-15";
const STATIC_CACHE = `static-${SW_VERSION}`;
const RUNTIME_CACHE = `runtime-${SW_VERSION}`;
const API_CACHE = `api-${SW_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/favicon-192.png",
  "/favicon-512.png",
  "/apple-touch-icon.png",
];

// ----- Install -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// ----- Activate: clean old caches -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ----- Fetch routing -----
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache non-GET
  if (req.method !== "GET") return;

  // Never cache analytics / third party scripts
  if (url.pathname.startsWith("/cdn-cgi/") || url.hostname.includes("google-analytics")) return;

  // API requests → stale-while-revalidate
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(req, API_CACHE));
    return;
  }

  // Navigation (HTML page) → network-first
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // Static assets (JS/CSS/images/fonts) → cache-first
  event.respondWith(cacheFirst(req, RUNTIME_CACHE));
});

// ----- Strategies -----
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch (err) {
    return cached || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    // last-resort offline fallback: try cached "/" (app shell)
    const shell = await cache.match("/") || await caches.match("/");
    if (shell) return shell;
    return new Response(
      "<h1>Çevrimdışı</h1><p>İnternet bağlantınızı kontrol edip tekrar deneyin.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// ----- Manual update trigger -----
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
