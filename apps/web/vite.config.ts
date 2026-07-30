import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const mapLibreRuntimeFiles = [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-shared.mjs",
] as const;

function mapLibreWorkerPlugin(): Plugin {
  const runtimeFiles = mapLibreRuntimeFiles.map((fileName) => ({
    path: `/${fileName}`,
    source: readFileSync(
        fileURLToPath(
          new URL(`../../node_modules/maplibre-gl/dist/${fileName}`, import.meta.url),
        ),
      ),
  }));

  return {
    name: "maplibre-worker-runtime",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const file = runtimeFiles.find(({ path }) => path === request.url);
        if (!file) {
          next();
          return;
        }

        response.setHeader("Content-Type", "text/javascript");
        response.end(file.source);
      });
    },
    generateBundle() {
      for (const file of runtimeFiles) {
        this.emitFile({
          type: "asset",
          fileName: file.path.slice(1),
          source: file.source,
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), mapLibreWorkerPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
