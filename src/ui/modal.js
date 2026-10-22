/* Pencereyi arka plana (boşluğa) dokununca kapatır. İçinde kaydedilmemiş değişiklik varsa önce sorar,
   böylece yanlışlıkla dokunulunca yazılanlar kaybolmaz. Pencere açılırken temizSay(m) çağrılmalıdır. */
export function disaridanKapat(m, kapat, soru = "Kaydedilmemiş değişiklikler var. Pencere kapatılsın mı?") {
  let disaridaBasladi = false;   // içeride başlayıp dışarıda biten sürükleme (metin seçimi) pencereyi kapatmasın
  const kirlet = () => { m.dataset.kirli = "1"; };
  m.addEventListener("input", kirlet);
  m.addEventListener("change", kirlet);
  m.addEventListener("pointerdown", e => { disaridaBasladi = e.target === m; });
  m.addEventListener("click", e => {
    if (e.target !== m || !disaridaBasladi) return;
    if (m.dataset.kirli === "1" && !confirm(soru)) return;
    delete m.dataset.kirli;
    kapat();
  });
}
export const temizSay = m => { if (m) delete m.dataset.kirli; };
