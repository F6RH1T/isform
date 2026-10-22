# Değişiklik günlüğü

## 2.1.0
**Düzeltmeler**
- Kesme işareti ve ters bölü içeren metinler ekranda `\'` olarak bozuk görünüyordu (`htmlGuvenli`); düzenleme butonu da veriye fazladan `\` yazabiliyordu.
- Kartlarda bakım rozeti ve "Kopyala" butonu hiç görünmüyordu.
- Çevrimdışı eklenen kayıtlarda fotoğraf bağlantısı kopuyordu (sahte kimlik); artık kimlik yerelde üretiliyor.
- Form silinince PDF ek sayfaları ve imzalar silinmiyordu.
- Akış sekmesi oturum açılmadan dinlenmeye başladığı için girişten sonra boş kalabiliyordu.
- 30 günden fazla gecikmiş bakımlar listede görünmüyordu; liste 15'ten 50 kayda çıktı.
- Aynı anda girilen kayıtlar aynı form numarasını alabiliyordu; numara artık transaction ile ayrılıyor.
- "Bakım yapıldı", "Kopyala" ve "Yeni kayıt olarak ekle" formu açmadan alanları dolduruyordu.
- Gece 00:00–03:00 arası "bugün" bir önceki gün sayılıyordu; 31 Ocak + 1 ay 3 Mart oluyordu.
- CSV dışa aktarımları birleştirildi; formül enjeksiyonuna karşı korunuyor.

**Güvenlik**
- Firestore kuralları alan adlarını, tipleri ve boyutları denetliyor; başkası adına kayıt eklenemiyor. Emülatör testleri eklendi.
- Personel adları kaynak koddan çıkarıldı (KVKK).
- jsPDF, html2canvas ve heic2any CDN yerine npm paketinden ve sürümü sabit yükleniyor.
- Asistan uç noktası kişi başına anahtar destekliyor, yalnızca gereken alanları okuyor, soruları işlem geçmişine yazıyor; AI proxy istek boyutunu sınırlıyor.
- Şifre sıfırlama ekranı hesabın var olup olmadığını belli etmiyor.
- Bağımlılıklar güncellendi (Firebase 12, Vite 6, firebase-admin 14); `npm audit` temiz.

**Performans**
- İmzalar form belgesinden ayrıldı (arama, rapor ve asistan her kayıtta imza indirmiyor).
- Şehir ve e-posta aramaları sınırlandı ve sunucuda tarihe göre sıralanıyor.
- Firebase ayrı dosyada; PDF şablonu, jsPDF, html2canvas ve heic2any ilk kullanımda yükleniyor (açılış dosyası 157 KB → 131 KB).
- Service worker sürümü otomatik; açılış dosyaları önceden önbelleğe alınıyor, yeni sürüm bildirimi gösteriliyor.

**Erişilebilirlik**
- Yakınlaştırma engeli kaldırıldı; alt menü klavyeyle kullanılabiliyor; bildirimler ekran okuyucuya duyuruluyor.
- Karanlık mod cihaz ayarını izliyor; imza retina ekranda net ve kalemle çalışıyor.

**Altyapı**
- `package-lock.json`, `.gitignore`, `.env.example`; lint hataları giderildi; PR'lar için CI (lint, birim, kural, duman, functions).
- Yedek kullanıcıları, işlem geçmişini ve isteğe bağlı fotoğrafları da içeriyor; optimize önce özet gösterip toplu yazıyor.

## 2.0.0
- Tek dosyalık `index.html` (3.098 satır) Vite + ES modüllerine bölündü; davranış değişmedi (orijinalle karşılaştırmalı doğrulandı).
- Modüller arası paylaşılan değişkenler `core/state.js` altında toplandı.
- Firebase SDK CDN yerine npm paketinden (10.8.1, sürüm sabit) yükleniyor; ayarlar `src/firebase/config.js`.
- Gemini istekleri `features/ai/transport.js` üzerinden; `VITE_AI_PROXY_URL` verilirse Cloud Function (`functions/`) kullanılır.
- Eklendi: birim testleri, tarayıcı duman testi, ESLint/Prettier, CI, `firestore.rules` taslağı, `asistan` (Siri/otomasyon) uç noktası.
