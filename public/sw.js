// Service Worker for Al-Marasim Restaurant CAPA V2 PWA
const CACHE_NAME = "marasim-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
  "/brand/logo.png"
];

// 1. Install & Precache App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate & Cleanup Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Network-First for Pages & Cache Fallback
self.addEventListener("fetch", (event) => {
  // Ignore non-GET and API calls
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline access
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Return cached version when offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});

// 4. System Notifications (Over All Applications)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_SYSTEM_NOTIFICATION") {
    const { title, body, data } = event.data;
    self.registration.showNotification(title || "مطعم المراسيم - تنبيه جديد", {
      body: body || "",
      icon: "/brand/logo.png",
      badge: "/brand/logo.png",
      dir: "rtl",
      lang: "ar",
      vibrate: [200, 100, 200],
      data: data || { url: "/" },
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
