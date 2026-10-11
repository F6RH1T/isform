import { test } from "node:test";
import assert from "node:assert/strict";
import { vektorMetni, vNorm, vektorPaketle, vektorAc, kosinus, VEKTOR_BOYUT } from "../../src/lib/vektor.js";

test("vektorMetni: tipi öne ekler ve 1500 karakterle sınırlar", () => {
  assert.equal(vektorMetni("Bakım", " yağ değişti "), "Bakım: yağ değişti");
  assert.equal(vektorMetni("", "x"), "x");
  assert.equal(vektorMetni("", "a".repeat(2000)).length, 1500);
});

test("vNorm: birim uzunluğa getirir; sıfır vektörde bölme hatası olmaz", () => {
  const n = vNorm([3, 4]);
  assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-12);
  assert.deepEqual(vNorm([0, 0]), [0, 0]);
});

test("vektorPaketle/vektorAc: gidiş-dönüş, 1 bayt/boyut ve ±1/127 hassasiyet", () => {
  const v = vNorm(Array.from({ length: VEKTOR_BOYUT }, (_, i) => Math.sin(i + 1)));
  const paket = vektorPaketle(v);
  assert.equal(Buffer.from(paket, "base64").length, VEKTOR_BOYUT);
  const acik = vektorAc(paket);
  assert.equal(acik.length, VEKTOR_BOYUT);
  v.forEach((x, i) => assert.ok(Math.abs(acik[i] / 127 - x) <= 1 / 127 + 1e-9));
});

test("kosinus: aynı yönlü vektörde ~1, dik vektörde 0", () => {
  const a = vNorm([1, 2, 3]), p = vektorAc(vektorPaketle(a));
  assert.ok(kosinus(a, p) > 0.99);
  assert.equal(kosinus([1, 0], new Int8Array([0, 5])), 0);
  assert.equal(kosinus([1, 1], new Int8Array([0, 0])), 0);
});
