# Mimari

## Yükleme sırası
`src/main.js` modülleri bilinçli bir sırayla içe aktarır. Bazı modüller açılışta DOM'u kurar veya `window` üzerine
işlev koyar; sonrakiler buna güvenir. Örnekler: `form-ui` form alanlarını üretir, `foto-modal` `window.resmiAc`'ı koyar,
`ai/ek-ozellikler` onu sarmalar. **Sırayı değiştirmeyin**; yeni modülü ilgili grubun sonuna ekleyin.
Sıra: state → firebase → lib → ui → core/session → ai çekirdeği → rapor verisi → özellik modülleri (eski sayfadaki sıra) → ai/ek-ozellikler.

## Paylaşılan durum
Başka modülden atama gereken değişkenler `core/state.js` içindeki `state` nesnesindedir
(`aktifRol`, `rolHazir`, `aktifKullaniciMail`, `guncellenecekDocId`, `guncellenecekEskiAramaFirma`, `tumFormlarGlobal`, `raporSehirVeri`).

## Genel (window) işlevler
Eski satır içi `onclick="…"` işleyicileri ve modüller arası gevşek bağ için bazı işlevler `window` üzerindedir:
`showToast, sekmeyiDegistir, ekleModu, resmiAc, modaliKapat, formDuzenle, formSil, yaklasanAc, firmaKartiAc, pdfPaylasKartiAc, aramaOnbellek …`.
ESLint yapılandırması bunları global olarak tanır. Uzun vadede `onclick` yerine `addEventListener` kullanılması önerilir.

## Veri modeli (Firestore)
| Koleksiyon | İçerik | Okuma | Yazma |
|---|---|---|---|
| `kullanicilar/{e-posta}` | rol, aktif | kendi kaydı / yönetici | yönetici |
| `formlar` | servis kayıtları | tüm aktif roller | ekleme: düzenleyen+, düzenleme/silme: yönetici |
| `formFotograflari` | base64 fotoğraf | tüm aktif roller | ekleme: düzenleyen+, silme: yönetici |
| `firmalar` | firma kartı | tüm aktif roller | düzenleyen+ |
| `islemGecmisi` | denetim kaydı | yönetici | herkes ekler, kimse değiştirmez |
| `ayarlar/gemini` | eski anahtar modu | aktif | yönetici |

## AI
`ai/gemini.js` (model seçimi, yedekleme, akış) → `ai/transport.js` (proxy veya doğrudan) → Gemini.
`ai/prompts.js` tüm istem ve şemaları tutar; `lib/vektor.js` anlamsal arama vektörlerini paketler.
