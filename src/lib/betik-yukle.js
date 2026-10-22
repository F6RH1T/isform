/* Ağır kütüphaneler (jsPDF, html2canvas, heic2any) ilk kullanımda ayrı dosya olarak yüklenir (npm paketinden,
   sürümü package-lock ile sabit; dış CDN'e bağımlılık ve bütünlük riski yok).
   Uygulama kodu bunları window üzerinden çağırır (pdfKutuphaneleri(), heicKutuphanesi()). */
let pdfSoz = null, heicSoz = null;
const pdfKutuphaneleri = () => pdfSoz || (pdfSoz = Promise.all([import("jspdf"), import("html2canvas")])
  .then(([j, h]) => { window.jspdf = j; window.html2canvas = h.default; })
  .catch(e => { pdfSoz = null; throw new Error("PDF kütüphanesi yüklenemedi: " + e.message); }));
const heicKutuphanesi = () => heicSoz || (heicSoz = import("heic2any")
  .then(m => { window.heic2any = m.default; })
  .catch(e => { heicSoz = null; throw new Error("HEIC kütüphanesi yüklenemedi: " + e.message); }));
Object.assign(window, { pdfKutuphaneleri, heicKutuphanesi });
// Açılıştan sonra boşta PDF kütüphanelerini önceden ısıt (ilk PDF daha hızlı çıksın)
window.addEventListener("load", () => setTimeout(() => { pdfKutuphaneleri().catch(() => {}); }, 4000));
