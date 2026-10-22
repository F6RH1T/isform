/* DEMO modu: npm run demo → http://localhost:5174
   Firebase modülleri bellekte çalışan sahte modüllerle değiştirilir; gerçek veritabanına bağlanılmaz.
   Görünümü denemek ve ekran görüntüsü almak içindir. Herhangi bir e-posta/şifre ile giriş yapılır. */
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const d = f => fileURLToPath(new URL(f, import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  base: "./",
  resolve: {
    alias: {
      "firebase/app-check": d("./firebase-app-check.js"),
      "firebase/app": d("./firebase-app.js"),
      "firebase/firestore": d("./firebase-firestore.js"),
      "firebase/auth": d("./firebase-auth.js")
    }
  },
  server: { port: 5174, host: true }
});
