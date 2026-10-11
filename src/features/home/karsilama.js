import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase/init.js";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { htmlGuvenli } from "../../lib/text.js";

/* Ana ekran karşılama kartı: selam, tarih, bugün/hafta/ay form sayısı, son form, gecikmiş bakım uyarısı, yeni kayıt kısayolu.
   Sayılar Firestore sayım sorgusuyla alınır (belge okumaz, çok ucuzdur). */
const selam = () => { const h = new Date().getHours(); return h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar"; };
const adCevir = mail => { const a = String(mail || "").split("@")[0].split(/[._-]/)[0]; return a ? a.charAt(0).toLocaleUpperCase("tr-TR") + a.slice(1) : "ENORPA"; };

function yaz(u) {
  $("ksSelam").textContent = selam();
  $("ksIsim").textContent = adCevir(u && u.email);
  $("ksTarih").textContent = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

const goreli = iso => {
  const dk = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (isNaN(dk)) return "";
  if (dk < 2) return "az önce"; if (dk < 60) return dk + " dk önce";
  const sa = Math.round(dk / 60); if (sa < 24) return sa + " saat önce";
  const g = Math.round(sa / 24); return g < 30 ? g + " gün önce" : new Date(iso).toLocaleDateString("tr-TR");
};

let sonYenileme = 0, yukleniyor = false;
async function sayilariYenile(zorla = false) {
  if (yukleniyor || !state.aktifKullaniciMail) return;
  if (!zorla && Date.now() - sonYenileme < 30000) return;
  yukleniyor = true;
  try {
    const n = new Date(), y = n.getFullYear(), a = n.getMonth(), g = n.getDate(), hg = (n.getDay() + 6) % 7;
    const t = (yy, aa, gg) => new Date(yy, aa, gg, 0, 0, 0, 0).toISOString();   // yerel gün başı (UTC ISO); formlar öğlen 12:00 yerel saatle kaydedilir
    const kol = collection(db, "formlar");
    const say = (bas, bit) => getCountFromServer(query(kol, where("tarih", ">=", bas), where("tarih", "<", bit))).then(s => s.data().count);
    const [b, h, ay, son] = await Promise.all([
      say(t(y, a, g), t(y, a, g + 1)), say(t(y, a, g - hg), t(y, a, g - hg + 7)), say(t(y, a, 1), t(y, a + 1, 1)),
      getDocs(query(kol, orderBy("eklenmeTarihi", "desc"), limit(1))),
    ]);
    $("ksBugun").textContent = b; $("ksHafta").textContent = h; $("ksAy").textContent = ay;
    const s = son.docs[0] && son.docs[0].data(), kutu = $("ksSon");
    if (s) { kutu.innerHTML = `Son form: <b>${htmlGuvenli(s.firmaAdi || "")}</b>${s.sehir ? " · " + htmlGuvenli(s.sehir) : ""} · ${goreli(s.eklenmeTarihi)}`; kutu.style.display = "block"; }
    else kutu.style.display = "none";
    sonYenileme = Date.now();
  } catch (e) { console.warn("Ana ekran özeti alınamadı:", e.code || e); }
  finally { yukleniyor = false; }
}

onAuthStateChanged(auth, u => {
  yaz(u);
  if (u) state.rolHazir.then(ok => { if (ok) sayilariYenile(true); });
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { yaz(auth.currentUser); sayilariYenile(); } });

/* Yeni sekmeye dönüldüğünde (ör. form kaydedildikten sonra) sayıları tazele */
const eskiSekme = window.sekmeyiDegistir;
window.sekmeyiDegistir = function (...a) { eskiSekme.apply(this, a); if (a[0] === "ekle") sayilariYenile(); };

/* Gecikmiş bakım varsa kartta küçük bir uyarı; yoksa hiç görünmez */
window.addEventListener("bakimOzet", e => {
  const gec = (e.detail && e.detail.gec) || 0, b = $("ksBakim");
  b.textContent = gec ? `${gec} gecikmiş bakım var · göster` : ""; b.style.display = gec ? "block" : "none";
});
$("ksBakim").addEventListener("click", () => { const k = $("yaklasanKart"); if (k) k.scrollIntoView({ behavior: "smooth", block: "center" }); });

$("ksYeni").addEventListener("click", () => {
  const n = document.querySelectorAll(".nav-item")[0];
  if (n && !$("tab-ekle").classList.contains("active")) window.sekmeyiDegistir("ekle", n);
  $("isFormu").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("firmaAdi").focus({ preventScroll: true }), 350);
});
