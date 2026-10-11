import { aiSis, bugun } from "./ui.js";

/* ===== AI: TÜM PROMPT VE ŞEMALAR TEK YERDE (metni değiştirirken surum'u artırın) ===== */
export const AI_PROMPT = {
  surum: 3,
  sistem: aiSis,
  notDuzelt: n => "Aşağıdaki servis notunu yazım hatalarını düzelterek, kısa ve resmî bir servis raporu diline çevir. Bilgi ekleme, çıkarma. Sadece düzeltilmiş metni ver.\n\n" + n,
  notKontrol: (tip, n) => `İşlem tipi: ${tip || "belirtilmemiş"}. Bu servis notunda eksik kalmış önemli bilgileri (arıza nedeni, değişen parça, yapılan işlem, test/sonuç, müşteriye bildirilen durum) kısa sorular halinde listele. Eksik yoksa sadece "Eksik görünmüyor" yaz.\n\nNot: ${n}`,
  firmaOzet: (firma, L) => `Firma: ${firma}. Servise gitmeden önce okunacak 4-5 maddelik kısa özet yaz: sık tekrar eden sorunlar, son işlem, bakım durumu, dikkat edilecekler. Kayıtlar: ${JSON.stringify(L)}`,
  musteriMesaj: (yetkili, firma, L) => `Müşteriye gönderilecek kısa, nazik bir WhatsApp mesajı yaz (yetkili: ${yetkili || "belirtilmemiş"}, firma: ${firma}). Yaklaşan/gecikmiş bakım varsa hatırlat, yoksa son yapılan işi özetleyip memnuniyet sor. Bugün: ${bugun()}. Kayıtlar: ${JSON.stringify(L.slice(0, 5))}`,
  raporYorum: veri => `Bugün: ${bugun()}. Bu servis kayıt istatistiklerini yöneticiye 5-6 maddede yorumla: öne çıkanlar, artış/azalış, dikkat edilmesi gerekenler. Sayıları aynen kullan.\n${JSON.stringify(veri)}`,
  kartvizit: 'Kartvizitten JSON çıkar: {"yetkili":"","firma":"","telefon":"","eposta":"","adres":""}. Okunamayanı boş bırak, uydurma.',
  formOku: "Bu bir servis iş formu fotoğrafı (el yazısı olabilir, ters/yan çekilmiş olabilir). Formda yazan yapılan işlem, arıza, değişen parça ve notları okuyup 'Açıklama' alanına yazılacak düzgün ve kısa bir Türkçe metin olarak yaz. Okunamayan veya görünmeyen bilgiyi uydurma. Hiç okunabilir açıklama yoksa sadece OKUNAMADI yaz. Sadece metni ver.",
  asPlan: (konusma, soru) => `Bugün: ${bugun()}. Bir servis kayıt uygulamasının asistanısın. Kullanıcının son mesajının servis kayıtlarına bakmayı gerektirip gerektirmediğine karar ver ve filtreleri çıkar. Önceki konuşma varsa ("peki Konya'da?", "onların hepsi") bağlamdan tamamla.
Sadece JSON ver: {"kayit":true,"firma":"","sehir":"","islemTipi":"Bakım|Arıza|Kurulum|Keşif|Diğer veya boş","baslangic":"YYYY-MM-DD veya boş","bitis":"YYYY-MM-DD veya boş","anahtar":["notlarda geçecek kelimelerin KÖK hali, ek almamış"],"ekleyen":"e-posta parçası veya boş","bakim":"gecikmis|yaklasan|boş","yaklasanGun":7,"gruplama":"firma|sehir|islemTipi|ay|ekleyen|boş","sirala":"yeni|eski","anlamsal":"boş veya aranacak kısa metin"}
"Geçen yıl", "son 3 ay", "bu ay", "geçen hafta" gibi ifadeleri tarihe çevir. Sadece sorulanı doldur, fazlasını ekleme. Sayma, "en çok", "dağılım" soruları için gruplama doldur. Kullanıcı bir arıza belirtisi/sorun tarif edip benzer geçmiş kayıtları, daha önce çıkıp çıkmadığını veya çözümünü soruyorsa (ör. "kazan basıncı düşüyor, benzeri var mı?") anlamsal alanına sorunu anlatan kısa bir arama metni yaz. Genel sohbet, mesaj/e-posta taslağı yazma, uygulama nasıl kullanılır gibi sorularda kayit=false.\n\nÖnceki konuşma:\n${konusma}\n\nSon mesaj: ${soru}`,
  asSistem: "Sen ENORPA teknik servis firmasının uygulama asistanısın. Türkçe, kısa ve net yaz. Sayıları ve listeleri yalnızca sana verilen sayımlardan ve kayıtlardan al, kendin sayma, kayıtta olmayanı uydurma. Eşleşme yoksa bunu söyle ve yazımı kontrol etmesini öner. Gerekirse madde işareti kullan, önemli yerleri **kalın** yaz. Uygulamada Yeni (form ekleme), Ara (firma, şehir, ürün kodu, e-posta ile arama), Akış ve Rapor sekmeleri, firma kartı, bakım takibi ve yönetici paneli vardır; nasıl kullanılır diye sorulursa buna göre anlat. Mesaj, e-posta veya teklif taslağı istenirse doğrudan taslağı yaz.",
  asSohbet: (konusma, soru) => `Bugün: ${bugun()}.\nÖnceki konuşma:\n${konusma}\n\nKullanıcının mesajı: ${soru}`,
  asVeri: o => `Bugün: ${bugun()}.\nÖnceki konuşma:\n${o.konusma}\n\nKullanıcının sorusu: ${o.soru}\n\nUygulamadaki toplam kayıt: ${o.toplam}. Uygulanan filtreler: ${o.filtre || "yok"}.\nEşleşen kayıt sayısı: ${o.eslesen}, firma sayısı: ${o.firmaSay}.\n${o.tip ? "İşlem tipi dağılımı:\n" + o.tip + "\n" : ""}${o.grup ? "Gruplama (" + o.gruplamaAd + "):\n" + o.grup + "\n" : ""}${o.anlamsal ? o.anlamsal + "\n" : ""}\nKayıtlar (en fazla 60; tarih | firma | şehir | işlem | not | sonraki bakım):\n${o.veri || "(eşleşen kayıt yok)"}`
};

/* Gemini responseSchema: alan adları ve enum değerleri garanti olur. Reddedilirse gemini() şemasız dener. */
export const AI_SEMA = {
  plan: {
    type: "OBJECT", required: ["kayit"], properties: {
      kayit: { type: "BOOLEAN" }, firma: { type: "STRING" }, sehir: { type: "STRING" },
      islemTipi: { type: "STRING", enum: ["Bakım", "Arıza", "Kurulum", "Keşif", "Diğer"] },
      baslangic: { type: "STRING", description: "YYYY-MM-DD" }, bitis: { type: "STRING", description: "YYYY-MM-DD" },
      anahtar: { type: "ARRAY", items: { type: "STRING" } }, ekleyen: { type: "STRING" },
      bakim: { type: "STRING", enum: ["gecikmis", "yaklasan"] }, yaklasanGun: { type: "INTEGER" },
      gruplama: { type: "STRING", enum: ["firma", "sehir", "islemTipi", "ay", "ekleyen"] },
      sirala: { type: "STRING", enum: ["yeni", "eski"] }, anlamsal: { type: "STRING" }
    }
  },
  kartvizit: { type: "OBJECT", properties: { yetkili: { type: "STRING" }, firma: { type: "STRING" }, telefon: { type: "STRING" }, eposta: { type: "STRING" }, adres: { type: "STRING" } } }
};
