import { collection, deleteField, doc, getDocs, writeBatch } from "firebase/firestore";
import { $ } from "../../lib/dom.js";
import { db } from "../../firebase/init.js";
import { metniNormalizeEt } from "../../lib/text.js";
import { firmaKodTaban, harfEki, koddanNo } from "../../lib/firma-kodu.js";
import { logYaz } from "../../core/session.js";
import { sayacId } from "../firms/firma-kodu-servis.js";

/* Eski kayıtları bakıma alır:
   - aramaFirma / firmaKodu / formNo / formKodu eksik veya çakışan kayıtları düzeltir (geçerli numaralara dokunmaz)
   - belgeye gömülü eski fotoğrafı (fotograf) ve imzaları (formVerisi.imza*) ayrı görsel belgesine taşır
   - form numarası sayaçlarını (sayaclar) ve firma kodu rezervasyonlarını (firmaKodlari) kurar
   Önce ne değişeceğini hesaplar ve onay ister; yazmalar 400'lük gruplar halinde yapılır. */
window.eskiKayitlariOptimizeEt = async function () {
  const btn = $("btnOptimize");
  btn.disabled = true; btn.innerText = "Kayıtlar inceleniyor…";
  try {
    const snap = await getDocs(collection(db, "formlar"));
    const firmalar = {};
    snap.forEach(d => {
      const data = d.data();
      const f = data.aramaFirma || metniNormalizeEt(data.firmaAdi);
      if (f) (firmalar[f] = firmalar[f] || []).push({ id: d.id, data });
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

    const islemler = [];   // { tur: "guncelle" | "foto" | "sayac" | "kod", ... }
    let kodDegisen = 0, fotoTasinan = 0, imzaTasinan = 0;
    for (const [f, dizi] of Object.entries(firmalar)) {
      dizi.sort((x, y) => new Date(x.data.tarih || 0) - new Date(y.data.tarih || 0));
      const kodF = firmaKod[f], kullNo = new Set(); let maks = 0;
      dizi.forEach(it => {
        const no = it.data.formNo || koddanNo(it.data.formKodu);
        if (no && !kullNo.has(no)) { it.no = no; kullNo.add(no); if (no > maks) maks = no; }
      });
      for (const item of dizi) {
        if (!item.no) item.no = ++maks;
        const g = {}, x = item.data;
        if (x.fotograf && !x.fotoId) {
          const ref = doc(collection(db, "formFotograflari"));
          islemler.push({ tur: "foto", ref, veri: { base64: x.fotograf } });
          g.fotoId = ref.id; g.fotograf = deleteField(); fotoTasinan++;
        }
        const fv = x.formVerisi;
        if (fv && (fv.imza || fv.imzaSorumlu)) {
          const ref = doc(collection(db, "formFotograflari"));
          islemler.push({ tur: "foto", ref, veri: { imza: fv.imza || "", imzaSorumlu: fv.imzaSorumlu || "", tur: "imza" } });
          g.imzaId = ref.id;
          g["formVerisi.imza"] = deleteField(); g["formVerisi.imzaSorumlu"] = deleteField();
          g["formVerisi.imzaVar"] = { musteri: !!fv.imza, sorumlu: !!fv.imzaSorumlu };
          imzaTasinan++;
        }
        if (!x.aramaFirma) g.aramaFirma = f;
        if (x.firmaKodu !== kodF) g.firmaKodu = kodF;
        if (x.formNo !== item.no) g.formNo = item.no;
        const yeniKod = `${kodF}${item.no}`;
        if (x.formKodu !== yeniKod) { g.formKodu = yeniKod; if (x.formKodu) kodDegisen++; }
        if (Object.keys(g).length) islemler.push({ tur: "guncelle", ref: doc(db, "formlar", item.id), veri: g });
      }
      islemler.push({ tur: "sayac", ref: doc(db, "sayaclar", sayacId(f)), veri: { firmaKodu: kodF, sonNo: maks, aramaFirma: f } });
      islemler.push({ tur: "kod", ref: doc(db, "firmaKodlari", kodF), veri: { aramaFirma: f } });
    }
    const guncellenecek = islemler.filter(x => x.tur === "guncelle").length;
    const ozet = `${snap.size} kayıt, ${Object.keys(firmalar).length} firma incelendi.\n\n` +
      `• ${guncellenecek} kayıt güncellenecek\n` +
      `• ${kodDegisen} kaydın mevcut form kodu DEĞİŞECEK (çakışan/eksik numaralar; basılı formlarla karşılaştırın)\n` +
      `• ${fotoTasinan} eski fotoğraf ve ${imzaTasinan} imza ayrı belgeye taşınacak\n` +
      `• ${Object.keys(firmalar).length} form numarası sayacı kurulacak\n\nDevam edilsin mi? (Öncesinde yedek almanız önerilir.)`;
    if (!confirm(ozet)) return;

    for (let i = 0; i < islemler.length; i += 400) {
      btn.innerText = `Yazılıyor ${Math.min(i + 400, islemler.length)}/${islemler.length}…`;
      const b = writeBatch(db);
      islemler.slice(i, i + 400).forEach(x => x.tur === "guncelle" ? b.update(x.ref, x.veri) : b.set(x.ref, x.veri));
      await b.commit();
    }
    showToast(`${guncellenecek} kayıt güncellendi, sayaçlar kuruldu`, "success");
    logYaz("Toplu optimize çalıştırıldı", "", `${guncellenecek} kayıt, ${kodDegisen} kod değişti, ${fotoTasinan} foto, ${imzaTasinan} imza taşındı`);
  } catch (e) { console.error(e); showToast("Hata: " + e.message, "error"); }
  finally { btn.disabled = false; btn.innerText = "Eski kayıtları optimize et"; }
};
