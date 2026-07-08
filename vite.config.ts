import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/package"],
      outDirs: "dist",
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/package/index.ts"),
      name: "ReSignal",
      fileName: "re-signal",
      formats: ["es", "cjs"],
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    sourcemap: true,
    target: "es2020",
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
