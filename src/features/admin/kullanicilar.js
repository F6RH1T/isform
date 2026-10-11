import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { db } from "../../firebase/init.js";
import { logYaz, yoneticiMi } from "../../core/session.js";
import { htmlGuvenli } from "../../lib/text.js";

/* ===== YÖNETİM: KULLANICILAR + İŞLEM GEÇMİŞİ (yalnızca yönetici) ===== */
const ROL_ADI = { yonetici: "Yönetici", duzenleyen: "Düzenleyen", goruntuleyen: "Görüntüleyen" };

function kullaniciModalHazirla() {
  if ($("kullaniciModal")) return $("kullaniciModal");
  const m = document.createElement("div"); m.id = "kullaniciModal";
  m.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,9,8,.7);z-index:2000;justify-content:center;align-items:center;padding:16px;backdrop-filter:blur(6px)";
  const girdi = "padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-main)";
  m.innerHTML = `<div style="background:var(--surface);color:var(--text-main);border:1px solid var(--border);border-radius:20px;width:100%;max-width:600px;max-height:88vh;overflow:auto;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.35)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><b style="font-size:1.15rem">👥 Yönetim</b><button type="button" id="kmKapat" class="btn-firma" style="margin:0">Kapat</button></div>
    <div style="display:flex;gap:6px;margin-bottom:14px"><button type="button" id="kmSekK" class="btn-firma" style="margin:0">Kullanıcılar</button><button type="button" id="kmSekG" class="btn-firma" style="margin:0">📜 İşlem geçmişi</button></div>
    <div id="kmPanelK">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
        <input id="kmMail" type="email" placeholder="e-posta" style="flex:1 1 200px;${girdi}">
        <select id="kmRol" style="${girdi}"><option value="goruntuleyen">Görüntüleyen</option><option value="duzenleyen">Düzenleyen</option><option value="yonetici">Yönetici</option></select>
        <button type="button" id="kmEkle" class="btn-firma" style="margin:0;background:var(--primary);color:#fff;border-color:var(--primary)">Ekle</button>
      </div>
      <div id="kmListe" style="display:flex;flex-direction:column;gap:8px"></div>
      <p style="font-size:.75rem;opacity:.7;margin:12px 0 0">Not: Yeni kişinin giriş hesabı (e-posta/şifre) Firebase Authentication'dan ayrıca açılmalıdır. Burada sadece uygulamadaki yetkisi belirlenir. Kendi kaydınızı buradan değiştiremezsiniz.</p>
    </div>
    <div id="kmPanelG" style="display:none">
      <input id="kmGFiltre" type="search" placeholder="Süz: kişi, işlem, firma, form kodu…" style="width:100%;box-sizing:border-box;margin-bottom:10px;${girdi}">
      <div id="kmGListe" style="display:flex;flex-direction:column;gap:8px"></div>
      <button type="button" id="kmGDaha" class="btn-firma" style="margin:10px 0 0;display:none">Daha eski kayıtlar</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) m.style.display = "none"; });
  $("kmKapat").addEventListener("click", () => m.style.display = "none");
  const sekme = g => {
    $("kmPanelK").style.display = g ? "none" : "block"; $("kmPanelG").style.display = g ? "block" : "none";
    for (const [id, aktif] of [["kmSekK", !g], ["kmSekG", g]]) { const b = $(id); b.style.background = aktif ? "var(--primary)" : ""; b.style.color = aktif ? "#fff" : ""; b.style.borderColor = aktif ? "var(--primary)" : ""; }
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
      return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--border);border-radius:12px;opacity:${k.aktif ? 1 : .55}">
        <span style="flex:1 1 180px;word-break:break-all;font-size:.85rem">${id}${ben ? " <i>(siz)</i>" : ""}</span>
        <select data-km-rol="${id}" data-eski="${htmlGuvenli(k.rol || "")}" ${ben ? "disabled" : ""} style="padding:6px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-main)">${sec}</select>
        <button type="button" data-km-aktif="${id}" data-durum="${k.aktif ? 1 : 0}" class="btn-firma" style="margin:0" ${ben ? "disabled" : ""}>${k.aktif ? "Pasif yap" : "Aktif yap"}</button>
        <button type="button" data-km-sil="${id}" class="btn-firma" style="margin:0;color:var(--danger)" ${ben ? "disabled" : ""}>Sil</button></div>`;
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
    return `<div style="padding:8px 10px;border:1px solid var(--border);border-radius:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b style="font-size:.88rem">${htmlGuvenli(x.islem || "")}</b><span style="font-size:.75rem;opacity:.7">${htmlGuvenli(t)}</span></div>
      <div style="font-size:.82rem;word-break:break-word">${htmlGuvenli(x.kim || "")}${x.hedef ? " · " + htmlGuvenli(x.hedef) : ""}</div>
      ${x.detay ? `<div style="font-size:.78rem;opacity:.75;word-break:break-word">${htmlGuvenli(x.detay)}</div>` : ""}</div>`;
  }).join("") || "Kayıt yok";
  $("kmGDaha").style.display = gecmisBitti ? "none" : "block";
}

window.kullaniciPaneliAc = function () {
  if (!yoneticiMi()) { showToast("Yetkiniz yok!", "error"); return; }
  const m = kullaniciModalHazirla(); m.style.display = "flex"; m._sekme(false);
};
