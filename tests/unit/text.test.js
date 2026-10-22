import { test } from "node:test";
import assert from "node:assert/strict";
import { metniNormalizeEt, htmlGuvenli, jsGuvenliMetin, csvHucre } from "../../src/lib/text.js";

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

test("htmlGuvenli: tek tırnak ve ters bölü görünen metni bozmaz", () => {
  assert.equal(htmlGuvenli("Kazan'ın \\ basıncı"), "Kazan&#39;ın \\ basıncı");
  assert.equal(htmlGuvenli(0), "0");
});

test("jsGuvenliMetin: satır sonlarını boşluğa çevirir", () => {
  assert.doesNotMatch(jsGuvenliMetin("a\nb\r\nc"), /[\r\n]/);
});

/* Öznitelik çözümü + JS dizgesi ayrıştırması özgün metni geri vermeli */
test("jsGuvenliMetin: onclick içinde özgün metni korur", () => {
  const coz = t => t.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const metin of ["O'Brien", "a\\b", 'x"y', "<b>&</b>", "');alert(1);//"]) {
    assert.equal(new Function("return '" + coz(jsGuvenliMetin(metin)) + "'")(), metin);
  }
});

test("csvHucre: tırnak ve formül enjeksiyonu", () => {
  assert.equal(csvHucre('a"b'), '"a""b"');
  assert.equal(csvHucre("=HYPERLINK(1)"), "\"'=HYPERLINK(1)\"");
  assert.equal(csvHucre(null), '""');
});
