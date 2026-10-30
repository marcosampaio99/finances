import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    env: {
      VITE_FIREBASE_API_KEY: "test",
      VITE_FIREBASE_AUTH_DOMAIN: "test",
      VITE_FIREBASE_PROJECT_ID: "test",
      VITE_FIREBASE_STORAGE_BUCKET: "test",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "test",
      VITE_FIREBASE_APP_ID: "test",
    },
  },
});
