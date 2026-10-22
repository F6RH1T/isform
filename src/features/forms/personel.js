import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, writeBatch } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase/init.js";
import { state } from "../../core/state.js";
import { logYaz, yoneticiMi } from "../../core/session.js";
import { $ } from "../../lib/dom.js";
import { levenshtein } from "../../lib/levenshtein.js";
import { metniNormalizeEt } from "../../lib/text.js";
import { VARSAYILAN_PERSONEL } from "../../lib/personel-varsayilan.js";
import { disaridanKapat } from "../../ui/modal.js";

/* ===== PERSONEL LİSTESİ =====
   İş formundaki 6 personel alanı + servis sorumlusu artık serbest yazı değil, listeden seçmeli.
   Listenin sonunda "+ Yeni isim ekle…" vardır; eklenen isim Firestore'daki `personel` koleksiyonuna yazılır, herkeste görünür. */
const IDLER = ["ofP1", "ofP2", "ofP3", "ofP4", "ofP5", "ofP6", "ofSorumlu"], PERSONEL_IDLER = IDLER.slice(0, 6);
const ONBELLEK = "personel_listesi", YENI = "__yeni__";
let liste = [];   // { id, ad }

const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sirala = () => { liste.sort((a, b) => a.ad.localeCompare(b.ad, "tr-TR")); };
const onbellegeYaz = () => { try { localStorage.setItem(ONBELLEK, JSON.stringify(liste)); } catch { /* dolu olabilir */ } };
const onbellektenOku = () => { try { return JSON.parse(localStorage.getItem(ONBELLEK) || "[]"); } catch { return []; } };
const varsayilan = () => VARSAYILAN_PERSONEL.map(ad => ({ id: "", ad }));
const adTemizle = t => String(t || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR").split(" ").map(k => k.charAt(0).toLocaleUpperCase("tr-TR") + k.slice(1)).join(" ");

/* ---- Alanları seçmeli kutuya çevir ---- */
IDLER.forEach(id => {
  const eski = $(id); if (!eski || eski.tagName === "SELECT") return;
  const s = document.createElement("select"); s.id = id; s.dataset.personel = "1";
  eski.parentElement.classList.add("select-wrapper"); eski.replaceWith(s);
});
const sorumluEtiket = document.querySelector('label[for="ofSorumlu"]'); if (sorumluEtiket) sorumluEtiket.textContent = "Servis sorumlusu";

function doldur() {
  IDLER.forEach(id => {
    const s = $(id); if (!s) return;
    const mevcut = s.value, adlar = liste.map(x => x.ad);
    if (mevcut && mevcut !== YENI && !adlar.includes(mevcut)) adlar.push(mevcut);   // listeden silinmiş ama formda seçili isim kaybolmasın
    s.innerHTML = '<option value=""></option>' + adlar.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("") + `<option value="${YENI}">＋ Yeni isim ekle…</option>`;
    s.value = mevcut === YENI ? "" : mevcut;
  });
  kilitle();
}

/* Aynı kişi iki personel kutusunda seçilemesin */
function kilitle() {
  const kullanilan = new Set(PERSONEL_IDLER.map(id => $(id) && $(id).value).filter(Boolean));
  PERSONEL_IDLER.forEach(id => {
    const s = $(id); if (!s) return;
    [...s.options].forEach(o => { if (o.value && o.value !== YENI) o.disabled = kullanilan.has(o.value) && s.value !== o.value; });
  });
}

/* ---- Küçük isim sorma penceresi ---- */
function ismiSor(baslik, baslangic = "") {
  return new Promise(res => {
    const m = document.createElement("div"); m.className = "personel-modal";
    m.innerHTML = `<div class="edit-card"><div class="card-title" style="font-size:1.15rem;margin-bottom:14px">${esc(baslik)}</div>
      <div class="form-floating"><input type="text" id="pmAd" placeholder=" " autocomplete="off"><label for="pmAd">Ad Soyad</label></div>
      <div style="display:flex;gap:8px"><button type="button" class="btn btn-primary" id="pmTamam">Kaydet</button>
      <button type="button" class="btn btn-ikincil" id="pmVazgec">Vazgeç</button></div></div>`;
    document.body.appendChild(m);
    const inp = m.querySelector("#pmAd"); inp.value = baslangic; setTimeout(() => inp.focus(), 50);
    const bitir = d => { m.remove(); res(d); };
    disaridanKapat(m, () => bitir(null));
    m.querySelector("#pmTamam").onclick = () => bitir(inp.value.trim() || null);
    m.querySelector("#pmVazgec").onclick = () => bitir(null);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); bitir(inp.value.trim() || null); } else if (e.key === "Escape") bitir(null); });
  });
}

