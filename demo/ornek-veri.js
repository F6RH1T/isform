/* DEMO verisi: tamamen uydurma firma ve kişi adları. Her açılışta bugüne göre yeniden üretilir
   (son 7 ayda dağılmış ~60 servis kaydı, yaklaşan ve gecikmiş bakımlar, firma kartları, personel listesi). */
import { metniNormalizeEt } from "../src/lib/text.js";
import { firmaKodTaban } from "../src/lib/firma-kodu.js";

export const DEMO_KULLANICI = "demo@enorpa.com";

const FIRMALAR = [
  ["Akdeniz Sera Tarım", "antalya", [36.89, 30.71]], ["Yeşilvadi Fide", "antalya", [36.88, 30.65]],
  ["Toros Çiçekçilik", "mersin", [36.81, 34.64]], ["Kumluca Organik Sebze", "antalya", [36.37, 30.29]],
  ["Ege Seracılık", "izmir", [38.42, 27.14]], ["Bereket Domates Koop.", "antalya", [36.55, 30.05]],
  ["Anadolu Agro", "konya", [37.87, 32.49]], ["Mavi Ufuk Tarım", "mugla", [37.03,27.43]],
  ["Çukurova Fide Üretim", "adana", [37.00, 35.32]], ["Uludağ Yeşil Ev", "bursa", [40.19, 29.06]],
  ["Göksu Sebzecilik", "mersin", [36.38, 33.93]], ["Başkent Bitki", "ankara", [39.93, 32.85]],
  ["Marmara Peyzaj", "istanbul", [41.01, 28.98]], ["Demre Hasat", "antalya", [36.24, 29.98]],
  ["Ali'nin Serası", "antalya", [36.90, 30.69]], ["Kapadokya Çilek", "nevsehir", [38.62, 34.71]]
];
const NOTLAR = {
  "Bakım": ["Yıllık bakım yapıldı. Brülör temizlendi, nozul değişti, baca gazı ölçümü normal.", "Kazan dış yüzey temizliği, emniyet ventilleri kontrol edildi. Basınç 1,8 bar sabit.",
    "Periyodik bakım: filtreler değişti, sirkülasyon pompası yağlandı, termostat ayarları kontrol edildi.", "Isı eşanjörü kireç çözme işlemi yapıldı, verim artışı gözlendi."],
  "Arıza": ["Brülör ateşleme yapmıyordu. Ateşleme elektrodu ve trafosu değiştirildi, test edildi, çalışıyor.", "Kazan basıncı düşüyordu. Genleşme tankı ön basıncı ayarlandı, kaçak bulunmadı.",
    "Pompa ses yapıyordu; rulman arızası. Pompa değiştirildi, müşteriye bilgi verildi.", "Alev sensörü kirli olduğu için kilitleme yapıyordu, temizlendi. 2 hafta sonra tekrar kontrol önerildi."],
  "Kurulum": ["Yeni Kalsedon kazan kurulumu tamamlandı. Devreye alma ve müşteri eğitimi yapıldı.", "Has Turbo sistem montajı, baca bağlantısı ve otomasyon panosu kurulumu yapıldı."],
  "Keşif": ["Sera ısıtma ihtiyacı için keşif yapıldı. 4 dönüm cam sera, mevcut sistem eski. Teklif hazırlanacak.", "Kazan dairesi yer tespiti ve yakıt hattı güzergâhı incelendi."]
};
const PERSONEL = ["Ahmet Yılmaz", "Mehmet Demir", "Ayşe Kaya", "Can Öztürk", "Elif Şahin", "Burak Arslan", "Zeynep Çelik", "Emre Koç"];
const TEKNISYEN = ["saha1@enorpa.com", "saha2@enorpa.com", "saha3@enorpa.com", DEMO_KULLANICI];

/* Basit, tekrarlanabilir rastgele sayı (her açılışta aynı veri) */
let tohum = 7;
const rnd = () => { tohum = (tohum * 16807) % 2147483647; return (tohum - 1) / 2147483646; };
const sec = a => a[Math.floor(rnd() * a.length)];

