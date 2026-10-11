/* Duman testi: gerçek tarayıcıda uygulamayı (Firebase SAHTE modüllerle) açar, sekmeleri gezer ve
   konsolda hata / yakalanmamış istisna olmadığını doğrular. Ağ ve gerçek veri gerekmez.
   Kullanım:  npm run test:smoke      (ilk kez:  npx playwright install chromium)
   Ortam:     CHROMIUM_PATH=/yol/chrome  (isteğe bağlı) */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sahte = path.join(kok, "tests/smoke/stubs");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const harita = { imports: { "firebase/app": "/__stubs/firebase-app.js", "firebase/app-check": "/__stubs/firebase-app-check.js", "firebase/firestore": "/__stubs/firebase-firestore.js", "firebase/auth": "/__stubs/firebase-auth.js" } };

const sunucu = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html");
  let f = p.startsWith("/__stubs/") ? path.join(sahte, p.slice(9)) : path.join(kok, p);
  if (!fs.existsSync(f)) f = path.join(kok, "public", p);
  if (!f.startsWith(kok) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  if (path.basename(f) === "index.html") {
    const html = fs.readFileSync(f, "utf8").replace("</head>", `<script type="importmap">${JSON.stringify(harita)}</script></head>`);
    res.writeHead(200, { "Content-Type": "text/html" }); return res.end(html);
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => sunucu.listen(0, r));
const port = sunucu.address().port;
const tarayici = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });

async function senaryo(ad, girisli) {
  const sayfa = await tarayici.newPage({ viewport: { width: 420, height: 900 } });
  const hatalar = [];
  sayfa.on("pageerror", e => hatalar.push("PAGEERROR: " + e.message));
  sayfa.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) hatalar.push("console.error: " + m.text()); });
  if (girisli) await sayfa.addInitScript(() => { window.__FAKE_USER__ = { email: "test@enorpa.com", uid: "u1" }; });
  await sayfa.route("**/*", r => { const u = new URL(r.request().url()); return u.hostname === "localhost" || u.hostname === "127.0.0.1" ? r.continue() : r.fulfill({ status: 200, contentType: "text/plain", body: "" }); });
  await sayfa.goto(`http://localhost:${port}/`, { waitUntil: "load" });
  await sayfa.waitForTimeout(1200);
  if (girisli) {
    for (const n of await sayfa.$$(".nav-item")) { await n.click().catch(() => {}); await sayfa.waitForTimeout(200); }
    await sayfa.fill("#aiSoru", "merhaba").catch(() => {});
    await sayfa.fill("#aramaKutusu", "test").catch(() => {});
    await sayfa.waitForTimeout(500);
  }
  const gorunur = await sayfa.evaluate(() => ({ giris: getComputedStyle(document.getElementById("loginScreen")).display, ana: getComputedStyle(document.getElementById("mainApp")).display }));
  await sayfa.close();
  assert.deepEqual(hatalar, [], `${ad}: konsol hataları`);
  return gorunur;
}

try {
  const anon = await senaryo("oturumsuz", false);
  assert.notEqual(anon.giris, "none", "oturumsuz: giriş ekranı görünmeli");
  assert.equal(anon.ana, "none", "oturumsuz: ana uygulama gizli olmalı");
  const auth = await senaryo("oturumlu", true);
  assert.equal(auth.giris, "none", "oturumlu: giriş ekranı gizlenmeli");
  assert.notEqual(auth.ana, "none", "oturumlu: ana uygulama görünmeli");
  console.log("✔ duman testi geçti (oturumsuz + oturumlu, sekmeler gezildi, konsol temiz)");
} finally { await tarayici.close(); sunucu.close(); }
