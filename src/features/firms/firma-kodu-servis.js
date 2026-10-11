import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../firebase/init.js";
import { firmaKodTaban, harfEki, koddanNo } from "../../lib/firma-kodu.js";

/* Firma için mevcut kodu bulur (yoksa yeni üretir) ve o firmanın son form numarasını döner. */
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
