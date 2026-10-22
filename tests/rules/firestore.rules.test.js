/* Firestore güvenlik kuralları testleri (emülatörde çalışır).
   Kullanım: npm run test:rules   (Java ve firebase-tools gerekir: npm i -g firebase-tools) */
import { after, before, beforeEach, describe, test } from "node:test";
import fs from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteField, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

let env;
const YON = "yon@enorpa.com", DUZ = "duz@enorpa.com", GOR = "gor@enorpa.com", PAS = "pas@enorpa.com", YAB = "yab@enorpa.com";
const db = mail => env.authenticatedContext(mail.split("@")[0], { email: mail }).firestore();

const form = (ekleyen, ek = {}) => ({
  firmaAdi: "Örnek Tarım", aramaFirma: "ornek tarim", sehir: "antalya", islemTipi: "Bakım", aciklama: "Kazan'ın basıncı düşük",
  ekleyen, fotoId: "f1", firmaKodu: "ORNE", formNo: 1, formKodu: "ORNE1", tarih: "2026-10-01T09:00:00.000Z",
  eklenmeTarihi: "2026-10-01T09:00:00.000Z", ...ek
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "enorpa-kural-testi",
    firestore: { rules: fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") }
  });
});
after(() => env && env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const d = c.firestore();
    await setDoc(doc(d, "kullanicilar", YON), { rol: "yonetici", aktif: true });
    await setDoc(doc(d, "kullanicilar", DUZ), { rol: "duzenleyen", aktif: true });
    await setDoc(doc(d, "kullanicilar", GOR), { rol: "goruntuleyen", aktif: true });
    await setDoc(doc(d, "kullanicilar", PAS), { rol: "duzenleyen", aktif: false });
    await setDoc(doc(d, "formlar", "mevcut"), form(DUZ, { sonrakiBakim: "2026-12-01T09:00:00.000Z" }));
    await setDoc(doc(d, "sayaclar", "ornek%20tarim"), { firmaKodu: "ORNE", sonNo: 5, aramaFirma: "ornek tarim" });
  });
});

describe("formlar", () => {
  test("görüntüleyen okur, kayıtsız ve pasif okuyamaz", async () => {
    await assertSucceeds(getDoc(doc(db(GOR), "formlar", "mevcut")));
    await assertFails(getDoc(doc(db(YAB), "formlar", "mevcut")));
    await assertFails(getDoc(doc(db(PAS), "formlar", "mevcut")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "formlar", "mevcut")));
  });
  test("düzenleyen geçerli kayıt ekler; görüntüleyen ekleyemez", async () => {
    await assertSucceeds(setDoc(doc(db(DUZ), "formlar", "y1"), form(DUZ)));
    await assertFails(setDoc(doc(db(GOR), "formlar", "y2"), form(GOR)));
  });
  test("başkası adına (ekleyen) kayıt eklenemez", async () => {
    await assertFails(setDoc(doc(db(DUZ), "formlar", "y3"), form(YON)));
  });
  test("bilinmeyen alan, boş firma ve dev açıklama reddedilir", async () => {
    await assertFails(setDoc(doc(db(DUZ), "formlar", "y4"), form(DUZ, { hacker: true })));
    await assertFails(setDoc(doc(db(DUZ), "formlar", "y5"), form(DUZ, { firmaAdi: "" })));
    await assertFails(setDoc(doc(db(DUZ), "formlar", "y6"), form(DUZ, { aciklama: "x".repeat(20001) })));
    await assertFails(setDoc(doc(db(DUZ), "formlar", "y7"), form(DUZ, { bakimAralik: 999 })));
  });
  test("düzenleyen yalnızca bakım hatırlatmasını kapatabilir", async () => {
    await assertSucceeds(updateDoc(doc(db(DUZ), "formlar", "mevcut"), { sonrakiBakim: deleteField() }));
    await assertFails(updateDoc(doc(db(DUZ), "formlar", "mevcut"), { aciklama: "değişti" }));
  });
  test("yönetici düzenler ve siler; düzenleyen silemez", async () => {
    await assertSucceeds(updateDoc(doc(db(YON), "formlar", "mevcut"), { aciklama: "düzeltildi" }));
    await assertFails(deleteDoc(doc(db(DUZ), "formlar", "mevcut")));
    await assertSucceeds(deleteDoc(doc(db(YON), "formlar", "mevcut")));
  });
});

