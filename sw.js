/* Shot 1 Streaming — Service Worker (PWA) */
const SHELL_CACHE = "shot1-shell-v1";
const IMG_CACHE = "shot1-img-v1";

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/main.js",
  "/manifest.json",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/img/logo-streaming.png",
  "/img/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== IMG_CACHE)
          .map((k) => caches.delete(k))
      ).then(() => self.clients.claim())
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Videos de Supabase (con Range requests): siempre red, sin caché
  // para no romper el streaming ni llenar el almacenamiento.
  if (url.hostname.endsWith("supabase.co") && request.destination === "video") {
    return;
  }

  // Navegación: red primero, fallback a la app cacheada (offline).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Imágenes (locales y thumbnails de YouTube): caché primero.
  if (request.destination === "image") {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(IMG_CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Shell (CSS/JS/manifest): stale-while-revalidate.
  if (request.destination === "style" || request.destination === "script" || url.pathname.endsWith("manifest.json")) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const fresh = fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || fresh;
      })
    );
  }
});
