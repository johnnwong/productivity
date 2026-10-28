import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "offline-shell",
      apply: "build",
      enforce: "post",
      generateBundle(_, bundle) {
        const files = [
          ...new Set([
            "/",
            "/index.html",
            "/icon.svg",
            "/icon-192.png",
            "/icon-512.png",
            "/manifest.webmanifest",
            ...Object.keys(bundle).map((f) => `/${f}`),
          ]),
        ];
        const hash = createHash("sha256")
          .update(
            Object.values(bundle)
              .map((item) =>
                item.type === "chunk" ? item.code : String(item.source),
              )
              .join(""),
          )
          .digest("hex")
          .slice(0, 12);
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: `
const CACHE = "little-shell-${hash}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("little-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("message", event => { if (event.data === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match("/index.html"))));
  } else {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request, { ignoreVary: true })) || fetch(event.request)));
  }
});
`,
        });
      },
    },
  ],
  test: { include: ["src/**/*.test.ts"] },
});
