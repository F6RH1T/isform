import { deleteField, doc, updateDoc } from "firebase/firestore";
import { state } from "../../core/state.js";
import { $ } from "../../lib/dom.js";
import { metniNormalizeEt } from "../../lib/text.js";
import { ayEkle, inputtanIsoYap, tarihiInputaCevir } from "../../lib/dates.js";
import { getLocation } from "../../lib/konum.js";
import { cevrimdisiNoBildir, formNoAyir } from "../firms/firma-kodu-servis.js";
import { vektorHazirla } from "../ai/embeddings.js";
import { belgeEkle, db, kuyrugaAl } from "../../firebase/init.js";
import { logYaz } from "../../core/session.js";

export const btnMic = $("btnMic"), aciklamaNotu = $("aciklamaNotu");

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SR) {
  const rec = new SR();
  rec.lang = "tr-TR"; rec.interimResults = false;
  btnMic.addEventListener("click", e => { e.preventDefault(); btnMic.classList.add("listening"); showToast("🎤 Dinliyorum… konuşun", "info"); rec.start(); });
  rec.onresult = e => {
    aciklamaNotu.value += (aciklamaNotu.value ? " " : "") + e.results[0][0].transcript;
    btnMic.classList.remove("listening"); showToast("Not eklendi", "success");
  };
  rec.onerror = () => { btnMic.classList.remove("listening"); showToast("Ses anlaşılamadı", "error"); };
  rec.onend = () => btnMic.classList.remove("listening");
} else btnMic.style.display = "none";

const fotoDonus = new WeakMap();

/* Fotoğraflar iki yoldan eklenir: kamerayla çek (tek tek) veya galeriden seç (çoklu). Hepsi aynı listede birikir. */
let secilenFotolar = [];
const fotoPreviewContainer = $("fotoPreviewContainer"), fotoLabel = $("fotoLabel");

function fotolariCiz() {
  fotoPreviewContainer.innerHTML = "";
  fotoLabel.classList.toggle("active", secilenFotolar.length > 0);
  secilenFotolar.forEach((f, i) => {
    const w = document.createElement("span"); w.className = "foto-onizleme";
    const img = document.createElement("img"); img.src = URL.createObjectURL(f); img.alt = "";
    const d0 = fotoDonus.get(f) || 0; if (d0) img.style.transform = `rotate(${d0}deg)`;
    const b = document.createElement("button"); b.type = "button"; b.className = "foto-dondur"; b.textContent = "↻"; b.setAttribute("aria-label", "Döndür");
    b.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); const d = ((fotoDonus.get(f) || 0) + 90) % 360; fotoDonus.set(f, d); img.style.transition = "transform .25s"; img.style.transform = `rotate(${d}deg)`; });
    const x = document.createElement("button"); x.type = "button"; x.className = "foto-kaldir"; x.textContent = "×"; x.setAttribute("aria-label", "Fotoğrafı kaldır");
    x.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); secilenFotolar.splice(i, 1); fotolariCiz(); });
    w.append(img, b, x); fotoPreviewContainer.appendChild(w);
  });
}
["fotoKamera", "fotoGaleri"].forEach(id => $(id).addEventListener("change", e => {
  secilenFotolar = secilenFotolar.concat(Array.from(e.target.files || []));
  e.target.value = "";   // aynı fotoğraf yeniden seçilebilsin
  fotolariCiz();
}));

const compressImage = async file => {
  let f = file;
  if (/\.(heic|heif)$/i.test(f.name) || f.type === "image/heic") {
    await heicKutuphanesi();
    if (typeof heic2any === "undefined") throw new Error("HEIC kütüphanesi yüklenemedi.");
    const b = await heic2any({ blob: f, toType: "image/jpeg" });
    f = Array.isArray(b) ? b[0] : b;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"), s = img.width > 720 ? 720 / img.width : 1;
        const dn = fotoDonus.get(file) || 0, W = img.width * s, H = img.height * s, odd = dn % 180 !== 0;
        c.width = odd ? H : W; c.height = odd ? W : H;
        const cx = c.getContext("2d"); cx.translate(c.width / 2, c.height / 2); cx.rotate(dn * Math.PI / 180); cx.drawImage(img, -W / 2, -H / 2, W, H);
        resolve(c.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => reject(new Error("Fotoğraf okunamadı."));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(f);
  });
};

