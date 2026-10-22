import { ikon } from "../../lib/ikon.js";
import { bashar, tipSinif } from "../../lib/tip.js";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { $ } from "../../lib/dom.js";
import { sessizAra } from "./sessiz-ara.js";
import { csvIndir, htmlGuvenli, jsGuvenliMetin, metniNormalizeEt } from "../../lib/text.js";
import { tumSehirler } from "../firms/benzer-firma.js";
import { db } from "../../firebase/init.js";
import { koddanNo } from "../../lib/firma-kodu.js";
import { tarihKarsilastir, tarihiInputaCevir } from "../../lib/dates.js";
import { duzenleyebilirMi, yoneticiMi } from "../../core/session.js";

export let SIRA_YONU = 1;

/* Arama ve rapor dışa aktarımı aynı sütunları kullanır */
export function formSatirlari(formlar) {
  const satirlar = [["Form Kodu", "Firma", "Şehir", "İşlem Tipi", "Ekleyen", "Tarih", "Sonraki Bakım", "Açıklama", "Enlem", "Boylam"]];
  const tr = iso => iso && !isNaN(new Date(iso)) ? new Date(iso).toLocaleDateString("tr-TR") : "";
  formlar.forEach(v => satirlar.push([v.formKodu, v.firmaAdi, v.sehir, v.islemTipi, v.ekleyen, tr(v.tarih), tr(v.sonrakiBakim), v.aciklama, v.konum?.lat ?? "", v.konum?.lng ?? ""]));
  return satirlar;
}

$("btnSiraYeni").addEventListener("click", function() {
    SIRA_YONU = 1;
    this.classList.add("active");
    $("btnSiraEski").classList.remove("active");
    if($("aramaKutusu").value !== "") sessizAra();
});

$("btnSiraEski").addEventListener("click", function() {
    SIRA_YONU = -1;
    this.classList.add("active");
    $("btnSiraYeni").classList.remove("active");
    if($("aramaKutusu").value !== "") sessizAra();
});

export const aramaKutusu = $("aramaKutusu");

const autoList = document.createElement("div");

autoList.className = "autocomplete-items";

aramaKutusu.parentNode.appendChild(autoList);

let aramaZamanlayici;

let aktifOneri = -1;

aramaKutusu.addEventListener("input", function () {
  clearTimeout(aramaZamanlayici);
  const val = this.value.trim(), na = metniNormalizeEt(val);
  autoList.innerHTML = "";
  if (!val) return;
  const oneriler = new Map();
  tumSehirler.forEach(s => { if (s.startsWith(na)) oneriler.set("sehir-" + s, { deger: s.toUpperCase(), tip: "📍 Şehir" }); });

  const ciz = () => {
    autoList.innerHTML = "";
    aktifOneri = -1;
    oneriler.forEach(o => {
      const div = document.createElement("div");
      div.className = "oneri-item";
      const orj = String(o.deger);
      let kucukOrjinal = metniNormalizeEt(orj);
      let arananIndex = kucukOrjinal.indexOf(na);
      let gosterimHTML = htmlGuvenli(orj);
      if (arananIndex !== -1) {
          let bas = htmlGuvenli(orj.substring(0, arananIndex));
          let orta = `<strong>${htmlGuvenli(orj.substring(arananIndex, arananIndex + val.length))}</strong>`;
          let son = htmlGuvenli(orj.substring(arananIndex + val.length));
          gosterimHTML = bas + orta + son;
      }
      div.innerHTML = `${gosterimHTML}${o.ek ? ` <span style="color:var(--text-muted);font-weight:500">(${htmlGuvenli(o.ek)})</span>` : ""} <span class="autocomplete-category">${htmlGuvenli(o.tip)}</span>`;
      div.addEventListener("click", () => { aramaKutusu.value = orj; autoList.innerHTML = ""; aktifOneri = -1; $("aramaButonu").click(); });
      autoList.appendChild(div);
    });
  };
  ciz();

  aramaZamanlayici = setTimeout(async () => {
    try {
      const hi = String.fromCharCode(63743);
      const VAL = val.toUpperCase().replace(/\s+/g, "");
      const harfler = /^[A-Z]+$/.test(VAL);
      const q1 = getDocs(query(collection(db, "formlar"), where("aramaFirma", ">=", na), where("aramaFirma", "<=", na + hi), limit(5)));
      const q2 = getDocs(query(collection(db, "formlar"), where("firmaKodu", ">=", VAL), where("firmaKodu", "<=", VAL + hi), limit(3)));
      const q3 = harfler
        ? getDocs(query(collection(db, "formlar"), where("firmaKodu", "==", VAL), limit(30)))
        : getDocs(query(collection(db, "formlar"), where("formKodu", ">=", VAL), where("formKodu", "<=", VAL + hi), limit(10)));

      const [sFirma, sFKod, sKod] = await Promise.all([q1, q2, q3]);
      let eklendi = false;
      sFirma.forEach(d => { const x = d.data(); if (x.firmaAdi) { oneriler.set("firma-" + x.aramaFirma, { deger: x.firmaAdi.toUpperCase(), ek: x.firmaKodu || "", tip: "🏢 Firma" }); eklendi = true; } });
      sFKod.forEach(d => { const x = d.data(); if (x.firmaKodu) { oneriler.set("fkod-" + x.firmaKodu, { deger: x.firmaKodu, ek: (x.firmaAdi || "").toUpperCase(), tip: "🏢 Firma kodu" }); eklendi = true; } });
      const kodlar = []; sKod.forEach(d => kodlar.push(d.data()));
      kodlar.filter(x => x.formKodu).sort((p, q) => (q.formNo || koddanNo(q.formKodu)) - (p.formNo || koddanNo(p.formKodu))).slice(0, 6)
        .forEach(x => { oneriler.set("kod-" + x.formKodu, { deger: x.formKodu, ek: (x.firmaAdi || "").toUpperCase(), tip: "🏷️ Ürün kodu" }); eklendi = true; });

      if (eklendi) ciz();
    } catch (err) { console.error("Öneri hatası:", err); }
  }, 150);
});

