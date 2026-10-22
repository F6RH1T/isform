import { koddanNo } from "./firma-kodu.js";

export const tarihiInputaCevir = iso => {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const inputtanIsoYap = val => new Date(val + "T12:00:00").toISOString();

export const tarihKarsilastir = (a, b) => {
  const tA = new Date(a.tarih || 0).getTime();
  const tB = new Date(b.tarih || 0).getTime();
  if(tA === tB) {
      return (b.formNo || koddanNo(b.formKodu)) - (a.formNo || koddanNo(a.formKodu));
  }
  return tB - tA; 
};

/* n ay sonrası; hedef ay daha kısaysa ayın son gününe sabitlenir (31 Ocak + 1 ay → 28/29 Şubat) */
export const ayEkle = (iso, n) => {
  const d = new Date(iso), gun = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + Number(n));
  d.setDate(Math.min(gun, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d.toISOString();
};
