import { addDoc, collection } from "firebase/firestore";
import { state } from "./state.js";
import { db } from "../firebase/init.js";

export const yoneticiMi = () => state.aktifRol === "yonetici";

/* İşlem geçmişi: kim, ne zaman, ne yaptı (yalnızca yönetici okuyabilir, kimse değiştiremez/silemez) */
export function logYaz(islem, hedef = "", detay = "") {
  if (!state.aktifKullaniciMail) return;
  addDoc(collection(db, "islemGecmisi"), { zaman: new Date().toISOString(), kim: state.aktifKullaniciMail, islem, hedef: String(hedef).slice(0, 200), detay: String(detay).slice(0, 500) })
    .catch(e => console.warn("Geçmiş yazılamadı:", e.code || e));
}

export const duzenleyebilirMi = () => state.aktifRol === "yonetici" || state.aktifRol === "duzenleyen";
