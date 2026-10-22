import { deleteField, doc, updateDoc, writeBatch } from "firebase/firestore";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { metniNormalizeEt } from "../../lib/text.js";
import { ayEkle, inputtanIsoYap, tarihiInputaCevir } from "../../lib/dates.js";
import { formNoAyir } from "../firms/firma-kodu-servis.js";
import { vektorHazirla } from "../ai/embeddings.js";
import { db } from "../../firebase/init.js";
import { raporKayitSil, raporKayitYenile } from "../reports/rapor-veri.js";
import { logYaz, yoneticiMi } from "../../core/session.js";
import { sessizAra } from "../search/sessiz-ara.js";
import { disaridanKapat, temizSay } from "../../ui/modal.js";

window.modaliKapatEdit = () => { $("editModal").style.display = "none"; state.guncellenecekDocId = null; };

$("btnEditCancel").addEventListener("click", window.modaliKapatEdit);
disaridanKapat($("editModal"), window.modaliKapatEdit);

document.addEventListener("keydown", e => { if (e.key === "Escape") { window.modaliKapat(); window.modaliKapatEdit(); } });

window.formDuzenle = function (docId, eskiFirma, eskiSehir, eskiIslem, eskiAciklama, eskiTarih) {
  state.guncellenecekDocId = docId;
  state.guncellenecekEskiAramaFirma = metniNormalizeEt(eskiFirma);
  $("editFirmaAdi").value = eskiFirma;
  $("editSehir").value = metniNormalizeEt(eskiSehir);
  $("editIslemTipi").value = eskiIslem || "";
  $("editAciklama").value = eskiAciklama && eskiAciklama !== "undefined" ? eskiAciklama : "";
  $("editTarih").value = tarihiInputaCevir(eskiTarih);
  const onceki = (window.formCache || {})[docId];
  $("editAralik").value = onceki && onceki.bakimAralik ? String(onceki.bakimAralik) : "";
  $("editBakim").value = onceki && onceki.sonrakiBakim ? tarihiInputaCevir(onceki.sonrakiBakim) : "";
  temizSay($("editModal")); $("editModal").style.display = "flex";
};

$("btnEditSave").addEventListener("click", async () => {
  if (!state.guncellenecekDocId) return;
  const firma = $("editFirmaAdi").value.trim(), sehir = $("editSehir").value, islem = $("editIslemTipi").value, aciklama = $("editAciklama").value.trim();
  const editTarih = $("editTarih").value;
  if (!firma || !sehir || !islem) { showToast("Lütfen boş alan bırakmayın.", "error"); return; }
  if (!editTarih) { showToast("Lütfen form tarihini girin.", "error"); return; }
  try {
    $("btnEditSave").innerText = "⏳…";
    const yeniArama = metniNormalizeEt(firma);
    const g = { firmaAdi: firma, aramaFirma: yeniArama, sehir, islemTipi: islem, aciklama, tarih: inputtanIsoYap(editTarih), bakimAralik: $("editAralik").value ? Number($("editAralik").value) : deleteField(),
      sonrakiBakim: $("editBakim").value ? inputtanIsoYap($("editBakim").value) : ($("editAralik").value ? ayEkle(inputtanIsoYap(editTarih), $("editAralik").value) : deleteField()) };
    if (yeniArama !== state.guncellenecekEskiAramaFirma) {
      const { firmaKodu, ilkNo } = await formNoAyir(yeniArama);
      g.firmaKodu = firmaKodu; g.formNo = ilkNo; g.formKodu = `${firmaKodu}${ilkNo}`;
    }
    const eskiKayit = (window.formCache || {})[state.guncellenecekDocId] || {};
    const alanAdlari = { firmaAdi: "firma", sehir: "şehir", islemTipi: "işlem tipi", aciklama: "açıklama", tarih: "tarih" };
    const degisenler = Object.keys(alanAdlari).filter(a => eskiKayit[a] !== undefined && (a === "tarih" ? tarihiInputaCevir(eskiKayit[a]) !== tarihiInputaCevir(g[a]) : String(eskiKayit[a] ?? "") !== String(g[a] ?? ""))).map(a => alanAdlari[a]);
    if ((eskiKayit.aciklama || "") !== aciklama || (eskiKayit.islemTipi || "") !== islem) {   // metin değiştiyse anlamsal vektörü yenile
      const vv = await vektorHazirla(islem, aciklama);
      Object.assign(g, vv.vektor ? vv : { vektor: deleteField(), vektorSurum: deleteField() });
    }
    await updateDoc(doc(db, "formlar", state.guncellenecekDocId), g);
    raporKayitYenile(state.guncellenecekDocId);
    logYaz("Form düzenlendi", `${eskiKayit.formKodu || g.formKodu || state.guncellenecekDocId} · ${firma}`, degisenler.length ? "Değişen: " + degisenler.join(", ") : "");
    window.modaliKapatEdit();
    showToast("Kayıt güncellendi", "success");
    if ($("aramaKutusu").value !== "") sessizAra();
  } catch (e) { showToast("Hata: " + e.message, "error"); }
  finally { $("btnEditSave").innerText = "Kaydet"; }
});

window.formSil = async function (docId, fotoId) {
  if (!yoneticiMi()) { showToast("Yetkiniz yok!", "error"); return; }
  if (!confirm("Bu formu kalıcı olarak silmek istediğinize emin misiniz?")) return;
  try {
    const silinen = (window.formCache || {})[docId] || {};
    /* Form ve bağlı tüm görseller (ana fotoğraf, PDF'in ek sayfaları, imzalar) tek seferde silinir */
    const b = writeBatch(db);
    const ekler = [fotoId, ...(silinen.ekFotoIdler || []), silinen.imzaId].filter(x => x && x !== "null" && x !== "undefined");
    new Set(ekler).forEach(id => b.delete(doc(db, "formFotograflari", id)));
    b.delete(doc(db, "formlar", docId));
    await b.commit();
    raporKayitSil(docId);
    logYaz("Form silindi", `${silinen.formKodu || docId} · ${silinen.firmaAdi || ""}`, [silinen.islemTipi, (silinen.tarih || "").slice(0, 10), (silinen.aciklama || "").slice(0, 120)].filter(Boolean).join(" · "));
    const k = $("kart-" + docId); if (k) k.style.display = "none";
    showToast("Form silindi", "success");
  } catch (e) { showToast("Hata: " + e.message, "error"); }
};
