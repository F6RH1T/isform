import { test } from "node:test";
import assert from "node:assert/strict";
import { metniNormalizeEt, htmlGuvenli, jsGuvenliMetin } from "../../src/lib/text.js";

test("metniNormalizeEt: Türkçe karakterleri sadeleştirir, boşlukları toplar", () => {
  assert.equal(metniNormalizeEt("İSTANBUL  Şişli ÇAĞRI"), "istanbul sisli cagri");
  assert.equal(metniNormalizeEt("  Ağrı   Dağı "), "agri dagi");
  assert.equal(metniNormalizeEt(null), "");
  assert.equal(metniNormalizeEt(undefined), "");
});

test("htmlGuvenli: HTML özel karakterlerini kaçırır", () => {
  assert.equal(htmlGuvenli('<b>"A&B"</b>'), "&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;");
  assert.equal(htmlGuvenli(""), "");
  assert.equal(htmlGuvenli(null), "");
});

test("htmlGuvenli: tek tırnağı JS dizgesi için ters bölüyle kaçırır", () => {
  assert.equal(htmlGuvenli("O'Brien"), "O\\'Brien");
});

test("jsGuvenliMetin: satır sonlarını boşluğa çevirir", () => {
  assert.doesNotMatch(jsGuvenliMetin("a\nb\r\nc"), /[\r\n]/);
});

/* Karakterizasyon testi: mevcut davranışı sabitler. jsGuvenliMetin, kaçışı yaptıktan sonra htmlGuvenli'yi de
   çağırdığı için tek tırnak ve ters bölü İKİ kez kaçırılıyor (a\\\'b). Niyet buysa dokunmayın; hataysa bu testi
   güncelleyip düzeltin. */
test("jsGuvenliMetin (mevcut davranış): kaçış iki katmanlı", () => {
  assert.equal(jsGuvenliMetin("a'b"), "a\\\\\\'b");
});
