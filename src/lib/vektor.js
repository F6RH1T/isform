/* Anlamsal arama için vektör yardımcıları (saf işlevler: ağ ve DOM yok, birim testleri var). */
export const VEKTOR_BOYUT = 256, VEKTOR_SURUM = "e1-256";

export const vektorMetni = (tip, aciklama) => ((tip ? tip + ": " : "") + String(aciklama || "").trim()).slice(0, 1500);

export const vNorm = a => { let t = 0; for (const x of a) t += x * x; t = Math.sqrt(t) || 1; return a.map(x => x / t); };

export const vektorPaketle = a => { let s = ""; for (const x of a) s += String.fromCharCode(Math.max(-127, Math.min(127, Math.round(x * 127))) & 255); return btoa(s); };

const _vCoz = new Map();

export const vektorAc = s => { let o = _vCoz.get(s); if (!o) { const b = atob(s); o = new Int8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = (b.charCodeAt(i) << 24) >> 24; _vCoz.set(s, o); } return o; };

export const kosinus = (q, b) => { let d = 0, n = 0; for (let i = 0; i < b.length; i++) { d += q[i] * b[i]; n += b[i] * b[i]; } return n ? d / Math.sqrt(n) : 0; };
