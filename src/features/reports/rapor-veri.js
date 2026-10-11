import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase/init.js";

/* ===== RAPOR: TÜRKİYE HARİTASI ===== */
/* ===== RAPOR/ASİSTAN VERİSİ: IndexedDB önbelleği + artımlı senkron =====
   İlk açılışta koleksiyon bir kez okunur; sonrasında yalnızca yeni eklenen kayıtlar (eklenmeTarihi) çekilir.
   Başka cihazda yapılan düzenleme/silme en geç RAPOR_TAM_MS sonra (veya "Yenile" ile) tam okumada görünür. */
const RAPOR_TAM_MS = 6 * 3600 * 1000, RAPOR_BELLEK_MS = 60 * 1000;

let _raporMap = null, _raporZaman = 0, _raporMeta = { son: "", tam: 0, uid: "" }, _raporBekle = null, _raporTamZorla = false, _raporDb = null;

const rIstek = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

const raporDb = () => _raporDb || (_raporDb = new Promise((res, rej) => {
  const r = indexedDB.open("enorpa-rapor", 1);
  r.onupgradeneeded = () => { r.result.createObjectStore("kayit"); r.result.createObjectStore("meta"); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));

const diskDene = async fn => { try { return await fn(); } catch (e) { console.warn("Rapor önbelleği:", e); } };

async function rDiskOku() {
  const d = await raporDb(), t = d.transaction(["kayit", "meta"]), k = t.objectStore("kayit");
  const [anahtar, deger, meta] = await Promise.all([rIstek(k.getAllKeys()), rIstek(k.getAll()), rIstek(t.objectStore("meta").get("m"))]);
  return { map: new Map(anahtar.map((a, i) => [a, deger[i]])), meta: meta || {} };
}

async function rDiskYaz(yaz = [], sil = [], meta = null, temizle = false) {
  const d = await raporDb(), t = d.transaction(["kayit", "meta"], "readwrite"), k = t.objectStore("kayit");
  if (temizle) k.clear();
  yaz.forEach(([id, v]) => k.put(v, id)); sil.forEach(id => k.delete(id));
  if (meta) t.objectStore("meta").put(meta, "m");
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error); });
}

const raporSnapYap = map => {
  const dizi = [...map].map(([id, v]) => ({ id, data: () => v }));
  return { size: dizi.length, empty: !dizi.length, docs: dizi, forEach: f => dizi.forEach(f) };
};

async function raporYukle() {
  const simdi = Date.now(), uid = auth.currentUser?.uid || "";
  if (_raporMap && !_raporTamZorla && _raporMeta.uid === uid && simdi - _raporZaman < RAPOR_BELLEK_MS) return raporSnapYap(_raporMap);
  if (!_raporMap || _raporMeta.uid !== uid) {
    _raporMap = new Map(); _raporMeta = { son: "", tam: 0, uid };
    const o = await diskDene(rDiskOku);
    if (o && o.meta.uid === uid) { _raporMap = o.map; _raporMeta = o.meta; }
  }
  const tamGerek = _raporTamZorla || !_raporMap.size || !_raporMeta.tam || simdi - _raporMeta.tam > RAPOR_TAM_MS;
  if (tamGerek) {
    const snap = await getDocs(collection(db, "formlar")), yeni = new Map(); let son = "";
    snap.forEach(x => { const v = x.data(); yeni.set(x.id, v); if ((v.eklenmeTarihi || "") > son) son = v.eklenmeTarihi; });
    _raporMap = yeni; _raporMeta = { son, tam: simdi, uid }; _raporTamZorla = false;
    diskDene(() => rDiskYaz([...yeni], [], _raporMeta, true));
  } else {
    const snap = await getDocs(query(collection(db, "formlar"), where("eklenmeTarihi", ">=", _raporMeta.son || "")));
    const yaz = []; let son = _raporMeta.son || "";
    snap.forEach(x => { const v = x.data(); _raporMap.set(x.id, v); yaz.push([x.id, v]); if ((v.eklenmeTarihi || "") > son) son = v.eklenmeTarihi; });
    if (son !== _raporMeta.son) { _raporMeta = { ..._raporMeta, son }; diskDene(() => rDiskYaz(yaz, [], _raporMeta, false)); }
    else if (yaz.length) diskDene(() => rDiskYaz(yaz, [], null, false));
  }
  _raporZaman = simdi;
  return raporSnapYap(_raporMap);
}

export function raporVerisi() {
  if (!_raporBekle) _raporBekle = raporYukle().finally(() => { _raporBekle = null; });
  return _raporBekle;
}

export const raporTamYenile = () => { _raporTamZorla = true; };

export function raporKayitSil(id) { if (_raporMap) _raporMap.delete(id); diskDene(() => rDiskYaz([], [id], null, false)); }

export function raporKayitYenile(id) {
  getDoc(doc(db, "formlar", id)).then(sn => {
    if (!sn.exists()) return raporKayitSil(id);
    const v = sn.data(); if (_raporMap) _raporMap.set(id, v);
    return diskDene(() => rDiskYaz([[id, v]], [], null, false));
  }).catch(e => console.warn("Önbellek güncellenemedi:", e));
}

export function raporKayitYama(id, yama) {
  const v = { ...((_raporMap && _raporMap.get(id)) || {}), ...yama };
  if (_raporMap) _raporMap.set(id, v);
  return diskDene(() => rDiskYaz([[id, v]], [], null, false));
}

function raporOnbellekTemizle() { _raporMap = null; _raporMeta = { son: "", tam: 0, uid: "" }; diskDene(() => rDiskYaz([], [], null, true)); }

onAuthStateChanged(auth, u => { if (!u) raporOnbellekTemizle(); });
