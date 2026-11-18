import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/http-api.ts"],
  // effect v4 is ESM-only. Splitting keeps one copy of the shared classes
  // (e.g. `PermissionDenied`) across both entry points.
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
});
