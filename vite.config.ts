import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Dev-only middleware that serves /api/ledger and /api/entry by loading the
 * real Vercel Function handlers through Vite's module graph. This means
 * `npm run dev` works standalone — no `vercel dev` required. In production
 * on Vercel, the files under api/ are deployed as Vercel Functions directly
 * and this plugin plays no part.
 */
function localApiPlugin(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        const modulePath =
          url === "/api/ledger" ? "/api/ledger.ts" : url === "/api/entry" ? "/api/entry.ts" : null;
        if (!modulePath) return next();

        try {
          if (req.method === "POST") {
            let raw = "";
            for await (const chunk of req) raw += chunk;
            (req as unknown as { body: unknown }).body = raw ? JSON.parse(raw) : {};
          }

          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default as (req: unknown, res: unknown) => Promise<void>;

          const enhancedRes = res as typeof res & {
            status: (code: number) => typeof enhancedRes;
            json: (data: unknown) => void;
          };
          enhancedRes.status = (code: number) => {
            res.statusCode = code;
            return enhancedRes;
          };
          enhancedRes.json = (data: unknown) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          };

          await handler(req, enhancedRes);
        } catch (err) {
          console.error("[local-api]", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Błąd serwera deweloperskiego" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Rozliczenia",
        short_name: "Rozliczenia",
        description: "Wspólne rozliczenia wydatków dla domowników",
        start_url: "/",
        display: "standalone",
        background_color: "#f4f5f7",
        theme_color: "#4f46e5",
        icons: [
          { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Only the Latin subsets are ever fetched for Polish text; the other
        // Inter subsets ship in the build but must not bloat the precache.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}", "assets/inter-latin*.woff2"],
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
