/* Offline cache for Rust RO. Bump VERSION when files change. */
const VERSION = "rustro-v1";
const FILES = ["./", "index.html", "manifest.webmanifest", "assets/app.css", "assets/app.js", "assets/i18n.js", "assets/highlight.js", "assets/converter.js",
  "assets/converter-examples.js", "assets/discord.js", "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "content/00-init.js", "content/01-setup.js",
  "content/02-variables.js", "content/03-functions.js", "content/04-ownership.js", "content/05-structs.js", "content/06-errors.js", "content/07-net.js", "content/08-why.js"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // never touch discord.com / playground
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res; })));
});
