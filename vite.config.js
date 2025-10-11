// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // jika pakai Tailwind plugin Vite
import path from "path";
import { fileURLToPath } from "url";

// __dirname untuk ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // aktifkan jika paket @tailwindcss/vite terpasang
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", // URL backend dev
        changeOrigin: true,
        // rewrite: (p) => p, // biarkan /api tetap /api (opsional)
      },
    },
  },
});
