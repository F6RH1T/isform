import { defineConfig } from "vite";

/* base "./": uygulama alt klasörde de (GitHub Pages: /depo-adi/) kök dizinde de çalışır. */
export default defineConfig({
  base: "./",
  build: { target: "es2020", outDir: "dist", sourcemap: false },
  server: { port: 5173 }
});
