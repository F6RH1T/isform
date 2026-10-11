import { test } from "node:test";
import assert from "node:assert/strict";

process.env.TZ = "Europe/Istanbul";   // testlerin makineden bağımsız olması için (Date yerel saat kullanır)
const { tarihiInputaCevir, inputtanIsoYap, tarihKarsilastir, ayEkle } = await import("../../src/lib/dates.js");

test("tarihiInputaCevir: ISO'yu yyyy-aa-gg yapar, geçersizde boş döner", () => {
  assert.equal(tarihiInputaCevir("2026-03-05T12:00:00"), "2026-03-05");
  assert.equal(tarihiInputaCevir("geçersiz"), "");
  assert.match(tarihiInputaCevir(), /^\d{4}-\d{2}-\d{2}$/);
});

test("inputtanIsoYap: günü öğlen 12:00 yerel saate sabitler (saat dilimi kayması olmaz)", () => {
  assert.equal(inputtanIsoYap("2026-03-05"), "2026-03-05T09:00:00.000Z");
});

test("tarihKarsilastir: yeniden eskiye, aynı gün ise büyük form numarası önce", () => {
  const liste = [{ tarih: "2026-01-01", formNo: 1 }, { tarih: "2026-02-01", formNo: 1 }, { tarih: "2026-02-01", formNo: 5 }];
  assert.deepEqual(liste.sort(tarihKarsilastir).map(x => `${x.tarih}#${x.formNo}`), ["2026-02-01#5", "2026-02-01#1", "2026-01-01#1"]);
});

test("tarihKarsilastir: form numarası yoksa koddan okur", () => {
  const a = { tarih: "2026-02-01", formKodu: "ENOR-3" }, b = { tarih: "2026-02-01", formKodu: "ENOR-9" };
  assert.deepEqual([a, b].sort(tarihKarsilastir), [b, a]);
});

test("ayEkle: ay ekler", () => {
  assert.equal(ayEkle("2026-01-15T12:00:00.000Z", 6), "2026-07-15T12:00:00.000Z");
  assert.equal(ayEkle("2026-01-15T12:00:00.000Z", "3"), "2026-04-15T12:00:00.000Z");
});

/* Karakterizasyon testi: 31 Ocak + 1 ay, JavaScript taşması yüzünden Şubat'ı atlayıp 3 Mart olur.
   Bakım hatırlatma tarihlerini etkileyebilir; düzeltilirse bu testi güncelleyin. */
test("ayEkle (mevcut davranış): ay sonlarında taşar", () => {
  assert.equal(ayEkle("2026-01-31T12:00:00.000Z", 1), "2026-03-03T12:00:00.000Z");
});
