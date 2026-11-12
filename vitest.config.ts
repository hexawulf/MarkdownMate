import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./client/src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["client/src/**/*.test.ts", "server/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["client/src/lib/**", "client/src/hooks/**", "server/**"],
      exclude: ["**/*.test.ts"],
    },
  },
});
