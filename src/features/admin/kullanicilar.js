import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { db } from "../../firebase/init.js";
import { logYaz, yoneticiMi } from "../../core/session.js";
import { htmlGuvenli } from "../../lib/text.js";
import { ikon } from "../../lib/ikon.js";

/* ===== YÖNETİM: KULLANICILAR + İŞLEM GEÇMİŞİ (yalnızca yönetici) ===== */
const ROL_ADI = { yonetici: "Yönetici", duzenleyen: "Düzenleyen", goruntuleyen: "Görüntüleyen" };

function kullaniciModalHazirla() {
  if ($("kullaniciModal")) return $("kullaniciModal");
  const m = document.createElement("div"); m.id = "kullaniciModal"; m.className = "yonetim-modal";
  m.innerHTML = `<div class="ym-kart" role="dialog" aria-labelledby="kmBaslik">
    <div class="ym-ust"><b id="kmBaslik">${ikon("users", 20)} Yönetim</b><button type="button" id="kmKapat" class="ym-x" aria-label="Kapat">${ikon("x", 18)}</button></div>
    <div class="ym-sekmeler" role="tablist"><button type="button" id="kmSekK" role="tab">${ikon("users", 15)} Kullanıcılar</button><button type="button" id="kmSekG" role="tab">${ikon("history", 15)} İşlem geçmişi</button></div>
    <div id="kmPanelK">
      <div class="ym-ekle">
        <input id="kmMail" type="email" placeholder="yeni.kisi@enorpa.com" aria-label="E-posta" class="ym-girdi">
        <select id="kmRol" class="ym-girdi" aria-label="Rol"><option value="goruntuleyen">Görüntüleyen</option><option value="duzenleyen">Düzenleyen</option><option value="yonetici">Yönetici</option></select>
        <button type="button" id="kmEkle" class="btn btn-primary">${ikon("plus", 16)} Ekle</button>
      </div>
      <div id="kmListe" class="ym-liste"></div>
      <p class="ym-not">Yeni kişinin giriş hesabı (e-posta/şifre) Firebase Authentication'dan ayrıca açılmalıdır. Burada yalnızca uygulamadaki yetkisi belirlenir. Kendi kaydınızı buradan değiştiremezsiniz.</p>
    </div>
    <div id="kmPanelG" style="display:none">
      <input id="kmGFiltre" type="search" placeholder="Süz: kişi, işlem, firma, form kodu…" aria-label="İşlem geçmişini süz" class="ym-girdi ym-tam">
      <div id="kmGListe" class="ym-liste"></div>
      <button type="button" id="kmGDaha" class="btn btn-ikincil" style="display:none;margin-top:10px">Daha eski kayıtlar</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) m.style.display = "none"; });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && m.style.display === "flex") m.style.display = "none"; });
  $("kmKapat").addEventListener("click", () => m.style.display = "none");
  const sekme = g => {
    $("kmPanelK").style.display = g ? "none" : "block"; $("kmPanelG").style.display = g ? "block" : "none";
    for (const [id, aktif] of [["kmSekK", !g], ["kmSekG", g]]) { const b = $(id); b.classList.toggle("aktif", aktif); b.setAttribute("aria-selected", String(aktif)); }
    if (g) gecmisYukle(true); else kullaniciListele();
  };
  $("kmSekK").addEventListener("click", () => sekme(false)); $("kmSekG").addEventListener("click", () => sekme(true));
  m._sekme = sekme;
  $("kmGFiltre").addEventListener("input", gecmisCiz);
  $("kmGDaha").addEventListener("click", () => gecmisYukle(false));
  $("kmEkle").addEventListener("click", async () => {
    const mail = $("kmMail").value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { showToast("Geçerli bir e-posta girin", "error"); return; }
    if (mail === state.aktifKullaniciMail) { showToast("Kendi kaydınızı buradan değiştiremezsiniz", "error"); return; }
    try {
      await setDoc(doc(db, "kullanicilar", mail), { rol: $("kmRol").value, aktif: true, guncelleyen: state.aktifKullaniciMail });
      logYaz("Kullanıcı eklendi / güncellendi", mail, "rol: " + ROL_ADI[$("kmRol").value]);
      $("kmMail").value = ""; showToast("Kullanıcı kaydedildi", "success"); kullaniciListele();
    } catch (e) { console.error(e); showToast("Kaydedilemedi: " + e.message, "error"); }
  });
  return m;
}

async function kullaniciListele() {
  const kutu = $("kmListe"); kutu.textContent = "Yükleniyor…";
  try {
    const snap = await getDocs(collection(db, "kullanicilar"));
    const l = []; snap.forEach(d => l.push({ id: d.id, ...d.data() }));
    l.sort((a, b) => a.id.localeCompare(b.id));
    kutu.innerHTML = l.map(k => {
      const ben = k.id === state.aktifKullaniciMail;
      const sec = Object.entries(ROL_ADI).map(([v, ad]) => `<option value="${v}"${k.rol === v ? " selected" : ""}>${ad}</option>`).join("");
      const id = htmlGuvenli(k.id);
      return `<div class="ym-satir${k.aktif ? "" : " pasif"}">
        <div class="ym-kisi"><span class="ym-av" aria-hidden="true">${htmlGuvenli(k.id.charAt(0).toLocaleUpperCase("tr-TR"))}</span><span class="ym-mail">${id}${ben ? ' <em>(siz)</em>' : ""}${k.aktif ? "" : ' <em>· pasif</em>'}</span></div>
        ${ben ? `<span class="ym-rol">${ROL_ADI[k.rol] || k.rol || ""}</span>` : `<div class="ym-eylem">
          <select data-km-rol="${id}" data-eski="${htmlGuvenli(k.rol || "")}" class="ym-girdi" aria-label="Rol">${sec}</select>
          <button type="button" data-km-aktif="${id}" data-durum="${k.aktif ? 1 : 0}" class="btn-firma">${k.aktif ? "Pasif yap" : "Aktif yap"}</button>
          <button type="button" data-km-sil="${id}" class="btn-firma ym-sil" aria-label="${id} sil">${ikon("x", 13)} Sil</button></div>`}
      </div>`;
    }).join("") || "Kayıt yok";
    kutu.querySelectorAll("[data-km-rol]").forEach(el => el.addEventListener("change", async () => {
      try {
        await updateDoc(doc(db, "kullanicilar", el.dataset.kmRol), { rol: el.value, guncelleyen: state.aktifKullaniciMail });
        logYaz("Rol değiştirildi", el.dataset.kmRol, `${ROL_ADI[el.dataset.eski] || el.dataset.eski || "?"} → ${ROL_ADI[el.value]}`);
        el.dataset.eski = el.value; showToast("Rol güncellendi", "success");
      } catch (e) { showToast("Hata: " + e.message, "error"); kullaniciListele(); }
    }));
    kutu.querySelectorAll("[data-km-aktif]").forEach(el => el.addEventListener("click", async () => {
      const yeni = el.dataset.durum !== "1";
      try { await updateDoc(doc(db, "kullanicilar", el.dataset.kmAktif), { aktif: yeni, guncelleyen: state.aktifKullaniciMail }); logYaz(yeni ? "Kullanıcı aktif yapıldı" : "Kullanıcı pasif yapıldı", el.dataset.kmAktif); kullaniciListele(); }
      catch (e) { showToast("Hata: " + e.message, "error"); }
    }));
    kutu.querySelectorAll("[data-km-sil]").forEach(el => el.addEventListener("click", async () => {
      if (!confirm(el.dataset.kmSil + " listeden silinsin mi? Uygulamaya erişimi kapanır.")) return;
      try { await deleteDoc(doc(db, "kullanicilar", el.dataset.kmSil)); logYaz("Kullanıcı silindi", el.dataset.kmSil); showToast("Silindi", "success"); kullaniciListele(); }
      catch (e) { showToast("Hata: " + e.message, "error"); }
    }));
  } catch (e) { console.error(e); kutu.textContent = "Liste alınamadı: " + e.message; }
}

let gecmisTum = [], gecmisSon = "", gecmisBitti = false;

async function gecmisYukle(sifirla) {
  const kutu = $("kmGListe");
  if (sifirla) { gecmisTum = []; gecmisSon = ""; gecmisBitti = false; kutu.textContent = "Yükleniyor…"; }
  try {
    const q = gecmisSon
      ? query(collection(db, "islemGecmisi"), where("zaman", "<", gecmisSon), orderBy("zaman", "desc"), limit(100))
      : query(collection(db, "islemGecmisi"), orderBy("zaman", "desc"), limit(100));
    const snap = await getDocs(q);
    snap.forEach(d => gecmisTum.push({ id: d.id, ...d.data() }));
    if (snap.size < 100) gecmisBitti = true;
    if (gecmisTum.length) gecmisSon = gecmisTum[gecmisTum.length - 1].zaman;
    gecmisCiz();
  } catch (e) { console.error(e); kutu.textContent = "Geçmiş alınamadı: " + e.message + " (Firestore kurallarında islemGecmisi izni var mı?)"; }
}

function gecmisCiz() {
  const kutu = $("kmGListe"), f = ($("kmGFiltre").value || "").trim().toLocaleLowerCase("tr-TR");
  const l = f ? gecmisTum.filter(x => [x.kim, x.islem, x.hedef, x.detay].join(" ").toLocaleLowerCase("tr-TR").includes(f)) : gecmisTum;
  kutu.innerHTML = l.map(x => {
    const t = x.zaman ? new Date(x.zaman).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "";
    return `<div class="ym-satir ym-gecmis">
      <div class="ym-g-ust"><b>${htmlGuvenli(x.islem || "")}</b><span>${htmlGuvenli(t)}</span></div>
      <div class="ym-g-kim">${htmlGuvenli(x.kim || "")}${x.hedef ? " · " + htmlGuvenli(x.hedef) : ""}</div>
      ${x.detay ? `<div class="ym-g-detay">${htmlGuvenli(x.detay)}</div>` : ""}</div>`;
  }).join("") || "Kayıt yok";
  $("kmGDaha").style.display = gecmisBitti ? "none" : "block";
}

window.kullaniciPaneliAc = function () {
  if (!yoneticiMi()) { showToast("Yetkiniz yok!", "error"); return; }
  const m = kullaniciModalHazirla(); m.style.display = "flex"; m._sekme(false);
};
