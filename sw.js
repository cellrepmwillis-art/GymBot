// Caches the app so it opens instantly and works offline. Only Ask the
// trainer needs a connection.
const CACHE = "gymbot-v29";
const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "day.js",
  "workouts.js",
  "trainers.js",
  "met.js",
  "celebrate.js",
  "weight.js",
  "outdoor.js",
  "ask.js",
  "vendor/anthropic-sdk-0.131.0.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
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
  if (request.method !== "GET") return; // API calls are POSTs and always go to the network
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
