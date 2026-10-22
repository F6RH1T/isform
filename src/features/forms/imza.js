import { $ } from "../../lib/dom.js";
import { fa } from "./form-ui.js";

// İmza Alanları (Firma yetkilisi + Müşteri)
const imzaBlok = (id, baslik, ekler = "") => `
<div class="tam" style="margin-top:10px;">
  <div class="alt-baslik">${baslik}</div>
  <div style="border:1.5px solid var(--border); border-radius:var(--r-md); background:#fff; overflow:hidden;">
    <canvas id="${id}" height="150" role="img" aria-label="${baslik} alanı" style="width:100%; display:block; touch-action:none; cursor:crosshair;"></canvas>
    <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:flex-end; padding:6px; background:var(--surface-2); border-top:1px solid var(--border);">
      ${ekler}
      <button type="button" data-imza-temizle="${id}" style="background:var(--danger); color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer;">Temizle</button>
    </div>
  </div>
</div>`;

$("ofImza").innerHTML = fa("ofSorumlu", "Servis sorumlusu / firma yetkilisi (ad, soyad)") + imzaBlok("imzaSorumluCanvas", "Servis Sorumlusu (Firma Yetkilisi) İmzası",
    `<button type="button" id="btnImzaKullan" style="background:var(--primary); color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer;">✍ Kayıtlı imzamı kullan</button>
     <button type="button" id="btnImzaKaydet" style="background:var(--surface); color:var(--text-main); border:1px solid var(--border); padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer;">💾 Bu imzayı kaydet</button>
     <button type="button" id="btnImzaSil" style="background:var(--surface); color:var(--text-muted); border:1px solid var(--border); padding:6px 12px; border-radius:4px; font-size:12px; cursor:pointer;">Kayıtlı imzayı sil</button>`) +
  fa("ofMusteri", "Müşteri / firma yetkilisi (ad, soyad)") + imzaBlok("imzaCanvas", "Müşteri İmzası");

const imzaDurum = {};

/* Tuval, ekranın piksel yoğunluğuyla (en fazla 2x) çizilir: retina ekranda imza bulanık çıkmaz.
   Pointer Events: parmak, fare ve kalem aynı kodla çalışır. Çizim koordinatları CSS pikselidir. */
const IMZA_YUKSEKLIK = 150;
function imzaKurTek(id) {
  const c = document.getElementById(id);
  if (!c) return;
  const w = c.parentElement.clientWidth;
  if (!w) return;                       // form gizliyken ölçü alma
  const st = imzaDurum[id] = imzaDurum[id] || { hazir: false, cizildi: false, ctx: null };
  const stil = () => { st.ctx.strokeStyle = "#000"; st.ctx.lineWidth = 2.5; st.ctx.lineCap = "round"; st.ctx.lineJoin = "round"; };
  if (!st.hazir) {
    st.ctx = c.getContext("2d");
    c.style.height = IMZA_YUKSEKLIK + "px";
    const getP = e => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (st.w / r.width), y: (e.clientY - r.top) * (IMZA_YUKSEKLIK / r.height) }; };
    let ciziyor = false;
    c.addEventListener("pointerdown", e => {
      e.preventDefault(); c.setPointerCapture(e.pointerId);
      ciziyor = true; st.cizildi = true; const p = getP(e); st.ctx.beginPath(); st.ctx.moveTo(p.x, p.y); st.ctx.lineTo(p.x + 0.01, p.y); st.ctx.stroke();
    });
    c.addEventListener("pointermove", e => {
      if (!ciziyor) return; e.preventDefault();
      for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) { const p = getP(ev); st.ctx.lineTo(p.x, p.y); }
      st.ctx.stroke();
    });
    const btr = () => { ciziyor = false; };
    c.addEventListener("pointerup", btr); c.addEventListener("pointercancel", btr);
    document.querySelector(`[data-imza-temizle="${id}"]`).addEventListener("click", () => {
      st.ctx.setTransform(1, 0, 0, 1, 0, 0); st.ctx.clearRect(0, 0, c.width, c.height); st.ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      st.cizildi = false;
    });
    st.hazir = true;
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!st.cizildi && (st.w !== w || st.dpr !== dpr)) {   // boyut değiştiyse (ve henüz imza yoksa) yeniden ölçekle
    st.w = w; st.dpr = dpr;
    c.width = Math.round(w * dpr); c.height = Math.round(IMZA_YUKSEKLIK * dpr);
    st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  stil();
}

/* Firma yetkilisi imzası bu cihazda (localStorage) saklanır; sunucuya gitmez */
const IMZA_ANAHTAR = "enorpa_yetkili_imza";

(function () {
  const id = "imzaSorumluCanvas";
  $("btnImzaKaydet").addEventListener("click", () => {
    if (!imzaVarMi(id)) { showToast("Önce imzayı atın.", "error"); return; }
    try { localStorage.setItem(IMZA_ANAHTAR, document.getElementById(id).toDataURL("image/png")); showToast("İmza bu cihaza kaydedildi", "success"); }
    catch (_) { showToast("İmza kaydedilemedi (tarayıcı izin vermiyor).", "error"); }
  });
  $("btnImzaSil").addEventListener("click", () => {
    try { localStorage.removeItem(IMZA_ANAHTAR); } catch (_) {}
    showToast("Kayıtlı imza silindi", "info");
  });
  $("btnImzaKullan").addEventListener("click", () => {
    let veri = null; try { veri = localStorage.getItem(IMZA_ANAHTAR); } catch (_) {}
    if (!veri) { showToast("Kayıtlı imza yok. Önce imzalayıp “Bu imzayı kaydet”e basın.", "error"); return; }
    imzaKurTek(id);
    const st = imzaDurum[id];
    if (!st || !st.ctx) { showToast("Önce formu açın.", "error"); return; }
    const img = new Image();
    img.onload = () => {
      const W = st.w, H = IMZA_YUKSEKLIK;
      st.ctx.clearRect(0, 0, W, H);
      const oran = Math.min(W / img.width, H / img.height);
      const w = img.width * oran, h = img.height * oran;
      st.ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      st.cizildi = true;
    };
    img.src = veri;
  });
})();

export function imzaKur() { imzaKurTek("imzaSorumluCanvas"); imzaKurTek("imzaCanvas"); }

export const imzaVarMi = id => !!(imzaDurum[id] && imzaDurum[id].cizildi);

export function imzalariTemizle() { document.querySelectorAll("[data-imza-temizle]").forEach(b => b.click()); }
