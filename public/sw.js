/**
 * Bloom's service worker — B6.
 *
 * Deliberately small. The pages are already device-first (every store reads
 * localStorage before the network), so the worker only has to make sure the
 * shell can open with no connection at all, and to own the notifications the
 * reminder scheduler shows.
 *
 * Strategy:
 *   · navigations  — network first, falling back to the cached shell;
 *   · static build assets (/_build, /assets, fonts, icons) — cache first;
 *   · everything else (Supabase, APIs) — straight to the network, never cached.
 *
 * A new deploy bumps CACHE and the old one is dropped on activate.
 */

const CACHE = "bloom-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/bloom/icons/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase & co. are never cached

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
            }
            return response;
          }),
      ),
    );
  }
});

/** The page asks the worker to show a reminder (works when installed on iOS too). */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "bloom-notify") return;
  const { title, body, tag, url } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/bloom/icons/icon-192.png",
      badge: "/bloom/icons/icon-192.png",
      data: { url: url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
