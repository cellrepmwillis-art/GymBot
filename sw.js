// Caches the app so it opens instantly and works offline. Nothing in the app
// needs a connection.
const CACHE = "gymbot-v3";
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "day.js",
  "workouts.js",
  "trainers.js",
  "manifest.webmanifest",
  "icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // "reload": a new version downloads fresh files, not the browser's cached ones.
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin === self.location.origin) {
    // Network first for our own files so updates show up; fall back to cache offline.
    event.respondWith(
      fetch(request, { cache: "no-cache" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
  }
});
