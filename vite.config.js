import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/* Derleme sonunda dist/sw.js içine sürüm (dosya içeriklerinin özeti) ve önbelleğe alınacak dosya listesi yazılır.
   Böylece sürümü elle artırmaya gerek kalmaz; her yayında eski önbellek temizlenir. */
function swSurumu() {
  let dosyalar = [];
  return {
    name: "enorpa-sw-surumu",
    apply: "build",
    // Yalnızca açılışta gereken dosyalar (giriş + statik içe aktarımları + CSS) önceden önbelleğe alınır.
    // İsteğe bağlı ağır parçalar (PDF, HEIC) ilk kullanıldıklarında önbelleğe girer.
    generateBundle(_, paket) {
      const set = new Set(), ekle = f => { const c = paket[f]; if (!c || set.has(f)) return; set.add(f); (c.imports || []).forEach(ekle); (c.viteMetadata?.importedCss || []).forEach(x => set.add(x)); };
      Object.values(paket).filter(c => c.type === "chunk" && c.isEntry).forEach(c => ekle(c.fileName));
      dosyalar = [...set];
    },
    writeBundle(secenek, paket) {
      const hedef = path.join(secenek.dir, "sw.js");
      if (!fs.existsSync(hedef)) return;
      const ozet = createHash("sha256");
      for (const f of Object.keys(paket).sort()) { const v = paket[f]; ozet.update(f).update(v.type === "chunk" ? v.code : v.source); }
      const surum = ozet.digest("hex").slice(0, 12);
      const sw = fs.readFileSync(hedef, "utf8")
        .replace("__SURUM__", surum)
        .replace("self.__DERLEME__ || []", JSON.stringify(dosyalar));
      fs.writeFileSync(hedef, sw);
    }
  };
}

/* base "./": uygulama alt klasörde de (GitHub Pages: /depo-adi/) kök dizinde de çalışır. */
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1400,   // heic2any (~1,3 MB) yalnızca iPhone HEIC fotoğrafı seçilince yüklenir
    rollupOptions: {
      output: {
        // Firebase ayrı dosyada: uygulama kodu değişince kullanıcılar yalnızca küçük dosyayı yeniden indirir
        manualChunks: id => (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase") ? "firebase" : undefined)
      }
    }
  },
  plugins: [swSurumu()],
  server: { port: 5173 }
});
