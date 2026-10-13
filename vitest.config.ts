import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "apps/web/**/*.test.tsx",
      "scripts/**/*.test.ts",
    ],
    // Component tests render into a DOM; everything else stays on plain Node.
    environmentMatchGlobs: [["apps/web/**/*.test.tsx", "jsdom"]],
  },
});
