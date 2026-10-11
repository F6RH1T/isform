import { test } from "node:test";
import assert from "node:assert/strict";
import { firmaKodTaban, harfEki, koddanNo } from "../../src/lib/firma-kodu.js";

test("firmaKodTaban: ilk 4 harf, büyük harf, en az 3 karaktere X ile tamamlanır", () => {
  assert.equal(firmaKodTaban("enorpa teknik"), "ENOR");
  assert.equal(firmaKodTaban("ab"), "ABX");
  assert.equal(firmaKodTaban(""), "XXX");
  assert.equal(firmaKodTaban(null), "XXX");
});

test("harfEki: Excel sütun adı gibi A, B … Z, AA, AB", () => {
  assert.deepEqual([1, 2, 26, 27, 28, 52, 53].map(harfEki), ["A", "B", "Z", "AA", "AB", "AZ", "BA"]);
  assert.equal(harfEki(0), "");
});

test("koddanNo: koddaki sondaki sayıyı verir, yoksa 0", () => {
  assert.equal(koddanNo("ENOR-012"), 12);
  assert.equal(koddanNo("A7B9"), 9);
  assert.equal(koddanNo("X"), 0);
  assert.equal(koddanNo(null), 0);
});
