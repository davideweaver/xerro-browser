import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Derive API and WebSocket URLs from single Graphiti server URL
  const graphitiServer = env.VITE_GRAPHITI_SERVER || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 8004,
      host: true, // Expose to external network
      proxy: {
        "/api/v1/obsidian": {
          target: env.VITE_XERRO_SERVICE_URL || "http://localhost:9205",
          changeOrigin: true,
        },
        "/api/v1/llamacpp": {
          target: env.VITE_XERRO_SERVICE_URL || "http://localhost:9205",
          changeOrigin: true,
        },
        "/api": {
          target: graphitiServer,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
        "/llamacpp": {
          target: env.VITE_LLAMACPP_URL || "http://localhost:9004",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/llamacpp/, ""),
        },
      },
    },
  };
});
