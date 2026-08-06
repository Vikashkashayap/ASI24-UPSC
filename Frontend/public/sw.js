/* Minimal service worker — static asset cache + network-first for navigations.
   Background Sync ready: listen for 'sync' when online queue flushes. */
const CACHE = "md-student-portal-v1";
const PRECACHE = ["/", "/manifest.webmanifest", "/brand/app-icon.png", "/brand/mentorsdaily-logo.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API: network only (offline queue handles mutations in app layer)
  if (url.pathname.startsWith("/api")) return;

  // Static assets: cache-first
  if (url.pathname.startsWith("/assets/") || url.pathname.match(/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigations: network-first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/") || caches.match(req))
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "md-offline-queue") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "MD_FLUSH_OFFLINE_QUEUE" }));
      })
    );
  }
});
