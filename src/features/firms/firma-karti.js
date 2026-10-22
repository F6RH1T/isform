import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { auth, db } from "../../firebase/init.js";
import { onAuthStateChanged } from "firebase/auth";
import { duzenleyebilirMi, logYaz, yoneticiMi } from "../../core/session.js";
import { SIRA_YONU, kartDokumuHTML } from "../search/search.js";
import { tarihKarsilastir } from "../../lib/dates.js";
import { sehirGoster } from "../../lib/sehirler.js";
import { ikon } from "../../lib/ikon.js";
import { htmlGuvenli } from "../../lib/text.js";
import { disaridanKapat, temizSay } from "../../ui/modal.js";

/* ===== FİRMA KARTI ===== */
let fkId = "";

const fkLinkler = () => {
  const tel = $("fkTelefon").value.replace(/[^\d+]/g, "");
  let wa = tel.replace(/^\+/, ""); if (wa.startsWith("00")) wa = wa.slice(2); else if (wa.startsWith("0")) wa = "90" + wa.slice(1); else if (wa.length === 10) wa = "90" + wa;
  $("fkAra").href = tel ? "tel:" + tel : "#"; $("fkAra").classList.toggle("pasif", !tel);
  $("fkWa").href = wa ? "https://wa.me/" + wa : "#"; $("fkWa").classList.toggle("pasif", !wa);
  $("fkHarita").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent($("fkAdres").value.trim() || $("fkAlt").textContent);
};

window.firmaKartiAc = async function (aramaFirma, firmaAdi, sehir) {
  fkId = encodeURIComponent(aramaFirma);
  $("fkBaslik").textContent = firmaAdi; $("fkAlt").textContent = (firmaAdi + " " + sehir).trim();
  $("fkSehir").innerHTML = sehir ? ikon("pin", 13) + " " + htmlGuvenli(sehirGoster(sehir)) : ""; $("fkSehir").style.display = sehir ? "inline-flex" : "none";
  $("fkAvatar").textContent = firmaAdi.split(/\s+/).filter(Boolean).slice(0, 2).map(k => k[0]).join("").toLocaleUpperCase("tr-TR") || "F";
  fkIstGuncelle(Object.values(window.formCache || {}).filter(v => v.aramaFirma === aramaFirma)); $("fkZaman").innerHTML = "";
  ["fkYetkili", "fkEtiket", "fkTelefon", "fkAdres", "fkNot"].forEach(i => $(i).value = "");
  fkKayitli = {}; fkOkumaCiz(true); fkMod(false);
  temizSay($("firmaModal")); $("firmaModal").style.display = "flex"; fkLinkler();
  try {
    const s = await getDoc(doc(db, "firmalar", fkId));
    if (s.exists()) { const v = s.data(); fkKayitli = { yetkili: v.yetkili || "", telefon: v.telefon || "", adres: v.adres || "", notlar: v.notlar || "", etiketler: v.etiketler || "" }; }
  } catch (e) { console.error(e); showToast("Firma kartı okunamadı: " + e.message, "error"); }
  fkDoldur(fkKayitli); fkLinkler(); fkOkumaCiz();
  fkMod(!fkBilgiVar() && duzenleyebilirMi());   // bilgi yoksa doğrudan form açılır
  try {
    const q = await getDocs(query(collection(db, "formlar"), where("aramaFirma", "==", aramaFirma), limit(40)));
    const L = []; q.forEach(d => L.push(d.data())); fkIstGuncelle(L); fkZamanCiz(L); window._fkSon = L;
  } catch (e) { console.error(e); }
};

["fkTelefon", "fkAdres"].forEach(i => $(i).addEventListener("input", fkLinkler));