/* ---- Yeni isim ekle (aynı/benzer isim kontrolüyle). Kullanılacak adı döndürür. ---- */
async function isimEkle(hamAd) {
  const ad = adTemizle(hamAd);
  if (ad.length < 3) { showToast("İsim çok kısa.", "error"); return null; }
  const n = metniNormalizeEt(ad);
  const ayni = liste.find(x => metniNormalizeEt(x.ad) === n);
  if (ayni) { showToast("Bu isim zaten listede, onu seçtim.", "info"); return ayni.ad; }
  const benzer = liste.find(x => levenshtein(metniNormalizeEt(x.ad), n) <= Math.max(1, Math.floor(n.length / 8)));
  if (benzer && !confirm(`Listede benzer bir isim var: “${benzer.ad}”.\n\nYine de “${ad}” yeni kişi olarak eklensin mi?\n(İptal = “${benzer.ad}” kullanılsın)`)) return benzer.ad;
  let id = "";
  try {
    const r = await addDoc(collection(db, "personel"), { ad, adNorm: n, aktif: true, ekleyen: state.aktifKullaniciMail, eklenme: new Date().toISOString() });
    id = r.id; logYaz("Personel eklendi", ad);
  } catch (e) { console.error(e); showToast("İsim sunucuya kaydedilemedi; bu formda kullanabilirsiniz.", "error"); }
  liste.push({ id, ad }); sirala(); onbellegeYaz(); doldur();
  return ad;
}

document.addEventListener("change", async e => {
  const s = e.target.closest && e.target.closest("select[data-personel]"); if (!s) return;
  if (s.value !== YENI) { s.dataset.onceki = s.value; kilitle(); return; }
  s.value = s.dataset.onceki || "";
  const ham = await ismiSor("Yeni isim ekle"); if (!ham) return;
  const ad = await isimEkle(ham);
  if (ad) { s.value = ad; s.dataset.onceki = ad; kilitle(); }
});
$("olusturFormu").addEventListener("reset", () => setTimeout(() => { IDLER.forEach(id => { if ($(id)) $(id).dataset.onceki = ""; }); kilitle(); }, 0));

/* ---- Listeyi yükle (+ boşsa yönetici ilk kurulumda başlangıç listesini yazar) ---- */
async function yukle() {
  try {
    const kol = collection(db, "personel");
    let snap = await getDocs(kol);
    if (snap.empty && yoneticiMi() && VARSAYILAN_PERSONEL.length) {
      const b = writeBatch(db), simdi = new Date().toISOString();
      VARSAYILAN_PERSONEL.forEach(ad => b.set(doc(kol), { ad, adNorm: metniNormalizeEt(ad), aktif: true, ekleyen: state.aktifKullaniciMail, eklenme: simdi }));
      await b.commit(); snap = await getDocs(kol);
    }
    const goruldu = new Set(), yeni = [];
    snap.forEach(d => { const x = d.data(); const k = metniNormalizeEt(x.ad); if (x.ad && x.aktif !== false && !goruldu.has(k)) { goruldu.add(k); yeni.push({ id: d.id, ad: x.ad }); } });
    liste = yeni.length ? yeni : (onbellektenOku().length ? onbellektenOku() : varsayilan());
  } catch (e) {
    console.warn("Personel listesi okunamadı:", e.code || e);
    const o = onbellektenOku(); liste = o.length ? o : varsayilan();
  }
  sirala(); onbellegeYaz(); doldur();
}
liste = onbellektenOku(); if (!liste.length) liste = varsayilan(); sirala(); doldur();

