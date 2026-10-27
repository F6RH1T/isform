/* İşlem tipi → renk sınıfı (kartlar, rozetler, grafikler ortak kullanır) */
export function tipSinif(t) {
  const s = String(t || "").toLocaleLowerCase("tr-TR");
  if (s.includes("bakım") || s.includes("bakim")) return "bakim";
  if (s.includes("arıza") || s.includes("ariza")) return "ariza";
  if (s.includes("ziyaret")) return "ziyaret";
  if (s.includes("kurulum") || s.includes("montaj")) return "kurulum";
  if (s.includes("keşif") || s.includes("kesif")) return "kesif";
  return s && !s.includes("belirtilmemiş") ? "diger" : "yok";
}
export const TIP_RENK = { bakim: "#16a34a", ariza: "#e5484d", kurulum: "#3b82f6", kesif: "#d97706", ziyaret: "#0d9488", diger: "#8b5cf6", yok: "#a8a29e" };
export function bashar(ad) {
  const k = String(ad || "").trim().split(/\s+/).filter(Boolean);
  if (!k.length) return "?";
  return ((k[0][0] || "") + (k.length > 1 ? k[1][0] : (k[0][1] || ""))).toLocaleUpperCase("tr-TR");
}
