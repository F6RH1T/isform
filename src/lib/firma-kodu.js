export function firmaKodTaban(aramaFirma) {
  const h = String(aramaFirma || "").replace(/[^a-z]/g, "");
  return h.substring(0, 4).toUpperCase().padEnd(3, "X");
}

export function harfEki(n) { let s = ""; while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); } return s; }

export function koddanNo(kod) { const m = String(kod || "").match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; }
