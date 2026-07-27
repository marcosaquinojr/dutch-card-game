import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { initializeSocketIO } from "./src/server/middleware";

function socketPlugin(): Plugin {
  return {
    name: "dutch-socket-io",
    configureServer(server) {
      if (server.httpServer) {
        initializeSocketIO(server.httpServer);
      }
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [socketPlugin()],
  },
});