window.addEventListener("online", () => showToast("Bağlantı geldi, bekleyen kayıtlar gönderiliyor…", "info"));

const kaydetEtiket = "Konumla kaydet";

$("isFormu").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("ekleButonu");
  if (window.kayitKilit) return;            // çift tıklama / çift submit koruması
  if (!secilenFotolar.length) { showToast("Lütfen en az bir fotoğraf ekleyin.", "error"); return; }
  window.kayitKilit = true;
  btn.disabled = true; btn.innerText = "📍 Konum alınıyor…";

  const firmaAdi = $("firmaAdi").value.trim(), sehir = $("sehir").value, islemTipi = $("islemTipi").value, aciklama = aciklamaNotu.value.trim();
  const aramaFirma = metniNormalizeEt(firmaAdi);
  const formTarihi = $("formTarihi").value;
  if (!formTarihi) { showToast("Lütfen form tarihini girin.", "error"); window.kayitKilit = false; btn.disabled = false; btn.innerText = kaydetEtiket; return; }
  const tarihIso = inputtanIsoYap(formTarihi);
  const dosyalar = secilenFotolar.slice();

  try {
    const imza = [aramaFirma, tarihIso, islemTipi, aciklama, dosyalar.length].join("|");
    if (window.sonKayitImza && window.sonKayitImza.k === imza && Date.now() - window.sonKayitImza.t < 120000 &&
        !confirm("Aynı firma için aynı bilgilerle az önce kayıt eklendi. Yine de tekrar eklensin mi?")) {
      return;
    }
    const konum = await getLocation();
    const { firmaKodu, ilkNo: siradakiNo, cevrimdisi } = await formNoAyir(aramaFirma, dosyalar.length || 1);
    if (cevrimdisi) cevrimdisiNoBildir(aramaFirma, firmaKodu, siradakiNo + dosyalar.length - 1);
    const vk = await vektorHazirla(islemTipi, aciklama);   // anlamsal arama vektörü (en fazla ~2 sn bekler, olmazsa kayıt yine eklenir)

    for (let i = 0; i < dosyalar.length; i++) {
      btn.innerText = `Yükleniyor (${i + 1}/${dosyalar.length})…`;
      const foto = await compressImage(dosyalar[i]);
      const fotoRef = await belgeEkle("formFotograflari", { base64: foto });
      const payload = {
          firmaAdi,
          aramaFirma,
          sehir,
          islemTipi,
          aciklama,
          ekleyen: state.aktifKullaniciMail,
          fotoId: fotoRef.id,
          firmaKodu,
          formNo: siradakiNo + i,
          formKodu: `${firmaKodu}${siradakiNo + i}`,
          tarih: tarihIso,
          eklenmeTarihi: new Date().toISOString()
      };
      Object.assign(payload, vk);
      if (cevrimdisi) payload.numaraCevrimdisi = true;   // çevrimdışı verilen numara: nadiren çakışabilir, yönetici görebilsin
      if (konum) payload.konum = konum;
      const aralik = $("bakimAralik").value; if (aralik) payload.bakimAralik = Number(aralik);
      if ($("bakimTarihi").value) payload.sonrakiBakim = inputtanIsoYap($("bakimTarihi").value);
      else if (aralik) payload.sonrakiBakim = ayEkle(tarihIso, aralik);
      await belgeEkle("formlar", payload);
      logYaz("Form eklendi", payload.formKodu || "", [payload.firmaAdi, payload.islemTipi].filter(Boolean).join(" · "));
    }
    if (window.bakimKaynakId) { try { await kuyrugaAl(updateDoc(doc(db, "formlar", window.bakimKaynakId), { sonrakiBakim: deleteField() })); } catch (e) { console.error(e); } window.bakimKaynakId = null; }
    window.sonKayitImza = { k: imza, t: Date.now() };
    showToast(navigator.onLine ? "Başarıyla eklendi! 🎉" : "Çevrimdışı kaydedildi, bağlantı gelince otomatik gönderilecek 📡", navigator.onLine ? "success" : "info");
    $("isFormu").reset();
    $("formTarihi").value = tarihiInputaCevir();
    secilenFotolar = []; fotolariCiz();
  } catch (err) { console.error(err); showToast("Kayıt sırasında hata: " + err.message, "error"); }
  finally { window.kayitKilit = false; btn.disabled = false; btn.innerText = kaydetEtiket; }
});
