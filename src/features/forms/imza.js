import { $ } from "../../lib/dom.js";
import { fa } from "./form-ui.js";

// İmza Alanları (Firma yetkilisi + Müşteri)
const imzaBlok = (id, baslik, ekler = "") => `
<div class="tam" style="margin-top:10px;">
  <div class="alt-baslik">${baslik}</div>
  <div style="border:1.5px solid var(--border); border-radius:var(--r-md); background:#fff; overflow:hidden;">
    <canvas id="${id}" height="150" style="width:100%; display:block; touch-action:none; cursor:crosshair;"></canvas>
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

function imzaKurTek(id) {
  const c = document.getElementById(id);
  if (!c) return;
  const w = c.parentElement.clientWidth;
  if (!w) return;                       // form gizliyken ölçü alma
  const st = imzaDurum[id] = imzaDurum[id] || { hazir: false, cizildi: false, ctx: null };
  const stil = () => { st.ctx.strokeStyle = "#000"; st.ctx.lineWidth = 2.5; st.ctx.lineCap = "round"; st.ctx.lineJoin = "round"; };
  if (!st.hazir) {
    st.ctx = c.getContext("2d");
    const getP = (e) => {
      const r = c.getBoundingClientRect();
      const ev = e.touches ? e.touches[0] : e;
      return { x: (ev.clientX - r.left) * (c.width / r.width), y: (ev.clientY - r.top) * (c.height / r.height) };
    };
    let ciziyor = false;
    const bsl = (e) => { e.preventDefault(); ciziyor = true; st.cizildi = true; const p = getP(e); st.ctx.beginPath(); st.ctx.moveTo(p.x, p.y); };
    const cz = (e) => { if (!ciziyor) return; e.preventDefault(); const p = getP(e); st.ctx.lineTo(p.x, p.y); st.ctx.stroke(); };
    const btr = (e) => { if (e) e.preventDefault(); ciziyor = false; };
    c.addEventListener("mousedown", bsl); c.addEventListener("mousemove", cz);
    c.addEventListener("mouseup", btr); c.addEventListener("mouseout", btr);
    c.addEventListener("touchstart", bsl, { passive: false });
    c.addEventListener("touchmove", cz, { passive: false });
    c.addEventListener("touchend", btr);
    document.querySelector(`[data-imza-temizle="${id}"]`).addEventListener("click", () => {
      st.ctx.clearRect(0, 0, c.width, c.height);
      st.cizildi = false;
    });
    st.hazir = true;
  }
  if (!st.cizildi && c.width !== w) { c.width = w; }
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
    const c = document.getElementById(id), st = imzaDurum[id];
    if (!st || !st.ctx) { showToast("Önce formu açın.", "error"); return; }
    const img = new Image();
    img.onload = () => {
      st.ctx.clearRect(0, 0, c.width, c.height);
      const oran = Math.min(c.width / img.width, c.height / img.height);
      const w = img.width * oran, h = img.height * oran;
      st.ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      st.cizildi = true;
    };
    img.src = veri;
  });
})();

export function imzaKur() { imzaKurTek("imzaSorumluCanvas"); imzaKurTek("imzaCanvas"); }

export const imzaVarMi = id => !!(imzaDurum[id] && imzaDurum[id].cizildi);

export function imzalariTemizle() { document.querySelectorAll("[data-imza-temizle]").forEach(b => b.click()); }
