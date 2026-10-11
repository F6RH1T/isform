export function metniNormalizeEt(m) {
  if (!m) return "";
  return String(m).toLocaleLowerCase("tr-TR").replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c").replace(/\s+/g," ").trim();
}

export function htmlGuvenli(m) {
  if (!m) return "";
  let s = String(m);
  s = s.split(String.fromCharCode(92)).join(String.fromCharCode(92, 92));
  s = s.split("'").join("\\'");
  s = s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  return s;
}

export function jsGuvenliMetin(m) {
  if (!m) return "";
  let s = String(m);
  s = s.split(String.fromCharCode(92)).join(String.fromCharCode(92, 92));
  s = s.split("'").join("\\'");
  s = s.replace(/[\r\n]+/g," ");
  return htmlGuvenli(s);
}