/* Okuma görünümü: kayıtlı bilgiler ikon + metin olarak; "Düzenle" ile forma geçilir */
let fkKayitli = {};
const FK_ALAN = { yetkili: "fkYetkili", telefon: "fkTelefon", adres: "fkAdres", notlar: "fkNot", etiketler: "fkEtiket" };
const fkDoldur = v => Object.entries(FK_ALAN).forEach(([k, id]) => { $(id).value = v[k] || ""; });
const fkBilgiVar = () => Object.values(fkKayitli).some(x => String(x || "").trim());
function fkOkumaCiz(yukleniyor = false) {
  const v = fkKayitli, kutu = $("fkOkuma");
  if (yukleniyor) { kutu.innerHTML = '<div class="skeleton" style="height:120px"></div>'; return; }
  const tel = String(v.telefon || "").trim(), telHref = tel.replace(/[^\d+]/g, "");
  const satir = (ik, et, deger) => `<div class="fko-satir"><span class="fko-ik">${ikon(ik, 16)}</span><div class="fko-metin"><small>${et}</small>${deger}</div></div>`;
  const etiketler = String(v.etiketler || "").split(",").map(x => x.trim()).filter(Boolean);
  const h = [
    v.yetkili && satir("user", "Yetkili kişi", `<b>${htmlGuvenli(v.yetkili)}</b>`),
    tel && satir("phone", "Telefon", `<a href="tel:${htmlGuvenli(telHref)}">${htmlGuvenli(tel)}</a>`),
    v.adres && satir("pin", "Adres", `<span class="fko-cok">${htmlGuvenli(v.adres)}</span>`),
    etiketler.length && satir("tag", "Etiketler", `<span class="fko-etiketler">${etiketler.map(x => `<span>${htmlGuvenli(x)}</span>`).join("")}</span>`),
    v.notlar && satir("note", "Notlar", `<span class="fko-cok">${htmlGuvenli(v.notlar)}</span>`)
  ].filter(Boolean).join("");
  kutu.innerHTML = h || `<div class="fko-bos">${ikon("info", 16)} Bu firma için henüz iletişim bilgisi girilmemiş.${duzenleyebilirMi() ? " <b>Düzenle</b> ile ekleyebilirsiniz." : ""}</div>`;
}
/* duzenle=true: form + Vazgeç/Kaydet; false: okuma + Kapat/Düzenle */
function fkMod(duzenle) {
  $("fkForm").style.display = duzenle ? "" : "none";
  $("fkOkuma").style.display = duzenle ? "none" : "";
  $("fkKaydet").style.display = duzenle ? "" : "none";
  $("fkDuzenle").style.display = !duzenle && duzenleyebilirMi() ? "" : "none";
  $("fkIptal").textContent = duzenle ? "Vazgeç" : "Kapat";
  $("firmaModal").dataset.duzenle = duzenle ? "1" : "";
}
window.fkDuzenleModu = () => { fkMod(true); };   // kartvizitten doldurma gibi dış akışlar için
$("fkDuzenle").addEventListener("click", () => { fkMod(true); setTimeout(() => $("fkYetkili").focus(), 50); });

/* Boşluğa dokununca kapanır; kaydedilmemiş değişiklik varsa önce sorar (yazılanlar kaybolmasın). */
const fkKapat = () => { $("firmaModal").style.display = "none"; };
disaridanKapat($("firmaModal"), fkKapat);

/* Düzenlerken Vazgeç: kayıtlı bilgi varsa okumaya döner (değişiklikler geri alınır), yoksa kapanır */
$("fkIptal").addEventListener("click", () => {
  if ($("firmaModal").dataset.duzenle !== "1" || !fkBilgiVar()) { fkKapat(); return; }
  fkDoldur(fkKayitli); fkLinkler(); temizSay($("firmaModal")); fkMod(false);
});

$("fkX").addEventListener("click", fkKapat);

document.addEventListener("keydown", e => { if (e.key === "Escape" && $("firmaModal").style.display === "flex") fkKapat(); });

$("fkKaydet").addEventListener("click", async () => {
  try {
    const v = Object.fromEntries(Object.entries(FK_ALAN).map(([k, id]) => [k, $(id).value.trim()]));
    await setDoc(doc(db, "firmalar", fkId), { ...v, guncelleyen: state.aktifKullaniciMail, guncellemeTarihi: new Date().toISOString() }, { merge: true }); logYaz("Firma kartı güncellendi", fkId, "");
    fkKayitli = v; fkOkumaCiz(); temizSay($("firmaModal")); fkMod(false);
    showToast("Firma kartı kaydedildi", "success");
  } catch (e) { showToast("Kaydedilemedi: " + e.message, "error"); }
});

/* Akış: son 10 kayıt canlı. Oturum ve rol hazır olunca başlar, çıkışta kapanır (oturumsuz dinleyici kuralda reddedilir). */
let akisDinleyici = null;
function akisBaslat() {
  if (akisDinleyici) return;
  akisDinleyici = onSnapshot(query(collection(db, "formlar"), orderBy("tarih", "desc"), limit(10)), { includeMetadataChanges: true }, snapshot => {
    const div = $("canliAkanlar"), bar = $("bekleyenBar"); let bekleyen = 0;
    snapshot.forEach(d => { if (d.metadata.hasPendingWrites) bekleyen++; });
    bar.textContent = `📡 ${bekleyen} kayıt gönderilmeyi bekliyor`; bar.style.display = bekleyen ? "inline-block" : "none";
    if (snapshot.empty) {
      div.innerHTML = '<div class="empty-state"><img src="logo.png" alt="" onerror="this.style.display=\'none\'"><p>Henüz form eklenmemiş.</p></div>';
      return;
    }
    const isAdmin = yoneticiMi();
    const opt = { day: "numeric", month: "short", year: "numeric" };
    const docs = []; snapshot.forEach(d => docs.push({ id: d.id, v: d.data() }));
    docs.sort((a, b) => SIRA_YONU * tarihKarsilastir(a.v, b.v));
    let html = docs.map(x => kartDokumuHTML(x.id, x.v, opt, isAdmin)).join("");
    div.innerHTML = html;
  }, err => { akisDinleyici = null; console.error("Canlı akış hatası:", err); });
}
onAuthStateChanged(auth, u => {
  if (u) state.rolHazir.then(ok => { if (ok) akisBaslat(); });
  else if (akisDinleyici) { akisDinleyici(); akisDinleyici = null; }
});