document.addEventListener("click", e => { if (e.target !== aramaKutusu) autoList.innerHTML = ""; });

function oneriVurgula(items) {
  items.forEach((el, i) => el.classList.toggle("aktif", i === aktifOneri));
  if (items[aktifOneri]) items[aktifOneri].scrollIntoView({ block: "nearest" });
}

aramaKutusu.addEventListener("keydown", e => {
  const items = Array.from(autoList.querySelectorAll(".oneri-item"));
  if (e.key === "Tab" && items.length) {
    e.preventDefault();
    if (e.shiftKey) aktifOneri = aktifOneri <= 0 ? items.length - 1 : aktifOneri - 1;
    else aktifOneri = (aktifOneri + 1) % items.length;
    oneriVurgula(items);
  } else if (e.key === "ArrowDown" && items.length) {
    e.preventDefault();
    aktifOneri = (aktifOneri + 1) % items.length;
    oneriVurgula(items);
  } else if (e.key === "ArrowUp" && items.length) {
    e.preventDefault();
    aktifOneri = aktifOneri <= 0 ? items.length - 1 : aktifOneri - 1;
    oneriVurgula(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (aktifOneri >= 0 && items[aktifOneri]) items[aktifOneri].click(); 
    else { autoList.innerHTML = ""; aktifOneri = -1; $("aramaButonu").click(); }
  } else if (e.key === "Escape") {
    autoList.innerHTML = ""; aktifOneri = -1;
  }
});

function kartHTMLOlustur(docId, fotoParam, firma, sehir, islem, ekleyen, tarih, isAdmin, aciklama, konum, formKodu, tarihHam, ek = "") {
  const codeDisplay = formKodu || "FRM-" + docId.substring(0, 5).toUpperCase();
  let admin = "";
  if (isAdmin) admin = `
    <button class="btn-icon btn-duzenle" onclick="formDuzenle('${docId}','${jsGuvenliMetin(firma)}','${jsGuvenliMetin(sehir)}','${jsGuvenliMetin(islem)}','${jsGuvenliMetin(aciklama || "")}','${tarihHam || ""}')" title="Düzenle" aria-label="Düzenle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
    <button class="btn-icon btn-sil" onclick="formSil('${docId}',${fotoParam})" title="Sil" aria-label="Sil">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
  const aciklamaHTML = aciklama ? `<div class="aciklama-kutusu">${htmlGuvenli(aciklama)}</div>` : "";
  const konumHTML = konum && konum.lat && konum.lng ? `<a href="https://maps.google.com/?q=${konum.lat},${konum.lng}" target="_blank" rel="noopener" class="badge-konum" onclick="event.stopPropagation()">${ikon("pin", 13)} Haritada gör</a>` : "";
  return `
    <div class="liste-karti tip-${tipSinif(islem)}" id="kart-${docId}">
      <div class="karti-ust">
        <span class="kart-avatar" aria-hidden="true">${bashar(firma)}</span>
        <div class="liste-karti-bilgi" onclick="resmiAc('${docId}',${fotoParam})">
          <h4>${htmlGuvenli(firma.toLocaleUpperCase("tr-TR"))} · ${htmlGuvenli(sehir.toLocaleUpperCase("tr-TR"))}</h4>
          <div class="detay-satiri">
            <span class="badge" style="background:var(--primary);color:#fff;">#${htmlGuvenli(codeDisplay)}</span>
            <span class="badge badge-tip">${ikon("wrench", 13)} ${htmlGuvenli(islem)}</span>
            <span class="badge">${ikon("user", 13)} ${htmlGuvenli(ekleyen)}</span>
            ${konumHTML}
          </div>
          ${ek}
          <p class="kart-tarih">${ikon("clock", 13)} ${htmlGuvenli(tarih)}</p>
        </div>
        <div class="liste-karti-butonlar">
          <button class="btn-icon btn-gor" onclick="resmiAc('${docId}',${fotoParam})" title="Fotoğrafı gör" aria-label="Fotoğrafı gör">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          ${admin}
        </div>
      </div>
      ${aciklamaHTML}
    </div>`;
}

export const gunFarki = iso => { const g = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); return Math.round((g(new Date(iso)) - g(new Date())) / 864e5); };

export function bakimRozeti(iso, blok) {
  const f = gunFarki(iso);
  const sinif = f < 0 ? "gec" : f <= 7 ? "yakin" : "";
  const yazi = f < 0 ? `⚠ Bakım ${-f} gün gecikti` : f === 0 ? "🔧 Bakım bugün" : `🔧 Bakıma ${f} gün (${new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })})`;
  return `<span class="bakim-rozet ${sinif}"${blok ? ' style="display:inline-block;margin-bottom:6px"' : ""}>${yazi}</span>`;
}

export function kartDokumuHTML(docId, v, tarihSecenek, isAdmin) {
  let tarih = "Tarih yok";
  if (v.tarih && !isNaN(new Date(v.tarih).getTime())) tarih = new Date(v.tarih).toLocaleDateString("tr-TR", tarihSecenek);
  (window.formCache = window.formCache || {})[docId] = v;
  const ek = (v.sonrakiBakim ? bakimRozeti(v.sonrakiBakim, true) + " " : "") +
    (duzenleyebilirMi() ? `<button type="button" class="btn-firma" style="margin:0 0 6px 0" onclick="event.stopPropagation();kaydiKopyala('${docId}')">⎘ Kopyala</button>` : "");
  return kartHTMLOlustur(docId, v.fotoId ? `'${v.fotoId}'` : "null", v.firmaAdi || "İSİMSİZ FİRMA", v.sehir || "belirsiz", v.islemTipi || "Belirtilmemiş", v.ekleyen ? v.ekleyen.split("@")[0] : "Bilinmiyor", tarih, isAdmin, v.aciklama, v.konum, v.formKodu, v.tarih, ek);
}

(function () {
  const hedef = $("fltIslem");
  [...$("islemTipi").options].forEach(o => { if (o.value) hedef.add(new Option(o.text, o.value)); });
  ["fltBaslangic", "fltBitis", "fltIslem"].forEach(id => $(id).addEventListener("change", () => { if ($("aramaKutusu").value.trim()) sessizAra(); }));
})();

window.aramaOnbellek = window.aramaOnbellek || new Map();

async function onbellekliSorgu(k, fn) {
  const e = aramaOnbellek.get(k); if (e && Date.now() - e.t < 60000) return e.d;
  const d = await fn(); aramaOnbellek.set(k, { t: Date.now(), d }); return d;
}

window.sonuclariCsvIndir = function () {
  const liste = window.sonAramaSonuclari || [];
  if (!liste.length) { showToast("Dışa aktarılacak sonuç yok.", "error"); return; }
  csvIndir(formSatirlari(liste.map(x => x.v)), "enorpa_formlar_" + tarihiInputaCevir() + ".csv");
};

/* Şehir / e-posta araması bir şehirdeki tüm kayıtları okumasın diye en yeni SEHIR_LIMIT kayıtla sınırlıdır.
   Tarih filtresi verilirse sunucuda uygulanır (firestore.indexes.json: sehir+tarih, ekleyen+tarih). */
const SEHIR_LIMIT = 300;
const tarihliSorgu = (alan, deger, bas, bit) => {
  const k = [where(alan, "==", deger)];
  if (bas) k.push(where("tarih", ">=", new Date(bas + "T00:00:00").toISOString()));
  if (bit) k.push(where("tarih", "<=", new Date(bit + "T23:59:59").toISOString()));
  return getDocs(query(collection(db, "formlar"), ...k, orderBy("tarih", "desc"), limit(SEHIR_LIMIT))).catch(e => {
    if (e.code !== "failed-precondition") throw e;   // bileşik indeks henüz yayınlanmadıysa eski (sırasız) sorguya düş
    console.warn("İndeks eksik (firebase deploy --only firestore:indexes):", e.message);
    return getDocs(query(collection(db, "formlar"), where(alan, "==", deger), limit(SEHIR_LIMIT)));
  });
};
$("aramaButonu").addEventListener("click", async () => {
  const kaydir = !window._aramaSessiz;   // kullanıcı kendisi aradıysa sonuçlara in
  const ham = aramaKutusu.value.trim(), arama = metniNormalizeEt(ham), div = $("sonuclar");
  if (!ham) { showToast("Lütfen arama kelimesi yazın.", "error"); return; }
  div.innerHTML = '<div class="skeleton skel-card"></div><div class="skeleton skel-card"></div><div class="skeleton skel-card"></div>';
  autoList.innerHTML = "";
  if (kaydir) { div.style.scrollMarginTop = "78px"; setTimeout(() => div.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  try {
    const hi = String.fromCharCode(63743);
    const bos = { empty: true, forEach() {} };
    const aramaBuyuk = ham.toUpperCase().replace("FRM-","").trim();

    const fBas = $("fltBaslangic").value, fBit = $("fltBitis").value, fIsl = $("fltIslem").value;
    const [s1, s2, s3, s4, s5] = await onbellekliSorgu([ham.toLowerCase(), fBas, fBit].join("|"), () => Promise.all([
      tumSehirler.includes(arama) ? tarihliSorgu("sehir", arama, fBas, fBit) : Promise.resolve(bos),
      getDocs(query(collection(db, "formlar"), where("aramaFirma", ">=", arama), where("aramaFirma", "<=", arama + hi), limit(30))),
      ham.includes("@") ? tarihliSorgu("ekleyen", ham.toLowerCase(), fBas, fBit) : Promise.resolve(bos),
      getDocs(query(collection(db, "formlar"), where("formKodu", "==", aramaBuyuk), limit(20))),
      getDocs(query(collection(db, "formlar"), where("firmaKodu", "==", aramaBuyuk), limit(300)))
    ]));

    let sonuc = [], gorulen = new Set();
    [s4, s5, s1, s2, s3].forEach(snap => snap.forEach(d => { if (!gorulen.has(d.id)) { gorulen.add(d.id); sonuc.push({ id: d.id, v: d.data() }); } }));

    if (fBas || fBit || fIsl) sonuc = sonuc.filter(x => {
      const t = tarihiInputaCevir(x.v.tarih);
      return (!fBas || t >= fBas) && (!fBit || t <= fBit) && (!fIsl || x.v.islemTipi === fIsl);
    });
    window.sonAramaSonuclari = sonuc;
    const sinirda = (s1.size || 0) >= SEHIR_LIMIT || (s3.size || 0) >= SEHIR_LIMIT;

    if (!sonuc.length) {
      div.innerHTML = `<div class="empty-state"><img src="logo.png" alt="" onerror="this.style.display='none'"><p>"${htmlGuvenli(ham)}" için form bulunamadı.</p><button type="button" class="btn btn-primary" onclick="yeniKayitAc('${jsGuvenliMetin(ham)}')">➕ Bu firmayı yeni kayıt olarak ekle</button></div>`;
      return;
    }

    const isAdmin = yoneticiMi();
    const opt = { day: "numeric", month: "short", year: "numeric" };

    const gruplar = {};
    sonuc.forEach(x => {
      const firmaGrup = (x.v.firmaAdi || "İSİMSİZ FİRMA").toLocaleUpperCase("tr-TR");
      if (!gruplar[firmaGrup]) gruplar[firmaGrup] = [];
      gruplar[firmaGrup].push(x);
    });

    const siraliGruplar = Object.entries(gruplar).map(([firmaAd, formlar]) => {
      formlar.sort((a, b) => SIRA_YONU * tarihKarsilastir(a.v, b.v));
      return { firmaAd, formlar, firmaKodu: (formlar.find(x => x.v.firmaKodu) || { v: {} }).v.firmaKodu || "", ilkTarih: new Date(formlar[0].v.tarih || 0).getTime() };
    });

    siraliGruplar.sort((a, b) => SIRA_YONU * (a.ilkTarih - b.ilkTarih));

    let htmlOut = `<div class="sonuc-bilgisi" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>${sonuc.length} Form (${siraliGruplar.length} Firma) listelendi${sinirda ? ` · en yeni ${SEHIR_LIMIT} kayıt gösteriliyor, daha eskiler için tarih filtresi verin` : ""}</span><button type="button" class="btn-siralama" onclick="sonuclariCsvIndir()">⬇ Excel (CSV)</button></div>`;

    const SAYFA_BOYU = 20;                       // bir seferde gösterilecek firma sayısı
    const grupHTML = grup => {
      const icerikHTML = grup.formlar.map(x => kartDokumuHTML(x.id, x.v, opt, isAdmin)).join("");
      return `
      <div class="firma-grup">
        <div class="firma-baslik" onclick="this.parentElement.classList.toggle('acik')">
          <span class="fb-sol"><span class="fb-av" aria-hidden="true">${bashar(grup.firmaAd)}</span><span class="fb-ad">${htmlGuvenli(grup.firmaAd)}</span>${grup.firmaKodu ? `<span class="badge" style="font-size:.7rem">${htmlGuvenli(grup.firmaKodu)}</span>` : ""}<span class="badge" style="background:var(--primary); color:#fff; border:none; padding: 2px 8px;">${grup.formlar.length}</span></span>
          <button type="button" class="btn-firma" onclick="event.stopPropagation();firmaKartiAc('${jsGuvenliMetin(grup.formlar[0].v.aramaFirma || metniNormalizeEt(grup.firmaAd))}','${jsGuvenliMetin(grup.firmaAd)}','${jsGuvenliMetin(grup.formlar[0].v.sehir || "")}')">ℹ Firma kartı</button>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        <div class="firma-icerik" onclick="event.stopPropagation()">
          ${icerikHTML}
        </div>
      </div>`;
    };
    window.aramaSayfa = { gruplar: siraliGruplar, goster: 0, grupHTML, boy: SAYFA_BOYU };
    const ilk = siraliGruplar.slice(0, SAYFA_BOYU);
    window.aramaSayfa.goster = ilk.length;
    htmlOut += ilk.map(grupHTML).join("");
    htmlOut += '<div id="dahaFazlaKutu"></div>';
    div.innerHTML = htmlOut;
    dahaFazlaButonuGuncelle();
  } catch (err) {
    console.error("Arama hatası:", err);
    div.innerHTML = `<p style="text-align:center;color:var(--danger);padding:20px">Arama sırasında hata oluştu: ${htmlGuvenli(err.message)}</p>`;
  }
});

function dahaFazlaButonuGuncelle() {
  const k = $("dahaFazlaKutu"), a = window.aramaSayfa;
  if (!k || !a) return;
  const kalan = a.gruplar.length - a.goster;
  k.innerHTML = kalan > 0
    ? `<button type="button" class="btn btn-primary" style="margin:6px 0 14px" onclick="dahaFazlaGoster()">Daha fazla göster (${kalan} firma kaldı)</button>`
    : "";
}

window.dahaFazlaGoster = function () {
  const a = window.aramaSayfa, k = $("dahaFazlaKutu");
  if (!a || !k) return;
  const parca = a.gruplar.slice(a.goster, a.goster + a.boy);
  a.goster += parca.length;
  k.insertAdjacentHTML("beforebegin", parca.map(a.grupHTML).join(""));
  dahaFazlaButonuGuncelle();
};
