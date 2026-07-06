import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "CoachAI — Private Football Coach",
        short_name: "CoachAI",
        description: "On-device AI tactics coach + self-custody wallet tips.",
        theme_color: "#0b0f19",
        background_color: "#0b0f19",
        display: "standalone",
        icons: [
          {
            src: "https://cdn.dorahacks.io/static/files/19c763d1e43e9a15f4fc090412b9482d.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: { "/api": "http://localhost:8000" },
  },
});
