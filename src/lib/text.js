export function metniNormalizeEt(m) {
  if (!m) return "";
  return String(m).toLocaleLowerCase("tr-TR").replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c").replace(/\s+/g," ").trim();
}

/* Metni HTML içine (etiket içeriği veya tırnaklı öznitelik) güvenle yazmak için kaçırır. Görünen metni değiştirmez. */
export function htmlGuvenli(m) {
  if (m === null || m === undefined || m === "") return "";
  return String(m).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* Satır içi onclick="fn('…')" gibi, çift tırnaklı bir öznitelikteki tek tırnaklı JS dizgesi için:
   önce JS kaçışı (\  '  satır sonu), sonra HTML kaçışı. Tarayıcı özniteliği çözünce JS özgün metni görür. */
export function jsGuvenliMetin(m) {
  if (m === null || m === undefined || m === "") return "";
  const js = String(m).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/[\r\n\u2028\u2029]+/g, " ");
  return htmlGuvenli(js);
}

/* CSV hücresi: tırnaklar, satır sonları ve formül enjeksiyonu (= + - @ ile başlayan hücreler) için korunur. */
export function csvHucre(x) {
  let s = String(x === null || x === undefined ? "" : x).replace(/[\r\n]+/g, " ");
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

/* Satır dizisinden Excel'in Türkçe ayarlarıyla açacağı CSV dosyası indirir (; ayraçlı, UTF-8 BOM'lu). */
export function csvIndir(satirlar, dosyaAdi) {
  const csv = "\ufeff" + satirlar.map(r => r.map(csvHucre).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = dosyaAdi;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
