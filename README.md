# ENORPA İş Formları

Servis formu oluşturma, firma kartları, bakım takibi, raporlar/harita ve Gemini destekli asistan içeren PWA.
Ön yüz: düz JavaScript (ES modülleri) + Vite. Arka uç: Firebase (Auth, Firestore, App Check, Cloud Functions).

## Hızlı başlangıç

```bash
npm ci
npm run dev          # http://localhost:5173
npm run check        # lint + birim testleri + üretim derlemesi
npm run test:smoke   # tarayıcı duman testi (ilk kez: npx playwright install chromium)
npm run test:rules   # Firestore kural testleri (Java + firebase-tools gerekir: npm i -g firebase-tools)
```

Node 22 önerilir (en az 20.19).

**Demo modu (Firebase'e bağlanmadan):** `npm run demo` → http://localhost:5174. Uydurma örnek verilerle çalışır;
herhangi bir e-posta ve şifreyle yönetici olarak girilir, yapılan değişiklikler sayfa yenilenince sıfırlanır.
Görünümü denemek ve ekran görüntüsü almak içindir (`demo/` klasörü). Ayarlar için `.env.example` dosyasına bakın; boş bırakırsanız
`src/firebase/config.js` içindeki varsayılan Firebase değerleri kullanılır.

## Klasör yapısı

Ayrıntı için [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
public/        ikonlar, manifest, service worker (olduğu gibi kopyalanır)
src/
  main.js      giriş: modülleri yükleme sırasıyla içe aktarır (sıra önemlidir)
  core/        oturum, rol, kimlik doğrulama, ortak durum (state)
  firebase/    yapılandırma ve başlatma
  lib/         saf yardımcılar (metin, tarih, firma kodu, vektör …) — birim testli
  ui/          toast, tema
  features/    forms, search, firms, maintenance, reports, admin, ai
  styles/      CSS parçaları (index.css sırayla birleştirir)
functions/     Cloud Functions: aiProxy, asistan
tests/         unit (node:test), rules (Firestore emülatörü), smoke (Playwright, sahte Firebase)
```

## Otomatik kurulum (GitHub Actions)

Kurallar, indeksler, Cloud Functions, gizli anahtarlar ve günlük yedek tek iş akışıyla yayınlanır:
**Actions → Firebase kurulum → Run workflow**. Bilgisayarınıza bir şey kurmanız gerekmez.

**Ücretsiz (Spark) planda** yalnızca kurallar ve indeksler yayınlanır (iş akışında "kurallar" kutusu); Cloud Functions ve
Firestore yedek zamanlaması Blaze planı ister. Spark'ta AI eski modda çalışır: Gemini anahtarı Firestore'dan okunur.
Anahtarı korumak için Google Cloud'da anahtarı site adresine kısıtlayın (HTTP referrer: `https://f6rh1t.github.io/*`).

**Bir kerelik hazırlık**
1. (Yalnızca fonksiyonlar için) Firebase projesi **Blaze** (kullandıkça öde) planında olmalı.
2. Google Cloud Console → IAM → Service Accounts → `isform-b284d` projesinde yeni hizmet hesabı. Rolleri:
   *Firebase Admin*, *Cloud Functions Admin*, *Service Account User*, *Secret Manager Admin*, *Cloud Datastore Owner*,
   *Service Usage Admin*. Hesabın **Keys → Add key → JSON** ile anahtarını indirin.
3. GitHub → Settings → Secrets and variables → Actions → **Secrets**:
   - `FIREBASE_SERVICE_ACCOUNT`: indirdiğiniz JSON dosyasının tamamı
   - `GEMINI_API_KEY`: Google AI Studio'da oluşturduğunuz **yeni** anahtar (eskisi tarayıcılara inmiş olabilir)
   - `SHORTCUT_TOKEN` (isteğe bağlı): Siri asistanı anahtarları (aşağıya bakın)

**Sıra**
1. İş akışını varsayılan seçeneklerle çalıştırın (kurallar + fonksiyonlar + yedek).
2. Hemen ardından `iyilestirmeler` dalını `main`'e birleştirin; site AI isteklerini fonksiyon üzerinden göndermeye başlar.
3. Uygulamada AI'ın çalıştığını görünce iş akışını yalnızca **eski_anahtari_sil** seçili olarak bir kez daha çalıştırın,
   sonra eski Gemini anahtarını AI Studio'da silin.
4. Yönetici olarak uygulamaya girip ⋯ menüsü → **Eski kayıtları optimize et** (öncesinde ⋯ → Tam yedek).

## AI proxy ve Siri/Gemini uç noktası

> ⚠ **Önemli:** Proxy kurulmadıysa Gemini anahtarı Firestore'da (`ayarlar/gemini`) durur ve **her aktif kullanıcı
> (görüntüleyen dahil) okuyabilir**. Anahtarın kötüye kullanımını önlemek için aşağıdaki kurulumu yapın.

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set SHORTCUT_TOKEN        # Siri kestirmesi için uzun rastgele bir metin
firebase deploy --only functions
```

1. Deploy çıktısındaki `aiProxy` adresini `.env` içine `VITE_AI_PROXY_URL=` olarak yazın ve siteyi yeniden derleyin.
   GitHub Pages yayını için aynı değeri depo ayarlarında **Settings → Secrets and variables → Actions → Variables**
   altına `VITE_AI_PROXY_URL` adıyla ekleyin; `yayin.yml` derlemede kullanır.
2. `IZINLI_ORIGINLER` parametresine sitenizin adresini verin (CORS).
3. Çalıştığını doğrulayınca Firestore'daki `ayarlar/gemini` belgesini silin ve kuralında `allow read: if false` yapın.

**Siri (iPhone):** Kestirmeler → "Metin Dikte Et" → "URL İçeriğini Al" (yöntem POST, adres `…/asistan?format=text`,
başlık `x-asistan-anahtari: <kişinin anahtarı>`, gövde JSON `{"soru": <dikte edilen>}`) → "Metni Söyle".

`SHORTCUT_TOKEN` birden çok kişi için `ali:UZUN_RASTGELE_1,ayse:UZUN_RASTGELE_2` biçiminde verilebilir (her anahtar en az
24 karakter; `openssl rand -hex 24` ile üretin). Bir telefon kaybolursa yalnızca o kişinin anahtarını çıkarıp
`firebase functions:secrets:set SHORTCUT_TOKEN` ve `firebase deploy --only functions` yapın. Her soru işlem geçmişine yazılır.
Kestirmeye "Enorpa'ya sor" adını verirseniz "Hey Siri, Enorpa'ya sor" ile çalışır.
Android'de aynısı HTTP Shortcuts veya Tasker ile yapılır. Anahtar, tüm servis kayıtlarını okuyabilir; paylaşmayın.

## Firestore kuralları ve indeksler

`firestore.rules` rolleri ve yazılan verinin alanlarını/boyutlarını denetler; `tests/rules` altında emülatör testleri
vardır (`npm run test:rules`, CI'da da çalışır). Yayın:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

İndeksler (şehir/e-posta aramasında tarihe göre sıralama) yayınlanmadan da uygulama çalışır, yalnızca o aramalar sırasız gelir.
İlk yöneticiyi Firebase konsolundan elle ekleyin: `kullanicilar/<e-posta küçük harf>` → `{ rol: "yonetici", aktif: true }`.

**2.1 sürümüne geçerken bir kez:** yönetici olarak giriş yapıp ⋯ menüsü → **Eski kayıtları optimize et** çalıştırın.
Form numarası sayaçlarını (`sayaclar`, `firmaKodlari`) kurar ve eski imzaları form belgesinden ayırır. Önce ne değişeceğini
gösterir; onaylamadan önce yedek alın.

## Yedekleme

Uygulamadaki **Tam yedek (JSON)** elle alınan bir kopyadır. Düzenli ve geri yüklenebilir yedek için Firebase konsolunda
**Firestore → Disaster recovery** altından zamanlanmış yedek (günlük/haftalık) ve isteğe bağlı Point-in-time recovery açın
ya da:

```bash
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14d
```

## Kişisel veriler (KVKK)

Uygulama müşteri yetkilisi adı, telefonu, adresi, imzası ve kayıt anındaki GPS konumunu saklar. Çalışanlara ve müşterilere
aydınlatma metni verin, saklama süresini belirleyin. Personel adları kaynak koda yazılmaz; uygulamadaki Personel listesi
ekranından yönetilir.

## Yayınlama

`npm run build` → `dist/`. GitHub Pages için `.github/workflows/yayin.yml` hazırdır (main'e her gönderimde lint, test ve
derleme sonrası yayınlar; Settings → Pages → Source: GitHub Actions). PR'larda `ci.yml` lint, birim, kural, duman ve
Cloud Functions kontrollerini çalıştırır. Firebase Hosting kullanırsanız `firebase deploy --only hosting`.
Service worker sürümü her derlemede otomatik üretilir; kullanıcılar "Yeni sürüm hazır" bildirimini görür.

## Bilinen noktalar

- Fotoğraflar hâlâ Firestore'da (`formFotograflari`, base64) durur. Kayıt sayısı çok artarsa Firebase Storage'a taşımak
  maliyeti düşürür.
- Çevrimdışı verilen form numarası (`numaraCevrimdisi: true`) bağlantı gelince sayaca işlenir. Yine de aynı anda başka
  cihazdan çevrimiçi kayıt girildiyse nadiren çakışabilir.
