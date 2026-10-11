const aiStil = document.createElement("style");

aiStil.textContent = `.ai-btn{position:relative;overflow:hidden;color:#111;font-weight:600;border:1px solid rgba(255,255,255,.9);border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(236,239,244,.72));-webkit-backdrop-filter:blur(16px) saturate(170%);backdrop-filter:blur(16px) saturate(170%);box-shadow:inset 2px 0 3px -1px rgba(0,0,0,.6),inset 0 2px 3px -1px rgba(0,0,0,.35),inset -1px -2px 3px rgba(255,255,255,.95),0 8px 18px rgba(0,0,0,.14),0 1px 2px rgba(0,0,0,.2);text-shadow:none;transition:transform .15s,box-shadow .15s}.ai-btn:active{transform:scale(.96)}.ai-btn:disabled{opacity:.7}[data-theme=dark] .ai-btn{color:#f5f7ff;border-color:rgba(255,255,255,.28);background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.08));box-shadow:inset 1px 1px 2px rgba(255,255,255,.4),inset 0 -2px 4px rgba(0,0,0,.45),0 8px 18px rgba(0,0,0,.5)}button.btn.ai-btn{color:#f26522}`;

document.head.appendChild(aiStil);

export function aiButon(hedef, yer, metin, fn, stil = "") {
  if (!hedef) return null;
  const b = document.createElement("button"); b.type = "button"; b.className = "btn ai-btn"; b.textContent = metin;
  b.style.cssText = "width:auto;display:inline-block;padding:11px 20px;font-size:.85rem;margin:0 8px 12px 0;" + stil;
  b.addEventListener("click", async () => {
    const eski = b.textContent; b.disabled = true; b.textContent = "✨ Düşünüyor…";
    let bekle = 0;
    try { await fn(); } catch (e) { console.error(e); showToast("AI: " + e.message, "error"); if (e && e.bekle > 0 && e.bekle <= 180) bekle = Math.ceil(e.bekle); }
    const etiket = b.dataset.etiket || eski;
    for (let sn = bekle; sn > 0; sn--) { b.textContent = `⏳ Kota doldu · ${sn} sn sonra dene`; await new Promise(r => setTimeout(r, 1000)); }   // kota dolduysa düğme geri sayar
    b.disabled = false; b.textContent = etiket;
  });
  hedef.insertAdjacentElement(yer, b); return b;
}

export const aiKutu = (hedef, yer) => { const d = document.createElement("div"); d.style.cssText = "white-space:pre-wrap;font-size:.9rem;line-height:1.5;margin:0 0 12px;padding:12px;border:1px solid #93b4f5;background:rgba(37,99,235,.07);border-radius:var(--r-md);display:none"; hedef.insertAdjacentElement(yer, d); return d; };

export const aiSis = "Sen bir teknik servis firmasının yardımcısısın. Türkçe yaz. Verilmeyen bilgiyi asla uydurma.";

export const bugun = () => new Date().toISOString().slice(0, 10);

export const olay = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
