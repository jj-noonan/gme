import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works from a GH Pages project subpath
  // without hardcoding the repo name.
  base: "./",
  plugins: [react()],
});
