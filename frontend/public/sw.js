/* Hall 12 Portal service worker.
 *
 * Strategy:
 *  - /api/*            never cached (always network)
 *  - /_next/static/*   cache-first (content-hashed, immutable)
 *  - icons, logo, fonts cache-first
 *  - page navigations  network-first, falling back to the cached page, then /offline.html
 *
 * Web Push: `push` shows the server's payload {title, body, url, tag};
 * `notificationclick` focuses an open tab of the app or opens `url`.
 *
 * Bump CACHE_VERSION when the caching rules change; old caches are deleted on activate.
 */

const CACHE_VERSION = "hmp-v2";
const PRECACHE = ["/offline.html", "/logo.webp", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/logo.webp" ||
    /\.(woff2?|ttf|png|webp|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API responses are personal and time-sensitive: never serve from cache.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);
          return (await cache.match(request)) || (await cache.match("/offline.html"));
        })
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = { title: "Hall 12", body: "", url: "/student/dashboard", tag: undefined };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // non-JSON payload: show the default title
  }
  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag,
    renotify: Boolean(payload.tag),
    data: { url: payload.url },
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(target).then((c) => (c || existing).focus()).catch(() => existing.focus());
      }
      return self.clients.openWindow(target);
    })
  );
});
