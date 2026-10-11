import { collection, getDocs } from "firebase/firestore";
import { $ } from "../../lib/dom.js";
import { yoneticiMi } from "../../core/session.js";
import { db } from "../../firebase/init.js";
import { tarihiInputaCevir } from "../../lib/dates.js";

$("btnYedek").addEventListener("click", async () => {
  if (!yoneticiMi()) { showToast("Yetkiniz yok!", "error"); return; }
  showToast("Yedek hazırlanıyor…", "info");
  try {
    const out = { tarih: new Date().toISOString(), formlar: [], firmalar: [], personel: [] };
    (await getDocs(collection(db, "formlar"))).forEach(d => out.formlar.push({ id: d.id, ...d.data() }));
    try { (await getDocs(collection(db, "firmalar"))).forEach(d => out.firmalar.push({ id: d.id, ...d.data() })); } catch (e) { console.warn(e); }
    try { (await getDocs(collection(db, "personel"))).forEach(d => out.personel.push({ id: d.id, ...d.data() })); } catch (e) { console.warn(e); }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" })); a.download = "enorpa_yedek_" + tarihiInputaCevir() + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    showToast(out.formlar.length + " form yedeklendi", "success");
  } catch (e) { showToast("Yedek alınamadı: " + e.message, "error"); }
});
