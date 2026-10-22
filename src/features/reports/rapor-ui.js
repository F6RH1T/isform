import { raporGrafikCiz } from "./rapor-grafik.js";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { ilPaneliniCiz, raporHaritasiniCiz, secilenIl } from "./harita.js";
import { raporTamYenile, raporVerisi } from "./rapor-veri.js";
import { csvIndir, htmlGuvenli, metniNormalizeEt } from "../../lib/text.js";
import { formSatirlari } from "../search/search.js";
import { tarihiInputaCevir } from "../../lib/dates.js";

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
    raporGrafikCiz(state.tumFormlarGlobal);
    if (secilenIl) ilPaneliniCiz();
    showToast("Rapor oluşturuldu!", "success");
  } catch (err) { showToast("Hata: " + err.message, "error"); btn.disabled = false; btn.innerText = "Tekrar dene"; }
});

$("btnExcelIndir").addEventListener("click", () => {
  if (!state.tumFormlarGlobal.length) { showToast("Önce verileri analiz edin!", "error"); return; }
  csvIndir(formSatirlari(state.tumFormlarGlobal), `ENORPA_Form_Raporu_${tarihiInputaCevir()}.csv`);
  showToast("Excel dosyası indiriliyor", "success");
});
