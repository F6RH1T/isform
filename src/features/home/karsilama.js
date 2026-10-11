import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/init.js";
import { $ } from "../../lib/dom.js";

/* Ana ekran karşılama kartı: selam, tarih, bakım özeti, yeni kayıt kısayolu */
const selam = () => { const h = new Date().getHours(); return h < 6 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar"; };
const adCevir = mail => { const a = String(mail || "").split("@")[0].split(/[._-]/)[0]; return a ? a.charAt(0).toLocaleUpperCase("tr-TR") + a.slice(1) : "ENORPA"; };

function yaz(u) {
  $("ksSelam").textContent = selam();
  $("ksIsim").textContent = adCevir(u && u.email);
  $("ksTarih").textContent = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}
onAuthStateChanged(auth, yaz);

window.addEventListener("bakimOzet", e => {
  const d = e.detail || {};
  $("ksGec").textContent = d.gec ?? 0; $("ksHafta").textContent = d.hafta ?? 0; $("ksToplam").textContent = d.toplam ?? 0;
  $("karsilamaKart").classList.toggle("ks-uyari", (d.gec || 0) > 0);
});

$("ksYeni").addEventListener("click", () => {
  const n = document.querySelectorAll(".nav-item")[0];
  if (n && !$("tab-ekle").classList.contains("active")) window.sekmeyiDegistir("ekle", n);
  $("isFormu").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("firmaAdi").focus({ preventScroll: true }), 350);
});
