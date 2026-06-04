import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_NOT_FOUND') return;
        warn(warning);
      }
    }
  },
  server: {
    proxy: {
      "/api/players": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