describe("sayaclar ve firmaKodlari", () => {
  test("sayaç yalnızca ileri gider", async () => {
    await assertSucceeds(updateDoc(doc(db(DUZ), "sayaclar", "ornek%20tarim"), { sonNo: 6 }));
    await assertFails(updateDoc(doc(db(DUZ), "sayaclar", "ornek%20tarim"), { sonNo: 2 }));
    await assertFails(updateDoc(doc(db(DUZ), "sayaclar", "ornek%20tarim"), { firmaKodu: "BASKA" }));
    await assertFails(getDoc(doc(db(GOR), "sayaclar", "ornek%20tarim")));
  });
  test("firma kodu bir kez rezerve edilir, düzenleyen başkasınınkini değiştiremez", async () => {
    await assertSucceeds(setDoc(doc(db(DUZ), "firmaKodlari", "ORNE"), { aramaFirma: "ornek tarim" }));
    await assertFails(setDoc(doc(db(DUZ), "firmaKodlari", "ORNE"), { aramaFirma: "baska firma" }));
  });
});

describe("kullanicilar", () => {
  test("herkes kendi kaydını okur, listeyi yalnızca yönetici görür", async () => {
    await assertSucceeds(getDoc(doc(db(GOR), "kullanicilar", GOR)));
    await assertFails(getDoc(doc(db(GOR), "kullanicilar", DUZ)));
    await assertFails(getDocs(collection(db(DUZ), "kullanicilar")));
    await assertSucceeds(getDocs(collection(db(YON), "kullanicilar")));
  });
  test("yönetici rol verir, geçersiz rol ve kendi kaydı reddedilir; düzenleyen rol veremez", async () => {
    await assertSucceeds(setDoc(doc(db(YON), "kullanicilar", "yeni@enorpa.com"), { rol: "duzenleyen", aktif: true, guncelleyen: YON }));
    await assertFails(setDoc(doc(db(YON), "kullanicilar", "kotu@enorpa.com"), { rol: "patron", aktif: true }));
    await assertFails(updateDoc(doc(db(YON), "kullanicilar", YON), { aktif: false }));
    await assertFails(setDoc(doc(db(DUZ), "kullanicilar", DUZ), { rol: "yonetici", aktif: true }));
  });
});

describe("diğer koleksiyonlar", () => {
  test("işlem geçmişi: kendi adına eklenir, değiştirilemez, yalnızca yönetici okur", async () => {
    const kayit = { zaman: "2026-10-01T09:00:00.000Z", kim: DUZ, islem: "Form eklendi", hedef: "ORNE1", detay: "" };
    await assertSucceeds(setDoc(doc(db(DUZ), "islemGecmisi", "g1"), kayit));
    await assertFails(setDoc(doc(db(DUZ), "islemGecmisi", "g2"), { ...kayit, kim: YON }));
    await assertFails(getDoc(doc(db(DUZ), "islemGecmisi", "g1")));
    await assertSucceeds(getDoc(doc(db(YON), "islemGecmisi", "g1")));
    await assertFails(updateDoc(doc(db(YON), "islemGecmisi", "g1"), { islem: "x" }));
  });
  test("firma kartı: düzenleyen kendi adıyla yazar, bilinmeyen alan reddedilir", async () => {
    const k = { yetkili: "Ali", telefon: "0555", adres: "", notlar: "", etiketler: "", guncelleyen: DUZ, guncellemeTarihi: "2026-10-01" };
    await assertSucceeds(setDoc(doc(db(DUZ), "firmalar", "ornek%20tarim"), k));
    await assertFails(setDoc(doc(db(DUZ), "firmalar", "f2"), { ...k, rol: "yonetici" }));
    await assertFails(setDoc(doc(db(GOR), "firmalar", "f3"), { ...k, guncelleyen: GOR }));
  });
  test("fotoğraf: düzenleyen ekler, güncellenemez", async () => {
    await assertSucceeds(setDoc(doc(db(DUZ), "formFotograflari", "p1"), { base64: "data:image/jpeg;base64,AAAA" }));
    await assertFails(setDoc(doc(db(DUZ), "formFotograflari", "p1"), { base64: "baska" }));
    await assertFails(setDoc(doc(db(DUZ), "formFotograflari", "p2"), { base64: "x", kod: "<script>" }));
  });
  test("tanımsız koleksiyonlar kapalı", async () => {
    await assertFails(setDoc(doc(db(YON), "baska", "x"), { a: 1 }));
  });
});
