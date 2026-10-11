import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { htmlGuvenli, metniNormalizeEt } from "../../lib/text.js";
import { db } from "../../firebase/init.js";
import { $ } from "../../lib/dom.js";
import { sehirIsimleri } from "../../lib/sehirler.js";
import { levenshtein } from "../../lib/levenshtein.js";

/* ===== BENZER FİRMA UYARISI ===== */
function benzerFirmaUyarisiKur(girdi) {
  const kutu = document.createElement("div");
  kutu.style.cssText = "display:none;grid-column:1/-1;margin:-6px 0 14px;padding:10px 12px;border-radius:var(--r-sm);background:var(--primary-soft);font-size:.82rem;line-height:1.5";
  girdi.closest(".form-floating").insertAdjacentElement("afterend", kutu);
  let zaman, sira = 0;
  girdi.addEventListener("input", () => {
    clearTimeout(zaman);
    const na = metniNormalizeEt(girdi.value);
    if (na.length < 3) { kutu.style.display = "none"; return; }
    zaman = setTimeout(async () => {
      const bu = ++sira;
      try {
        const hi = String.fromCharCode(63743), on = na.slice(0, 3);
        const snap = await getDocs(query(collection(db, "formlar"), where("aramaFirma", ">=", on), where("aramaFirma", "<=", on + hi), limit(60)));
        if (bu !== sira) return;
        const firmalar = new Map();
        snap.forEach(d => { const x = d.data(); if (x.aramaFirma && x.firmaAdi && !firmalar.has(x.aramaFirma)) firmalar.set(x.aramaFirma, x); });
        const tam = firmalar.get(na);
        const benzer = [...firmalar.entries()].filter(([k]) => k !== na && (k.startsWith(na) || na.startsWith(k) || levenshtein(k, na) <= Math.max(1, Math.floor(na.length / 6)))).slice(0, 3);
        if (!tam && !benzer.length) { kutu.style.display = "none"; return; }
        const satir = ([k, x]) => `<button type="button" class="btn-firma" style="margin:2px 4px 2px 0" data-ad="${htmlGuvenli(x.firmaAdi)}">${htmlGuvenli(x.firmaAdi.toLocaleUpperCase("tr-TR"))}${x.firmaKodu ? " (" + htmlGuvenli(x.firmaKodu) + ")" : ""} ✔ Seç</button>`;
        kutu.innerHTML = tam
          ? `✅ <b>${htmlGuvenli(tam.firmaAdi.toLocaleUpperCase("tr-TR"))}</b> zaten kayıtlı${tam.firmaKodu ? " (" + htmlGuvenli(tam.firmaKodu) + ")" : ""}; yeni form bu firmanın altına eklenecek.`
          : `⚠ Benzer firma var, onu mu seçmek istedin?<br>${benzer.map(satir).join("")}`;
        kutu.style.display = "block";
        kutu.querySelectorAll("[data-ad]").forEach(b => b.addEventListener("click", () => { girdi.value = b.dataset.ad; kutu.style.display = "none"; girdi.dispatchEvent(new Event("input")); }));
      } catch (e) { console.warn("Benzer firma kontrolü:", e); }
    }, 350);
  });
}

benzerFirmaUyarisiKur($("firmaAdi"));

benzerFirmaUyarisiKur($("ofFirma"));

export const tumSehirler = sehirIsimleri.map(metniNormalizeEt).concat("belirsiz");

[$("sehir"), $("editSehir"), $("ofSehir")].forEach(sel => {
  const belirsiz = sel.querySelector('option[value="belirsiz"]');
  sehirIsimleri.forEach(ad => { const o = document.createElement("option"); o.value = metniNormalizeEt(ad); o.text = ad; sel.insertBefore(o, belirsiz); });
});
