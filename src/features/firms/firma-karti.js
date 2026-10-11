import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { db } from "../../firebase/init.js";
import { logYaz, yoneticiMi } from "../../core/session.js";
import { SIRA_YONU, kartDokumuHTML } from "../search/search.js";
import { tarihKarsilastir } from "../../lib/dates.js";

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
  $("fkSehir").textContent = sehir ? "📍 " + sehir : ""; $("fkSehir").style.display = sehir ? "inline-block" : "none";
  $("fkAvatar").textContent = firmaAdi.split(/\s+/).filter(Boolean).slice(0, 2).map(k => k[0]).join("").toLocaleUpperCase("tr-TR") || "F";
  fkIstGuncelle(Object.values(window.formCache || {}).filter(v => v.aramaFirma === aramaFirma)); $("fkZaman").innerHTML = "";
  ["fkYetkili", "fkEtiket", "fkTelefon", "fkAdres", "fkNot"].forEach(i => $(i).value = "");
  $("firmaModal").style.display = "flex"; fkLinkler();
  try {
    const s = await getDoc(doc(db, "firmalar", fkId));
    if (s.exists()) { const v = s.data(); $("fkYetkili").value = v.yetkili || ""; $("fkTelefon").value = v.telefon || ""; $("fkAdres").value = v.adres || ""; $("fkNot").value = v.notlar || ""; $("fkEtiket").value = v.etiketler || ""; fkLinkler(); }
  } catch (e) { console.error(e); showToast("Firma kartı okunamadı: " + e.message, "error"); }
  try {
    const q = await getDocs(query(collection(db, "formlar"), where("aramaFirma", "==", aramaFirma), limit(40)));
    const L = []; q.forEach(d => L.push(d.data())); fkIstGuncelle(L); fkZamanCiz(L); window._fkSon = L;
  } catch (e) { console.error(e); }
};

["fkTelefon", "fkAdres"].forEach(i => $(i).addEventListener("input", fkLinkler));

const fkKapat = () => { $("firmaModal").style.display = "none"; };

$("fkIptal").addEventListener("click", fkKapat);

$("fkX").addEventListener("click", fkKapat);

$("firmaModal").addEventListener("click", e => { if (e.target === $("firmaModal")) fkKapat(); });

document.addEventListener("keydown", e => { if (e.key === "Escape" && $("firmaModal").style.display === "flex") fkKapat(); });

$("fkKaydet").addEventListener("click", async () => {
  try {
    await setDoc(doc(db, "firmalar", fkId), { yetkili: $("fkYetkili").value.trim(), telefon: $("fkTelefon").value.trim(), adres: $("fkAdres").value.trim(), notlar: $("fkNot").value.trim(), etiketler: $("fkEtiket").value.trim(), guncelleyen: state.aktifKullaniciMail, guncellemeTarihi: new Date().toISOString() }, { merge: true }); logYaz("Firma kartı güncellendi", fkId, "");
    showToast("Firma kartı kaydedildi", "success"); $("firmaModal").style.display = "none";
  } catch (e) { showToast("Kaydedilemedi: " + e.message, "error"); }
});

onSnapshot(query(collection(db, "formlar"), orderBy("tarih", "desc"), limit(10)), { includeMetadataChanges: true }, snapshot => {
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
}, err => console.error("Canlı akış hatası:", err));
