import { test } from "node:test";
import assert from "node:assert/strict";
import { TIP_RENK, tipSinif } from "../../src/lib/tip.js";

test("tipSinif: işlem tipini renk sınıfına çevirir", () => {
  assert.equal(tipSinif("Bakım"), "bakim");
  assert.equal(tipSinif("Arıza"), "ariza");
  assert.equal(tipSinif("Müşteri Ziyareti"), "ziyaret");
  assert.equal(tipSinif("MÜŞTERİ ZİYARETİ"), "ziyaret");
  assert.equal(tipSinif("Kurulum"), "kurulum");
  assert.equal(tipSinif("Keşif"), "kesif");
  assert.equal(tipSinif("Diğer"), "diger");
  assert.equal(tipSinif(""), "yok");
  assert.equal(tipSinif("Belirtilmemiş"), "yok");
});

test("TIP_RENK: her sınıfın bir rengi var", () => {
  for (const s of ["bakim", "ariza", "ziyaret", "kurulum", "kesif", "diger", "yok"]) assert.match(TIP_RENK[s], /^#[0-9a-f]{6}$/);
});
