/* AI düğme görünümü: src/styles/ai-cam.css (cam efektli, içi mavi ışıltılı) */
const temiz = t => String(t).replace(/^✨\s*/, "");

export function aiButon(hedef, yer, metin, fn, stil = "") {
  if (!hedef) return null;
  const b = document.createElement("button"); b.type = "button"; b.className = "btn ai-btn"; b.textContent = temiz(metin);
  b.style.cssText = "width:auto;display:inline-block;padding:11px 20px;font-size:.85rem;margin:0 8px 12px 0;" + stil;
  b.addEventListener("click", async () => {
    const eski = b.textContent; b.disabled = true; b.textContent = "Düşünüyor…";
    let bekle = 0;
    try { await fn(); } catch (e) { console.error(e); showToast("AI: " + e.message, "error"); if (e && e.bekle > 0 && e.bekle <= 180) bekle = Math.ceil(e.bekle); }
    const etiket = temiz(b.dataset.etiket || eski);
    for (let sn = bekle; sn > 0; sn--) { b.textContent = `⏳ Kota doldu · ${sn} sn sonra dene`; await new Promise(r => setTimeout(r, 1000)); }   // kota dolduysa düğme geri sayar
    b.disabled = false; b.textContent = etiket;
  });
  hedef.insertAdjacentElement(yer, b); return b;
}

export const aiKutu = (hedef, yer) => { const d = document.createElement("div"); d.style.cssText = "white-space:pre-wrap;font-size:.9rem;line-height:1.5;margin:0 0 12px;padding:12px;border:1px solid #93b4f5;background:rgba(37,99,235,.07);border-radius:var(--r-md);display:none"; hedef.insertAdjacentElement(yer, d); return d; };

export const aiSis = "Sen bir teknik servis firmasının yardımcısısın. Türkçe yaz. Verilmeyen bilgiyi asla uydurma.";

export const bugun = () => new Date().toISOString().slice(0, 10);

export const olay = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
