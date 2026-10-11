import { $ } from "../../lib/dom.js";

(() => {
  const sahne = $("zoomSahne"), img = $("modalImage");
  const st = { s: 1, x: 0, y: 0 }, ptr = new Map();
  let mesafe0 = 0, s0 = 1, sonTap = { t: 0, x: 0, y: 0 }, hareket = 0;
  const MAKS = 8;
  const uygula = () => {
    const w = img.offsetWidth, h = img.offsetHeight;
    const mx = Math.max(0, w * (st.s - 1) / 2), my = Math.max(0, h * (st.s - 1) / 2);
    st.x = Math.min(mx, Math.max(-mx, st.x));
    st.y = Math.min(my, Math.max(-my, st.y));
    img.style.transform = `translate(${st.x}px,${st.y}px) scale(${st.s})`;
  };
  const yakinlastir = (yeni, cx, cy) => {
    yeni = Math.min(MAKS, Math.max(1, yeni));
    const oran = yeni / st.s;
    st.x = cx - (cx - st.x) * oran;
    st.y = cy - (cy - st.y) * oran;
    st.s = yeni;
    uygula();
  };
  const merkezeGore = (e) => { const r = sahne.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; };
  window.imgZoomSifirla = () => { st.s = 1; st.x = 0; st.y = 0; ptr.clear(); img.style.transform = ""; };

  sahne.addEventListener("wheel", e => {
    e.preventDefault();
    const [cx, cy] = merkezeGore(e);
    yakinlastir(st.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), cx, cy);
  }, { passive: false });

  sahne.addEventListener("pointerdown", e => {
    sahne.setPointerCapture(e.pointerId);
    if (!ptr.size) hareket = 0;
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.size === 2) {
      const [a, b] = [...ptr.values()];
      mesafe0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; s0 = st.s;
    }
    if (st.s > 1) sahne.classList.add("surukle");
  });
  sahne.addEventListener("pointermove", e => {
    const p = ptr.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    hareket += Math.abs(dx) + Math.abs(dy);
    if (ptr.size === 2) {
      const [a, b] = [...ptr.values()];
      const r = sahne.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left - r.width / 2, my = (a.y + b.y) / 2 - r.top - r.height / 2;
      yakinlastir(s0 * Math.hypot(a.x - b.x, a.y - b.y) / mesafe0, mx, my);
    } else if (st.s > 1) {
      st.x += dx; st.y += dy; uygula();
    }
  });
  const bitir = e => {
    if (!ptr.delete(e.pointerId)) return;
    if (!ptr.size) sahne.classList.remove("surukle");
    if (hareket < 10 && e.type === "pointerup") {
      const t = Date.now();
      if (t - sonTap.t < 320 && Math.hypot(e.clientX - sonTap.x, e.clientY - sonTap.y) < 30) {
        if (st.s > 1.05) { st.s = 1; st.x = 0; st.y = 0; uygula(); }
        else { const [cx, cy] = merkezeGore(e); yakinlastir(2.5, cx, cy); }
        sonTap = { t: 0, x: 0, y: 0 };
      } else sonTap = { t, x: e.clientX, y: e.clientY };
    }
  };
  sahne.addEventListener("pointerup", bitir);
  sahne.addEventListener("pointercancel", bitir);

  $("imgZoomKutu").addEventListener("click", e => {
    const b = e.target.closest("[data-izoom]");
    if (!b) return;
    const v = b.dataset.izoom;
    if (v === "+") yakinlastir(st.s * 1.5, 0, 0);
    else if (v === "-") yakinlastir(st.s / 1.5, 0, 0);
    else { st.s = 1; st.x = 0; st.y = 0; uygula(); }
  });
})();
