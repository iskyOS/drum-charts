// Offline support for church Wi-Fi: always try the network for the page (so new charts show up),
// fall back to the last copy when offline. Fonts are cached on first use.
const CACHE = "charts-v2";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "manifest.webmanifest", "icon-180.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "./" : req, res.clone()));
    return res;
  }).catch(() => caches.match(req.mode === "navigate" ? "./" : req)));
});
