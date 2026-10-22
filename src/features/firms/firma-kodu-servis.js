import { collection, doc, getDocs, limit, query, runTransaction, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase/init.js";
import { firmaKodTaban, harfEki, koddanNo } from "../../lib/firma-kodu.js";

/* Firma için mevcut kodu bulur (yoksa yeni üretir) ve o firmanın son form numarasını döner.
   Yalnızca formlar koleksiyonuna bakar; aynı anda iki kayıtta çakışabilir. Çevrimdışı yedek yol ve sayaç ilk kurulumu içindir. */
export async function firmaKodunuBul(aramaFirma) {
  const snap = await getDocs(query(collection(db, "formlar"), where("aramaFirma", "==", aramaFirma)));
  let kod = null, maks = 0;
  snap.forEach(d => { const x = d.data(); if (x.firmaKodu && !kod) kod = x.firmaKodu; const n = x.formNo || koddanNo(x.formKodu); if (n > maks) maks = n; });
  if (!kod) {
    const taban = firmaKodTaban(aramaFirma); let aday = taban, i = 0;
    while (true) {
      const s = await getDocs(query(collection(db, "formlar"), where("firmaKodu", "==", aday), limit(1)));
      if (s.empty) break;
      aday = taban + harfEki(++i);
    }
    kod = aday;
  }
  return { firmaKodu: kod, sonNo: maks };
}

export const sayacId = aramaFirma => encodeURIComponent(aramaFirma);

/* Form numarası ayırır: sayaclar/{firma} belgesinde transaction ile artırılır, böylece iki kişi aynı anda kayıt girse de
   aynı numara iki kez verilmez. Yeni firma kodu firmaKodlari/{kod} ile rezerve edilir (başka firma alamaz).
   Döner: { firmaKodu, ilkNo } — ilkNo, ilkNo+1 … ilkNo+adet-1 bu kayıt için ayrılmıştır.
   Çevrimdışıyken transaction çalışmaz; eski yönteme düşülür ve { cevrimdisi: true } eklenir. */
export async function formNoAyir(aramaFirma, adet = 1) {
  if (!navigator.onLine) {
    const { firmaKodu, sonNo } = await firmaKodunuBul(aramaFirma);
    return { firmaKodu, ilkNo: sonNo + 1, cevrimdisi: true };
  }
  try { return await sayacliNoAyir(aramaFirma, adet); }
  catch (e) {
    /* Yeni Firestore kuralları (sayaclar / firmaKodlari) henüz yayınlanmadıysa eski yöntem kullanılır; kayıt engellenmez. */
    if (e && (e.code === "permission-denied" || /permission/i.test(e.message || ""))) {
      console.warn("Sayaç kuralları yayınlı değil, eski numaralandırma kullanılıyor (firebase deploy --only firestore:rules)");
      const { firmaKodu, sonNo } = await firmaKodunuBul(aramaFirma);
      return { firmaKodu, ilkNo: sonNo + 1 };
    }
    throw e;
  }
}

async function sayacliNoAyir(aramaFirma, adet) {
  const sayacRef = doc(db, "sayaclar", sayacId(aramaFirma));
  let taban = null;   // sayaç yoksa formlar koleksiyonundan hesaplanan başlangıç (ilk kurulum / eski veri)
  for (let deneme = 0; deneme < 6; deneme++) {
    const sonuc = await runTransaction(db, async tx => {
      const s = await tx.get(sayacRef);
      if (s.exists() && s.data().firmaKodu) {
        const sonNo = Number(s.data().sonNo) || 0;
        tx.update(sayacRef, { sonNo: sonNo + adet });
        return { firmaKodu: s.data().firmaKodu, ilkNo: sonNo + 1 };
      }
      if (!taban) return null;   // transaction dışında taban hesaplanıp tekrar denenecek
      const kodRef = doc(db, "firmaKodlari", taban.firmaKodu);
      const k = await tx.get(kodRef);
      if (k.exists() && k.data().aramaFirma !== aramaFirma) return { cakisma: true };
      if (!k.exists()) tx.set(kodRef, { aramaFirma });
      tx.set(sayacRef, { firmaKodu: taban.firmaKodu, sonNo: taban.sonNo + adet, aramaFirma });
      return { firmaKodu: taban.firmaKodu, ilkNo: taban.sonNo + 1 };
    });
    if (sonuc && !sonuc.cakisma) return sonuc;
    if (!taban) { taban = await firmaKodunuBul(aramaFirma); continue; }
    // Kod başka firmaya rezerve edilmiş (aynı anda açılan iki yeni firma): sıradaki harf ekiyle dene
    const t = firmaKodTaban(aramaFirma), i = taban.firmaKodu === t ? 0 : harfSirasi(taban.firmaKodu.slice(t.length));
    taban = { ...taban, firmaKodu: t + harfEki(i + 1) };
  }
  throw new Error("Form numarası ayrılamadı, tekrar deneyin");
}

const harfSirasi = ek => [...ek].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);

/* Çevrimdışı verilen numaralar sayaca işlenmeli; yoksa bağlantı gelince aynı numara tekrar verilebilir.
   Bekleyenler localStorage'da tutulur, bağlantı gelince sayaç max(sayaç, verilen) yapılır. */
const BEKLEYEN = "sayac_bekleyen";
const bekleyenOku = () => { try { return JSON.parse(localStorage.getItem(BEKLEYEN) || "[]"); } catch { return []; } };
const bekleyenYaz = l => { try { localStorage.setItem(BEKLEYEN, JSON.stringify(l)); } catch { /* dolu */ } };

export function cevrimdisiNoBildir(aramaFirma, firmaKodu, sonNo) {
  bekleyenYaz([...bekleyenOku(), { aramaFirma, firmaKodu, sonNo }]);
}

export async function bekleyenSayaclariIsle() {
  const l = bekleyenOku(); if (!l.length || !navigator.onLine) return;
  const kalan = [];
  for (const b of l) {
    try {
      await runTransaction(db, async tx => {
        const ref = doc(db, "sayaclar", sayacId(b.aramaFirma)), s = await tx.get(ref);
        if (!s.exists()) { tx.set(ref, { firmaKodu: b.firmaKodu, sonNo: b.sonNo, aramaFirma: b.aramaFirma }); return; }
        if ((Number(s.data().sonNo) || 0) < b.sonNo) tx.update(ref, { sonNo: b.sonNo });
      });
    } catch (e) { console.warn("Sayaç güncellenemedi:", e.code || e); kalan.push(b); }
  }
  bekleyenYaz(kalan);
}
window.addEventListener("online", () => setTimeout(bekleyenSayaclariIsle, 3000));
onAuthStateChanged(auth, u => { if (u) setTimeout(bekleyenSayaclariIsle, 5000); });
