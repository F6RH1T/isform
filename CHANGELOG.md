# Değişiklik günlüğü

## 2.0.0
- Tek dosyalık `index.html` (3.098 satır) Vite + ES modüllerine bölündü; davranış değişmedi (orijinalle karşılaştırmalı doğrulandı).
- Modüller arası paylaşılan değişkenler `core/state.js` altında toplandı.
- Firebase SDK CDN yerine npm paketinden (10.8.1, sürüm sabit) yükleniyor; ayarlar `src/firebase/config.js`.
- Gemini istekleri `features/ai/transport.js` üzerinden; `VITE_AI_PROXY_URL` verilirse Cloud Function (`functions/`) kullanılır.
- Eklendi: birim testleri, tarayıcı duman testi, ESLint/Prettier, CI, `firestore.rules` taslağı, `asistan` (Siri/otomasyon) uç noktası.
