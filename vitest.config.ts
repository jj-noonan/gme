import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "apps/web/**/*.test.tsx",
      "scripts/**/*.test.ts",
    ],
    // Component tests (*.test.tsx) opt into a DOM with a
    // `// @vitest-environment jsdom` comment; everything else runs on Node.
  },
});
