// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Route-based vendor splitting to keep the main chunk under 500 kB.
        // (recharts / @supabase/supabase-js are not dependencies of this app, so they're omitted.)
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@dnd-kit/core", "@dnd-kit/sortable"],
        },
      },
    },
  },
});
