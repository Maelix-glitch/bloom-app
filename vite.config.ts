// Bloom's Vite config — stock Vite + TanStack Start, no vendor wrapper.
//
// Plugins (order matters):
//   - tailwindcss, tsConfigPaths (the tsconfig `@` alias)
//   - tanstackStart (file routes + server functions; the server entry is
//     redirected to src/server.ts, our SSR error wrapper)
//   - nitro, build-only (deploys to Cloudflare by default)
//   - viteReact
// Plus: VITE_* env injection, React/TanStack dedupe, and dev-server defaults.
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig, type UserConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(async ({ command, mode }): Promise<UserConfig> => {
  const isDevBuild = command === "build" && mode === "development";
  // BLOOM_TARGET=capacitor → static single-page build for the native wrapper
  // (Capacitor bundles dist/ into the iOS/Android app, fully offline-capable).
  // Anything else → SSR worker build for Cloudflare.
  const isCapacitor = process.env.BLOOM_TARGET === "capacitor";

  // nitro/vite is build-only: skip importing it in dev so `vite dev` stays fast.
  // Also skipped for Capacitor — a static SPA has no server to deploy.
  const buildPlugins: UserConfig["plugins"] = [];
  if (command === "build" && !isCapacitor) {
    const { nitro } = await import("nitro/vite");
    buildPlugins.push(nitro({ defaultPreset: "cloudflare-module" }));
  }

  // `define` injects VITE_* vars for client and server alike (stock Vite only
  // exposes them to the client bundle).
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  let config: UserConfig = {
    define: envDefine,
    ...(isDevBuild
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
        }
      : {}),
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        // nitro/vite builds from this. Ignored in Capacitor mode (no server).
        server: { entry: "server" },
        // Capacitor mode: emit a static SPA into dist/ instead of an SSR app.
        ...(isCapacitor ? { spa: { enabled: true } } : {}),
      }),
      ...buildPlugins,
      viteReact(),
    ],
  };

  config = mergeConfig(config, {
    server: {
      // The Arena preview proxies via a *.e2b.app host; allow it in dev.
      allowedHosts: [".e2b.app"],
    },
  });

  config = mergeConfig({ server: { host: "::", port: 8080 } }, config);

  // Debounce file-watch events so a single save doesn't trigger repeated restarts.
  config = mergeConfig(config, {
    server: {
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
  });

  return config;
});
