import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./client/src", import.meta.url)),
    },
  },
  test: {
    // Default to node for server/lib tests. Component and store tests opt into
    // jsdom with a `// @vitest-environment jsdom` pragma at the top of the file.
    environment: "node",
    setupFiles: ["client/src/test/setup.ts"],
    include: ["client/src/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "client/src/lib/**/*.ts",
        "client/src/hooks/**/*.ts",
        "client/src/stores/**/*.ts",
        "server/**/*.ts",
      ],
      exclude: ["**/*.test.{ts,tsx}"],
    },
  },
});
