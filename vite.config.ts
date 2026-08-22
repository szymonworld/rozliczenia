import { existsSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Dev-only middleware that serves /api/* by loading the matching Vercel
 * Function handler through Vite's module graph. This means
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
        // One handler file per endpoint, named after the path. The character
        // class keeps a crafted URL from reaching outside api/.
        const name = url.startsWith("/api/") ? url.slice("/api/".length) : "";
        if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) return next();
        const modulePath = `/api/${name}.ts`;
        if (!existsSync(`.${modulePath}`)) return next();

        try {
          // Vercel populates req.query; plain Node does not, so shim it here
          // rather than making the handlers defensive about their runtime.
          const parsed = new URL(req.url ?? "", "http://localhost");
          (req as unknown as { query: Record<string, string> }).query =
            Object.fromEntries(parsed.searchParams);

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
export default defineConfig(({ mode }) => {
  // Vercel injects env vars into process.env for functions; locally we mirror
  // that from .env files so the dev API behaves the same as production.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
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
  };
});