/* Form fotoğrafı yerine: el yazısı formu andıran küçük bir çizim */
function fotoSvg(firma, kod, not) {
  const satir = String(not).match(/.{1,46}(\s|$)/g) || [];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
<rect width="720" height="960" fill="#fbfaf7"/><rect x="40" y="40" width="640" height="110" rx="14" fill="none" stroke="#555" stroke-width="2"/>
<text x="70" y="105" font-family="Arial" font-size="30" font-weight="700" fill="#f26522">ENORPA</text>
<text x="300" y="90" font-family="Arial" font-size="20" font-weight="700" fill="#333">SERVİS İŞ EMRİ FORMU</text>
<text x="300" y="125" font-family="Arial" font-size="18" fill="#c0504d">No: ${esc(kod)}</text>
<text x="60" y="210" font-family="Arial" font-size="20" fill="#333">Firma: ${esc(firma)}</text>
<g stroke="#ccc">${Array.from({ length: 16 }, (_, i) => `<line x1="60" x2="660" y1="${280 + i * 36}" y2="${280 + i * 36}"/>`).join("")}</g>
${satir.slice(0, 10).map((t, i) => `<text x="64" y="${272 + i * 36}" font-family="Comic Sans MS, cursive" font-size="21" fill="#1d3f8f">${esc(t)}</text>`).join("")}
<path d="M470 880c30-40 60 20 90-10s40-30 70 0" stroke="#1d3f8f" stroke-width="3" fill="none"/></svg>`;
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

export function ornekVeri() {
  const formlar = new Map(), fotolar = new Map(), firmalar = new Map(), sayaclar = new Map();
  const bugun = new Date(); bugun.setHours(12, 0, 0, 0);
  const gun = n => { const d = new Date(bugun); d.setDate(d.getDate() + n); return d.toISOString(); };
  let fotoNo = 0;
  FIRMALAR.forEach(([ad, sehir, konum], fi) => {
    const arama = metniNormalizeEt(ad), kod = firmaKodTaban(arama) + (fi === 14 ? "A" : "");
    const adet = 2 + Math.floor(rnd() * 5);
    for (let n = 1; n <= adet; n++) {
      const tip = n === 1 && rnd() < .4 ? "Kurulum" : sec(["Bakım", "Bakım", "Arıza", "Arıza", "Keşif"]);
      const once = -Math.floor(rnd() * 200) - (adet - n) * 18;
      const not = sec(NOTLAR[tip]), formKodu = kod + n, fotoId = "foto" + (++fotoNo);
      fotolar.set(fotoId, { base64: fotoSvg(ad, formKodu, not) });
      const v = { firmaAdi: ad, aramaFirma: arama, sehir, islemTipi: tip, aciklama: not, ekleyen: sec(TEKNISYEN), fotoId,
        firmaKodu: kod, formNo: n, formKodu, tarih: gun(once), eklenmeTarihi: gun(once),
        konum: { lat: konum[0] + (rnd() - .5) * .05, lng: konum[1] + (rnd() - .5) * .05 } };
      if (n === adet && tip === "Bakım") { v.bakimAralik = sec([6, 12]); v.sonrakiBakim = gun(sec([-12, -3, 0, 2, 5, 9, 21, 40])); }
      formlar.set("f" + fi + "_" + n, v);
    }
    sayaclar.set(encodeURIComponent(arama), { firmaKodu: kod, sonNo: adet, aramaFirma: arama });
    if (fi % 3 === 0) firmalar.set(encodeURIComponent(arama), { yetkili: sec(PERSONEL), telefon: "0532 " + (100 + fi) + " 45 67", adres: sehir.toLocaleUpperCase("tr-TR") + " merkez",
      notlar: "Kazan dairesi anahtarı bekçide.", etiketler: "sera, büyük müşteri", guncelleyen: DEMO_KULLANICI, guncellemeTarihi: gun(-5) });
  });
  // Bugün eklenmiş birkaç kayıt: ana ekran sayaçları ve akış dolu görünsün
  ["Akdeniz Sera Tarım", "Toros Çiçekçilik"].forEach((ad, i) => {
    const arama = metniNormalizeEt(ad), s = sayaclar.get(encodeURIComponent(arama)), no = ++s.sonNo, fotoId = "foto" + (++fotoNo), not = NOTLAR["Arıza"][i];
    fotolar.set(fotoId, { base64: fotoSvg(ad, s.firmaKodu + no, not) });
    formlar.set("bugun" + i, { firmaAdi: ad, aramaFirma: arama, sehir: i ? "mersin" : "antalya", islemTipi: "Arıza", aciklama: not, ekleyen: DEMO_KULLANICI,
      fotoId, firmaKodu: s.firmaKodu, formNo: no, formKodu: s.firmaKodu + no, tarih: gun(0), eklenmeTarihi: new Date(Date.now() - (i + 1) * 47 * 60000).toISOString() });
  });
  const personel = new Map(PERSONEL.map((ad, i) => ["p" + i, { ad, adNorm: metniNormalizeEt(ad), aktif: true, ekleyen: DEMO_KULLANICI, eklenme: gun(-90) }]));
  const kullanicilar = new Map([[DEMO_KULLANICI, { rol: "yonetici", aktif: true }], ["saha1@enorpa.com", { rol: "duzenleyen", aktif: true }],
    ["saha2@enorpa.com", { rol: "duzenleyen", aktif: true }], ["saha3@enorpa.com", { rol: "goruntuleyen", aktif: false }]]);
  const islemGecmisi = new Map([["g1", { zaman: gun(0), kim: DEMO_KULLANICI, islem: "Form eklendi", hedef: "AKDE7 · Akdeniz Sera Tarım", detay: "" }]]);
  return { formlar, formFotograflari: fotolar, firmalar, sayaclar, personel, kullanicilar, islemGecmisi, firmaKodlari: new Map(), ayarlar: new Map() };
}
