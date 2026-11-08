import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Testes de integração: exigem `npx supabase start` e .env.local apontando para o local.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.int.test.ts"],
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
