const CACHE_NAME = "cysa-trainer-v1";
const APP_SHELL = ["/", "/drill", "/exam", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for GET requests (app pages + GET API calls like /api/drill/next,
// /api/stats) so you always get fresh data when online, but fall back to the last
// cached response when offline -- e.g. re-drilling the last fetched batch on a
// train with no signal. POST requests (answers, exam submit) are never cached and
// simply fail offline, since they need to reach the DB to persist state.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
