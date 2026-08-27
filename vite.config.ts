import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app": path.resolve(__dirname, "src/app"),
      "@features": path.resolve(__dirname, "src/features"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@lib": path.resolve(__dirname, "src/lib"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the long-lived framework code out of the app chunk so a routine
        // app deploy does not invalidate React/Redux in every user's cache.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
        },
      },
    },
  },
  server: {
    port: 5174,
    host: true,
  },
});
