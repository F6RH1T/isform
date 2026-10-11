/* Ağır kütüphaneleri (jsPDF, html2canvas, heic2any) ilk kullanımda yükleyen küçük yükleyici.
   Uygulama kodu bunları window üzerinden çağırır (pdfKutuphaneleri(), heicKutuphanesi()). */
const yuklenen = {};

const betikYukle = u => yuklenen[u] || (yuklenen[u] = new Promise((ok, hata) => {
  const e = document.createElement("script");
  e.src = u;
  e.onload = ok;
  e.onerror = () => { delete yuklenen[u]; hata(new Error("Kütüphane yüklenemedi")); };
  document.head.appendChild(e);
}));

const pdfKutuphaneleri = () => Promise.all([
  betikYukle("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
  betikYukle("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js")
]);

const heicKutuphanesi = () => betikYukle("https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js");

Object.assign(window, { betikYukle, pdfKutuphaneleri, heicKutuphanesi });

// Açılıştan sonra boşta PDF kütüphanelerini önceden ısıt (ilk PDF daha hızlı çıksın)
window.addEventListener("load", () => setTimeout(() => { pdfKutuphaneleri().catch(() => {}); }, 4000));
