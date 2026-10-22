import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { state } from "../../core/state.js";
import { auth, db } from "../../firebase/init.js";
import { $ } from "../../lib/dom.js";
import { bakimRozeti, gunFarki } from "../search/search.js";
import { htmlGuvenli, jsGuvenliMetin, metniNormalizeEt } from "../../lib/text.js";
import { duzenleyebilirMi } from "../../core/session.js";
import { tarihiInputaCevir } from "../../lib/dates.js";
import { aciklamaNotu } from "../forms/yeni-kayit.js";

/* ===== YAKLAŞAN BAKIMLAR ===== */
let bakimDinleyici = null;
const BAKIM_LIMIT = 50;

function yaklasanBaslat() {
  if (bakimDinleyici) return;
  /* Alt sınır yok: ne kadar eski olursa olsun gecikmiş bakımlar da listelenir (en eskiden yeniye). */
  bakimDinleyici = onSnapshot(query(collection(db, "formlar"), where("sonrakiBakim", ">", ""), orderBy("sonrakiBakim"), limit(BAKIM_LIMIT)), snap => {
    const kutu = $("yaklasanKart");
    if (snap.empty) { kutu.style.display = "none"; window.dispatchEvent(new CustomEvent("bakimOzet", { detail: { gec: 0, hafta: 0, toplam: 0 } })); return; }
    window.bakimVeri = {}; let gec = 0, hafta = 0, h2 = "";
    snap.forEach(d => {
      const v = d.data(); window.bakimVeri[d.id] = v; const f = gunFarki(v.sonrakiBakim); if (f < 0) gec++; else if (f <= 7) hafta++;
      h2 += `<div class="bakim-satir" onclick="yaklasanAc('${jsGuvenliMetin(v.firmaAdi || "")}')"><span><b>${htmlGuvenli((v.firmaAdi || "").toLocaleUpperCase("tr-TR"))}</b> · ${htmlGuvenli(v.sehir || "")}<br><small style="color:var(--text-muted)">${htmlGuvenli(v.islemTipi || "")} · #${htmlGuvenli(v.formKodu || "")}${v.bakimAralik ? " · 🔁" + v.bakimAralik + " ay" : ""}</small></span><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${bakimRozeti(v.sonrakiBakim)}${duzenleyebilirMi() ? `<button type="button" class="btn-firma" title="Bakım yapıldı" onclick="event.stopPropagation();bakimYapildi('${d.id}')">✔ Yapıldı</button>` : ""}<button type="button" class="btn-firma" title="Takvime ekle" onclick="event.stopPropagation();bakimIcs('${d.id}')">📅</button></span></div>`;
    });
    window.dispatchEvent(new CustomEvent("bakimOzet", { detail: { gec, hafta, toplam: snap.size } }));
    if (gec && !window.gecUyarildi) { window.gecUyarildi = true; showToast("⚠ " + gec + " gecikmiş bakım var", "error"); }
    let h = '<div class="card-title" style="font-size:1.1rem;margin-bottom:8px">📅 Yaklaşan bakımlar</div>' +
      `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><span class="bakim-rozet gec">⚠ ${gec} gecikmiş</span><span class="bakim-rozet yakin">🔧 ${hafta} bu hafta</span><span class="bakim-rozet">${snap.size >= BAKIM_LIMIT ? "ilk " + BAKIM_LIMIT : snap.size + " toplam"}</span><button type="button" class="btn-firma" style="margin:0" onclick="gunRotasi()">🧭 Günün rotası</button></div>` + h2;
    kutu.innerHTML = h; kutu.style.display = "block";
  }, err => { bakimDinleyici = null; console.error("Bakım listesi hatası:", err); });
}

onAuthStateChanged(auth, u => { if (u) state.rolHazir.then(ok => { if (ok) yaklasanBaslat(); }); else { if (bakimDinleyici) bakimDinleyici(); bakimDinleyici = null; } });

/* Ekle sekmesini "İş formu tara" kartıyla açar (kopyala / bakım yapıldı / yeni kayıt kısayolları için) */
function taraFormunuAc() {
  sekmeyiDegistir("ekle", document.querySelectorAll(".nav-item")[0]);
  ekleModu("tara");
  window.scrollTo({ top: $("isFormu").offsetTop - 80, behavior: "smooth" });
}

