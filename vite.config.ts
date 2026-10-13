import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/hallucinators/",
  plugins: [mdx(), react()],
  worker: { format: "es" },
  build: { target: "es2022" },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
} as Parameters<typeof defineConfig>[0]);
