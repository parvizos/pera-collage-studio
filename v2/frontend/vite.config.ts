import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const backend = "http://127.0.0.1:8090";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "staff.webmanifest"],
      manifest: {
        id: "/",
        name: "PERA Shop",
        short_name: "PERA",
        description: "PERA — wholesale clothing store",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f3ece1",
        theme_color: "#d47516",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/history/, /^\/templates/, /^\/healthz/],
        runtimeCaching: [
          {
            urlPattern: /\/api\/img\/thumb/,
            handler: "CacheFirst",
            options: { cacheName: "pera-thumbs", expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /\/history\//,
            handler: "CacheFirst",
            options: { cacheName: "pera-images", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /\/api\/store\//,
            handler: "NetworkFirst",
            options: { cacheName: "pera-store-api", networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "pera-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
    proxy: {
      "/api": { target: backend, changeOrigin: true },
      "/history": { target: backend, changeOrigin: true },
      "/templates": { target: backend, changeOrigin: true },
      "/healthz": { target: backend, changeOrigin: true },
    },
  },
});
