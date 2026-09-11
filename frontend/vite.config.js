import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    // Proxy API calls to the Node/Express backend (../backend) during dev.
    // Update the target if the backend runs on a different port.
    proxy: {
      "/api": "http://localhost:5001",
      "/uploads": "http://localhost:5001"
    }
  }
});
