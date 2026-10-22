/* DEMO: bellekte çalışan sahte Firestore. Uygulamanın kullandığı sorguları (where / orderBy / limit / startAfter)
   gerçekten uygular; yazmalar sayfa yenilenene kadar bellekte kalır. Gerçek Firebase'e hiçbir istek gitmez. */
import { ornekVeri } from "./ornek-veri.js";

const veri = ornekVeri();          // { koleksiyon: Map(id → belge) }
const dinleyiciler = new Set();    // onSnapshot abonelikleri
const kol = ad => veri[ad] || (veri[ad] = new Map());
let otoNo = 0;
const otoId = () => "demo" + Date.now().toString(36) + (++otoNo);

const SIL = { __sil: true };
export const deleteField = () => SIL;

export const getFirestore = () => ({ __db: true });
export const initializeFirestore = () => ({ __db: true });
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});

export const collection = (db, ...p) => ({ tur: "kol", yol: p.join("/") });
export function doc(a, ...p) {
  if (a && a.tur === "kol") return { tur: "belge", kol: a.yol, id: p.length ? p.join("/") : otoId() };
  return { tur: "belge", kol: p[0], id: p.slice(1).join("/") };
}
export const where = (alan, op, deger) => ({ k: "where", alan, op, deger });
export const orderBy = (alan, yon = "asc") => ({ k: "orderBy", alan, yon });
export const limit = n => ({ k: "limit", n });
export const startAfter = belge => ({ k: "startAfter", belge });
export const query = (k, ...kisitlar) => ({ tur: "sorgu", yol: k.yol, kisitlar });

const deger = (v, alan) => alan === "__name__" ? v.__id : alan.split(".").reduce((o, k) => (o == null ? undefined : o[k]), v);
const kopya = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

function belgeSnap(kolAd, id, v) {
  return { id, ref: { tur: "belge", kol: kolAd, id }, exists: () => v !== undefined, data: () => kopya(v), metadata: { hasPendingWrites: false, fromCache: false } };
}
function sorguSnap(docs) {
  return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
}

function calistir(q) {
  const ad = q.tur === "kol" ? q.yol : q.yol, ks = q.kisitlar || [];
  let l = [...kol(ad).entries()].map(([id, v]) => ({ ...v, __id: id }));
  for (const w of ks.filter(x => x.k === "where")) {
    l = l.filter(v => {
      const x = deger(v, w.alan);
      if (x === undefined) return false;
      switch (w.op) {
        case "==": return x === w.deger;
        case ">=": return x >= w.deger;
        case "<=": return x <= w.deger;
        case ">": return x > w.deger;
        case "<": return x < w.deger;
        case "!=": return x !== w.deger;
        case "in": return w.deger.includes(x);
        default: return true;
      }
    });
  }
  for (const o of ks.filter(x => x.k === "orderBy").reverse()) {
    l.sort((a, b) => { const x = deger(a, o.alan), y = deger(b, o.alan); const r = x < y ? -1 : x > y ? 1 : 0; return o.yon === "desc" ? -r : r; });
  }
  const sa = ks.find(x => x.k === "startAfter");
  if (sa) { const i = l.findIndex(v => v.__id === sa.belge.id); if (i >= 0) l = l.slice(i + 1); }
  const lim = ks.find(x => x.k === "limit");
  if (lim) l = l.slice(0, lim.n);
  return sorguSnap(l.map(v => { const { __id, ...g } = v; return belgeSnap(ad, __id, g); }));
}

const bekle = (ms = 60) => new Promise(r => setTimeout(r, ms));   // ağ gecikmesi hissi
function haberVer() { dinleyiciler.forEach(d => { try { d.cb(calistir(d.q)); } catch (e) { console.error(e); } }); }

function birlestir(eski, yeni) {
  const out = { ...(eski || {}) };
  for (const [k, v] of Object.entries(yeni)) {
    if (k.includes(".")) {   // "formVerisi.imza" gibi iç alan
      const p = k.split("."); let o = out;
      for (const x of p.slice(0, -1)) o = o[x] = { ...(o[x] || {}) };
      if (v === SIL) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = v;
      continue;
    }
    if (v === SIL) { delete out[k]; continue; }
    out[k] = v;
  }
  return out;
}

export async function getDocs(q) { await bekle(); return calistir(q); }
export async function getDoc(r) { await bekle(30); return belgeSnap(r.kol, r.id, kopya(kol(r.kol).get(r.id))); }
export async function getCountFromServer(q) { await bekle(); return { data: () => ({ count: calistir(q).size }) }; }
export async function addDoc(k, v) { await bekle(); const id = otoId(); kol(k.yol).set(id, birlestir(null, v)); haberVer(); return { id }; }
export async function setDoc(r, v, o = {}) { await bekle(); kol(r.kol).set(r.id, birlestir(o.merge ? kol(r.kol).get(r.id) : null, v)); haberVer(); }
export async function updateDoc(r, v) {
  await bekle();
  if (!kol(r.kol).has(r.id)) { const e = new Error("Belge yok"); e.code = "not-found"; throw e; }
  kol(r.kol).set(r.id, birlestir(kol(r.kol).get(r.id), v)); haberVer();
}
export async function deleteDoc(r) { await bekle(); kol(r.kol).delete(r.id); haberVer(); }

export function writeBatch() {
  const is = [];
  return {
    set(r, v, o = {}) { is.push(() => kol(r.kol).set(r.id, birlestir(o.merge ? kol(r.kol).get(r.id) : null, v))); },
    update(r, v) { is.push(() => kol(r.kol).set(r.id, birlestir(kol(r.kol).get(r.id), v))); },
    delete(r) { is.push(() => kol(r.kol).delete(r.id)); },
    async commit() { await bekle(); is.forEach(f => f()); haberVer(); }
  };
}

export async function runTransaction(db, fn) {
  const tx = {
    get: async r => belgeSnap(r.kol, r.id, kopya(kol(r.kol).get(r.id))),
    set(r, v) { kol(r.kol).set(r.id, birlestir(null, v)); },
    update(r, v) { kol(r.kol).set(r.id, birlestir(kol(r.kol).get(r.id), v)); },
    delete(r) { kol(r.kol).delete(r.id); }
  };
  await bekle();
  const s = await fn(tx); haberVer(); return s;
}

export function onSnapshot(q, a, b) {
  const cb = typeof a === "function" ? a : b;
  const d = { q, cb };
  dinleyiciler.add(d);
  setTimeout(() => cb(calistir(q)), 80);
  return () => dinleyiciler.delete(d);
}
