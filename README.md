# ENORPA İş Formları

Servis formu oluşturma, firma kartları, bakım takibi, raporlar/harita ve Gemini destekli asistan içeren PWA.
Ön yüz: düz JavaScript (ES modülleri) + Vite. Arka uç: Firebase (Auth, Firestore, App Check, Cloud Functions).

## Hızlı başlangıç

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # lint + birim testleri + üretim derlemesi
npm run test:smoke   # tarayıcı duman testi (ilk kez: npx playwright install chromium)
```

Node 20 veya üstü gerekir. Ayarlar için `.env.example` dosyasına bakın; boş bırakırsanız
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
tests/         unit (node:test) ve smoke (Playwright, sahte Firebase)
```

## AI proxy ve Siri/Gemini uç noktası

Varsayılanda Gemini anahtarı Firestore'da (`ayarlar/gemini`) durur ve tarayıcıya iner. Bunu kapatmak için:

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set SHORTCUT_TOKEN        # Siri kestirmesi için uzun rastgele bir metin
firebase deploy --only functions
```

1. Deploy çıktısındaki `aiProxy` adresini `.env` içine `VITE_AI_PROXY_URL=` olarak yazın ve siteyi yeniden derleyin.
2. `IZINLI_ORIGINLER` parametresine sitenizin adresini verin (CORS).
3. Çalıştığını doğrulayınca Firestore'daki `ayarlar/gemini` belgesini silin ve kuralında `allow read: if false` yapın.

**Siri (iPhone):** Kestirmeler → "Metin Dikte Et" → "URL İçeriğini Al" (yöntem POST, adres `…/asistan?format=text`,
başlık `x-asistan-anahtari: <SHORTCUT_TOKEN>`, gövde JSON `{"soru": <dikte edilen>}`) → "Metni Söyle".
Kestirmeye "Enorpa'ya sor" adını verirseniz "Hey Siri, Enorpa'ya sor" ile çalışır.
Android'de aynısı HTTP Shortcuts veya Tasker ile yapılır. Anahtar, tüm servis kayıtlarını okuyabilir; paylaşmayın.

## Firestore kuralları

`firestore.rules` bir **taslaktır**. Yayınlamadan önce emülatörde deneyin:

```bash
firebase emulators:start --only firestore
```

İlk yöneticiyi Firebase konsolundan elle ekleyin: `kullanicilar/<e-posta küçük harf>` → `{ rol: "yonetici", aktif: true }`.
Yayın: `firebase deploy --only firestore:rules`.

## Yayınlama

`npm run build` → `dist/`. GitHub Pages için `.github/workflows/deploy-pages.yml` hazırdır
(Settings → Pages → Source: GitHub Actions). Firebase Hosting kullanırsanız `firebase deploy --only hosting`.
`sw.js` her derlemede `dist` köküne kopyalanır; önbellek sürümünü değiştirdiğinizde `public/sw.js` içindeki `SURUM` değerini artırın.

## Bilinen noktalar

- `ayEkle` (src/lib/dates.js): 31 Ocak + 1 ay → 3 Mart (ay taşması). Testte sabitlenmiştir.
- `jsGuvenliMetin` (src/lib/text.js): kaçış iki katmanlı uygulanır. Testte sabitlenmiştir.
