import { addDoc, collection, deleteField, doc, getDocs, updateDoc } from "firebase/firestore";
import { $ } from "../../lib/dom.js";
import { db } from "../../firebase/init.js";
import { metniNormalizeEt } from "../../lib/text.js";
import { firmaKodTaban, harfEki, koddanNo } from "../../lib/firma-kodu.js";
import { logYaz } from "../../core/session.js";

window.eskiKayitlariOptimizeEt = async function () {
  if (!confirm("Arama altyapısı ve Form Kodları güncelleniyor. Onaylıyor musunuz?")) return;
  const btn = $("btnOptimize");
  btn.disabled = true; btn.innerText = "Optimize ediliyor…";
  try {
    const snap = await getDocs(collection(db, "formlar"));
    const firmalar = {};
    snap.forEach(d => {
      const data = d.data();
      const f = data.aramaFirma || metniNormalizeEt(data.firmaAdi);
      (firmalar[f] = firmalar[f] || []).push({ id: d.id, data });
    });

    const kullanilan = new Set(), firmaKod = {};
    for (const [f, dizi] of Object.entries(firmalar)) {
      const mevcut = (dizi.find(x => x.data.firmaKodu) || { data: {} }).data.firmaKodu;
      if (mevcut && !kullanilan.has(mevcut)) { firmaKod[f] = mevcut; kullanilan.add(mevcut); }
    }
    for (const f of Object.keys(firmalar)) {
      if (firmaKod[f]) continue;
      const taban = firmaKodTaban(f); let aday = taban, i = 0;
      while (kullanilan.has(aday)) aday = taban + harfEki(++i);
      firmaKod[f] = aday; kullanilan.add(aday);
    }

    let n = 0;
    for (const [f, dizi] of Object.entries(firmalar)) {
      dizi.sort((x, y) => new Date(x.data.tarih || 0) - new Date(y.data.tarih || 0));
      const kodF = firmaKod[f], kullNo = new Set(); let maks = 0;
      dizi.forEach(it => {
        const no = it.data.formNo || koddanNo(it.data.formKodu);
        if (no && !kullNo.has(no)) { it.no = no; kullNo.add(no); if (no > maks) maks = no; }
      });
      for (const item of dizi) {
        if (!item.no) item.no = ++maks;
        const g = {};
        if (item.data.fotograf && !item.data.fotoId) {
          const ref = await addDoc(collection(db, "formFotograflari"), { base64: item.data.fotograf });
          g.fotoId = ref.id; g.fotograf = deleteField();
        }
        if (!item.data.aramaFirma) g.aramaFirma = f;
        if (item.data.firmaKodu !== kodF) g.firmaKodu = kodF;
        if (item.data.formNo !== item.no) g.formNo = item.no;
        const yeniKod = `${kodF}${item.no}`;
        if (item.data.formKodu !== yeniKod) g.formKodu = yeniKod;
        if (Object.keys(g).length) { await updateDoc(doc(db, "formlar", item.id), g); n++; }
      }
    }
    showToast(`${n} kayıt optimize edildi ve kodlandı!`, "success"); logYaz("Toplu optimize çalıştırıldı", "", `${n} kayıt`);
    btn.style.display = "none";
  } catch (e) { showToast("Hata: " + e.message, "error"); }
  finally { btn.disabled = false; btn.innerText = "Eski kayıtları optimize et"; }
};
