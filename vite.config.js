
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite"; // ✅ tambahkan plugin Tailwind

// karena __dirname tidak tersedia di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ✅ aktifkan Tailwind di Vite
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
    server: {
    proxy: {
      "/api": {
        target: "https://laravel-interactive-english-course-production.up.railway.app", // ganti sesuai backend
        changeOrigin: true,
      },
    },
  },
});


