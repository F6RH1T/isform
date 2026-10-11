import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { ilPaneliniCiz, raporHaritasiniCiz, secilenIl } from "./harita.js";
import { raporTamYenile, raporVerisi } from "./rapor-veri.js";
import { htmlGuvenli, metniNormalizeEt } from "../../lib/text.js";

let sonMobil = window.innerWidth < 1024;

window.addEventListener("resize", () => {
  const m = window.innerWidth < 1024;
  if (m !== sonMobil) { sonMobil = m; if ($("raporHaritaKutu").innerHTML) raporHaritasiniCiz(); }
});

$("btnRaporYenile").addEventListener("click", () => { raporTamYenile(); const b = $("btnRaporOlustur"); b.disabled = false; b.click(); });

$("btnRaporOlustur").addEventListener("click", async () => {
  const btn = $("btnRaporOlustur");
  btn.disabled = true; btn.innerText = "Analiz ediliyor…";
  try {
    const snap = await raporVerisi();
    state.tumFormlarGlobal = [];
    const sehirler = {}, islemler = {}, kisiler = {}, firmaSet = new Set();
    state.raporSehirVeri = {};
    snap.forEach(d => {
      const x = d.data(); state.tumFormlarGlobal.push(x);
      const sk = metniNormalizeEt(x.sehir || "belirsiz"); (state.raporSehirVeri[sk] = state.raporSehirVeri[sk] || []).push({ id: d.id, v: x });
      firmaSet.add(x.aramaFirma || metniNormalizeEt(x.firmaAdi));
      const s = (x.sehir || "Belirsiz").toLocaleUpperCase("tr-TR"); sehirler[s] = (sehirler[s] || 0) + 1;
      const i = (x.islemTipi || "Belirtilmemiş").toLocaleUpperCase("tr-TR"); islemler[i] = (islemler[i] || 0) + 1;
      const p = x.ekleyen ? x.ekleyen.split("@")[0] : "Bilinmiyor"; kisiler[p] = (kisiler[p] || 0) + 1;
    });
    $("statToplam").innerText = state.tumFormlarGlobal.length;
    const enCok = Object.entries(sehirler).sort((a, b) => b[1] - a[1])[0];
    $("statSehir").innerText = enCok ? `${enCok[0]} (${enCok[1]})` : "-";
    const liste = (o, ikon) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div class="rapor-item"><span>${ikon}${htmlGuvenli(k)}</span><strong>${n} kayıt</strong></div>`).join("");
    $("listeIslem").innerHTML = liste(islemler, "");
    $("listePersonel").innerHTML = liste(kisiler, "👤 ");
    $("listeSehir").innerHTML = liste(sehirler, "📍 ");
    $("statFirma").textContent = firmaSet.size;
    $("dashboardAlani").style.display = "block";
    btn.style.display = "none";
    raporHaritasiniCiz();
    if (secilenIl) ilPaneliniCiz();
    showToast("Rapor oluşturuldu!", "success");
  } catch (err) { showToast("Hata: " + err.message, "error"); btn.disabled = false; btn.innerText = "Tekrar dene"; }
});

$("btnExcelIndir").addEventListener("click", () => {
  if (!state.tumFormlarGlobal.length) { showToast("Önce verileri analiz edin!", "error"); return; }
  const h = t => String(t || "").replace(/;/g, ",").replace(/[\r\n]+/g, " ");
  let csv = String.fromCharCode(0xFEFF) + "Firma Adi;Sehir;Islem Tipi;Form Kodu;Ekleyen;Tarih;Enlem;Boylam;Aciklama" + String.fromCharCode(10);
  state.tumFormlarGlobal.forEach(v => {
    const t = v.tarih ? new Date(v.tarih).toLocaleDateString("tr-TR") : "";
    csv += [h(v.firmaAdi), h(v.sehir), h(v.islemTipi), h(v.formKodu), h(v.ekleyen), t, v.konum?.lat ?? "", v.konum?.lng ?? "", h(v.aciklama)].join(";") + String.fromCharCode(10);
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  link.download = `ENORPA_Form_Raporu_${new Date().toLocaleDateString("tr-TR")}.csv`;
  link.click();
  showToast("Excel dosyası indiriliyor", "success");
});