window.bakimYapildi = function (id) {
  const v = (window.bakimVeri || {})[id]; if (!v) return;
  $("firmaAdi").value = v.firmaAdi || ""; $("sehir").value = v.sehir || "";
  if (!$("sehir").value) $("sehir").value = metniNormalizeEt(v.sehir || "");
  $("islemTipi").value = v.islemTipi || ""; $("formTarihi").value = tarihiInputaCevir();
  $("bakimTarihi").value = ""; $("bakimAralik").value = v.bakimAralik ? String(v.bakimAralik) : "";
  taraFormunuAc();
  window.bakimKaynakId = id;   // taraFormunuAc sekme değişiminde sıfırlanır; sonra ayarla
  showToast("Bakım formu hazırlandı, kontrol edip kaydedin", "info");
};

window.bakimIcs = function (id) {
  const v = (window.bakimVeri || {})[id]; if (!v) return;
  const p = n => String(n).padStart(2, "0"), g = d => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const bas = new Date(v.sonrakiBakim), bit = new Date(bas); bit.setDate(bit.getDate() + 1);
  const t = x => String(x || "").replace(/[,;\r\n]+/g, " ");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ENORPA//TR", "BEGIN:VEVENT", "UID:" + id + "@enorpa", "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d+/g, ""),
    "DTSTART;VALUE=DATE:" + g(bas), "DTEND;VALUE=DATE:" + g(bit), "SUMMARY:Bakım: " + t(v.firmaAdi), "DESCRIPTION:" + t(v.islemTipi) + " #" + t(v.formKodu), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" })); a.download = "bakim_" + g(bas) + ".ics";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

window.yeniKayitAc = function (ad) {
  taraFormunuAc(); $("firmaAdi").value = ad; $("firmaAdi").focus({ preventScroll: true });
};

window.fkIstGuncelle = function (fl) {
  const kisa = iso => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "2-digit" });
  const son = fl.map(v => v.tarih).filter(Boolean).sort().pop();
  const bak = fl.map(v => v.sonrakiBakim).filter(x => x && gunFarki(x) >= 0).sort()[0];
  $("fkIstForm").textContent = fl.length; $("fkIstSon").textContent = son ? kisa(son) : "—"; $("fkIstBakim").textContent = bak ? kisa(bak) : "—";
};

window.fkZamanCiz = function (L) {
  L = L.slice().sort((a, b) => new Date(b.tarih || 0) - new Date(a.tarih || 0)).slice(0, 8);
  $("fkZaman").innerHTML = L.length ? '<div class="alt-baslik">🕒 Son işlemler</div>' + L.map(v => `<div class="bakim-satir" style="cursor:default"><span>${htmlGuvenli(v.islemTipi || "")}<br><small style="color:var(--text-muted)">#${htmlGuvenli(v.formKodu || "")}${v.aciklama ? " · " + htmlGuvenli(String(v.aciklama).slice(0, 40)) : ""}</small></span><small>${v.tarih ? new Date(v.tarih).toLocaleDateString("tr-TR") : ""}</small></div>`).join("") : "";
};


window.gunRotasi = function () {
  const l = Object.values(window.bakimVeri || {}).filter(v => gunFarki(v.sonrakiBakim) <= 7)
    .sort((a, b) => a.sonrakiBakim.localeCompare(b.sonrakiBakim)).slice(0, 10)
    .map(v => v.konum && v.konum.lat ? v.konum.lat + "," + v.konum.lng : ((v.firmaAdi || "") + " " + (v.sehir || "")).trim());
  const durak = [...new Set(l)];
  if (!durak.length) { showToast("Bu hafta için rota oluşturacak bakım yok.", "info"); return; }
  const son = durak.pop();
  window.open("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(son) + (durak.length ? "&waypoints=" + encodeURIComponent(durak.join("|")) : ""), "_blank");
};

window.kaydiKopyala = function (id) {
  const v = (window.formCache || {})[id]; if (!v) return;
  $("firmaAdi").value = v.firmaAdi || ""; $("sehir").value = v.sehir || ""; if (!$("sehir").value) $("sehir").value = metniNormalizeEt(v.sehir || "");
  $("islemTipi").value = v.islemTipi || ""; aciklamaNotu.value = v.aciklama || ""; $("formTarihi").value = tarihiInputaCevir();
  $("bakimTarihi").value = ""; $("bakimAralik").value = v.bakimAralik ? String(v.bakimAralik) : "";
  taraFormunuAc();
  showToast("Kayıt kopyalandı; fotoğrafı ekleyip kaydedin", "info");
};

window.yaklasanAc = function (firma) {
  $("aramaKutusu").value = firma;
  sekmeyiDegistir("ara", document.querySelectorAll(".nav-item")[1]);
  $("aramaButonu").click();
};