onAuthStateChanged(auth, u => {
  if (!u) return;
  state.rolHazir.then(ok => { if (!ok) return; $("btnPersonel").style.display = yoneticiMi() ? "block" : "none"; yukle(); });
});

/* ---- Yönetim ekranı (yalnızca yönetici): ekle / düzenle / sil. Eski formlardaki isimler değişmez. ---- */
function yonetimAc() {
  const m = document.createElement("div"); m.className = "personel-modal"; m.id = "personelYonetim";
  m.innerHTML = `<div class="edit-card"><div class="card-title" style="font-size:1.2rem;margin-bottom:12px">Personel listesi <span class="badge" id="pmSay"></span></div>
    <div style="display:flex;gap:8px;margin-bottom:12px"><div class="form-floating" style="flex:1;margin:0"><input type="text" id="pmYeni" placeholder=" " autocomplete="off"><label for="pmYeni">Yeni isim</label></div>
    <button type="button" class="btn btn-primary" id="pmEkle" style="width:auto;padding:0 18px">Ekle</button></div>
    <div class="pm-liste" id="pmListe"></div>
    <button type="button" class="btn btn-ikincil" id="pmKapat" style="margin-top:14px">Kapat</button></div>`;
  document.body.appendChild(m);
  const kutu = m.querySelector("#pmListe");
  const ciz = () => {
    m.querySelector("#pmSay").textContent = liste.length;
    kutu.innerHTML = liste.map((x, i) => `<div class="pm-satir"><span>${esc(x.ad)}</span><span><button type="button" class="btn-firma" data-ed="${i}">Düzenle</button><button type="button" class="btn-firma" data-sil="${i}" style="color:var(--danger)">Sil</button></span></div>`).join("") || '<div class="sonuc-bilgisi">Liste boş.</div>';
  };
  const yenile = () => { sirala(); onbellegeYaz(); doldur(); ciz(); };
  const sunucuyaYazilmali = x => { if (x.id) return true; showToast("Bu isim henüz sunucuya yazılmamış (Firestore kuralları yayınlandı mı?).", "error"); return false; };
  m.querySelector("#pmEkle").onclick = async () => {
    const i = m.querySelector("#pmYeni"); if (!i.value.trim()) return;
    if (await isimEkle(i.value)) { i.value = ""; ciz(); }
  };
  m.querySelector("#pmYeni").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); m.querySelector("#pmEkle").click(); } });
  kutu.addEventListener("click", async e => {
    const ed = e.target.closest("[data-ed]"), sil = e.target.closest("[data-sil]");
    try {
      if (ed) {
        const x = liste[+ed.dataset.ed]; if (!sunucuyaYazilmali(x)) return;
        const ham = await ismiSor("İsmi düzenle", x.ad); if (!ham) return;
        const ad = adTemizle(ham); if (ad.length < 3) { showToast("İsim çok kısa.", "error"); return; }
        await updateDoc(doc(db, "personel", x.id), { ad, adNorm: metniNormalizeEt(ad) });
        logYaz("Personel düzenlendi", x.ad, ad); x.ad = ad; yenile();
      } else if (sil) {
        const x = liste[+sil.dataset.sil]; if (!sunucuyaYazilmali(x)) return;
        if (!confirm(`“${x.ad}” listeden silinsin mi?\nEski formlardaki yazılar değişmez.`)) return;
        await deleteDoc(doc(db, "personel", x.id));
        logYaz("Personel silindi", x.ad); liste.splice(+sil.dataset.sil, 1); yenile();
      }
    } catch (err) { console.error(err); showToast("İşlem başarısız: " + err.message, "error"); }
  });
  const kapat = () => m.remove();
  disaridanKapat(m, kapat);
  m.querySelector("#pmKapat").onclick = kapat;
  ciz();
}
$("btnPersonel").addEventListener("click", yonetimAc);
