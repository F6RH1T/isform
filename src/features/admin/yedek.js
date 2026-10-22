import { collection, getDocs, limit, orderBy, query, startAfter } from "firebase/firestore";
import { $ } from "../../lib/dom.js";
import { logYaz, yoneticiMi } from "../../core/session.js";
import { db } from "../../firebase/init.js";
import { tarihiInputaCevir } from "../../lib/dates.js";

/* Tam yedek (JSON). Fotoğraflar çok yer kapladığı için isteğe bağlıdır ve sayfa sayfa okunur.
   Bu, elle alınan bir yedektir; düzenli ve geri yüklenebilir yedek için README'deki "Yedekleme" bölümüne bakın
   (Firestore zamanlanmış yedek / PITR). */
const KOLEKSIYONLAR = ["formlar", "firmalar", "personel", "kullanicilar", "islemGecmisi", "sayaclar", "firmaKodlari"];

async function hepsiniOku(ad, ilerleme) {
  const out = []; let son = null;
  for (;;) {
    const q = son ? query(collection(db, ad), orderBy("__name__"), startAfter(son), limit(500)) : query(collection(db, ad), orderBy("__name__"), limit(500));
    const snap = await getDocs(q);
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    ilerleme(ad, out.length);
    if (snap.size < 500) return out;
    son = snap.docs[snap.docs.length - 1];
  }
}

$("btnYedek").addEventListener("click", async () => {
  if (!yoneticiMi()) { showToast("Yetkiniz yok!", "error"); return; }
  const fotolu = confirm("Fotoğraflar da yedeğe eklensin mi?\n\nTamam: fotoğraflar dahil (dosya çok büyük olabilir)\nİptal: yalnızca kayıtlar");
  const btn = $("btnYedek"), etiket = btn.textContent;
  btn.disabled = true;
  const ilerleme = (ad, n) => { btn.textContent = `Yedekleniyor: ${ad} (${n})…`; };
  try {
    const out = { surum: 2, tarih: new Date().toISOString() };
    for (const ad of [...KOLEKSIYONLAR, ...(fotolu ? ["formFotograflari"] : [])]) {
      try { out[ad] = await hepsiniOku(ad, ilerleme); } catch (e) { console.warn(ad, e); out[ad] = { hata: e.code || e.message }; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
    a.download = "enorpa_yedek_" + tarihiInputaCevir() + (fotolu ? "_fotolu" : "") + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    logYaz("Yedek alındı", "", `${out.formlar.length || 0} form${fotolu ? ", fotoğraflar dahil" : ""}`);
    showToast((out.formlar.length || 0) + " form yedeklendi", "success");
  } catch (e) { showToast("Yedek alınamadı: " + e.message, "error"); }
  finally { btn.disabled = false; btn.textContent = etiket; }
});
