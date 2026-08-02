const CACHE_NAME = "spotmatch-v3";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }
  if (STATIC_ASSETS.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

// Web Push handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "ParkingMeeters", body: event.data.text() };
  }

  const title = data.title || "ParkingMeeters";
  const options = {
    body: data.body || "",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: data,
  };

  // Add action buttons based on message type
  if (data.type === "match_found") {
    options.actions = [
      { action: "accept", title: "Accept & Navigate" },
      { action: "deny", title: "Decline" },
    ];
  } else if (data.type === "arrival_reminder") {
    options.actions = [
      { action: "confirm_parked", title: "Confirm Parked" },
    ];
  } else if (data.type === "partner_arrived") {
    options.actions = [
      { action: "view", title: "View Match" },
    ];
  } else if (data.type === "driver_approaching" || data.type === "driver_arriving") {
    options.actions = [
      { action: "view", title: "Watch Driver" },
    ];
  } else if (data.type === "spot_ready") {
    options.actions = [
      { action: "view", title: "Park Now" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = "/";

  if (event.action === "accept" && data.type === "match_found" && data.match_id) {
    targetUrl = `/match/${data.match_id}?action=accept`;
  } else if (event.action === "deny" && data.type === "match_found" && data.match_id) {
    targetUrl = `/match/${data.match_id}?action=decline`;
  } else if (event.action === "confirm_parked" && data.match_id) {
    targetUrl = `/match/${data.match_id}?action=arrived`;
  } else if (data.type === "partner_arrived" && data.match_id) {
    targetUrl = `/match/${data.match_id}?action=arrived`;
  } else if (data.match_id) {
    targetUrl = `/match/${data.match_id}`;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open, otherwise open new one
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
