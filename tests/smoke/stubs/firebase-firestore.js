const snap = (docs = []) => ({ docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), docChanges: () => [], metadata: { fromCache: false } });
const mkDoc = (id, data) => ({ id, exists: () => true, data: () => data, ref: { id } });
export const getFirestore = () => ({ __db: true });
export const initializeFirestore = () => ({ __db: true });
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const collection = (db, ...p) => ({ __col: p.join("/") });
let _n = 0;
export const doc = (db, ...p) => p.length ? { __doc: p.join("/"), id: p[p.length - 1] } : { __doc: (db.__col || "") + "/oto" + (++_n), id: "oto" + _n };
export const query = (...a) => ({ __q: a });
export const where = (...a) => ({ __w: a });
export const orderBy = (...a) => ({ __o: a });
export const limit = n => ({ __l: n });
export const addDoc = async () => ({ id: "new1" });
export const setDoc = async () => {};
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const deleteField = () => ({ __del: true });
export const getDocs = async () => snap([]);
export const getDoc = async d => {
  const p = d && d.__doc || "";
  if (p.startsWith("kullanicilar/")) return mkDoc(d.id, { rol: "yonetici", aktif: true });
  return { id: d && d.id, exists: () => false, data: () => undefined };
};
/* Canlı akış ve bakım listesi için tek örnek kayıt: kesme işaretli metin ve yaklaşan bakım (gerileme testleri) */
const ORNEK = { firmaAdi: "Ali'nin Serası", aramaFirma: "ali'nin serasi", sehir: "antalya", islemTipi: "Bakım", aciklama: "Kazan'ın basıncı düşüktü \\ ayarlandı",
  ekleyen: "test@enorpa.com", fotoId: "f1", formKodu: "ALIN1", firmaKodu: "ALIN", formNo: 1, tarih: new Date().toISOString(),
  sonrakiBakim: new Date(Date.now() + 3 * 864e5).toISOString() };
export const onSnapshot = (q, a, b) => {
  const cb = typeof a === "function" ? a : b;
  const d = { ...mkDoc("ornek1", ORNEK), metadata: { hasPendingWrites: false } };
  setTimeout(() => cb && cb(snap(window.__FAKE_USER__ ? [d] : [])), 0);
  return () => {};
};
export const startAfter = (...a) => ({ __sa: a });
export const writeBatch = () => ({ set() {}, update() {}, delete() {}, commit: async () => {} });
export const runTransaction = async (db, fn) => fn({ get: async d => ({ id: d.id, exists: () => false, data: () => undefined }), set() {}, update() {}, delete() {} });
export const getCountFromServer = async () => ({ data: () => ({ count: 0 }) });
