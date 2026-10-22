import { initializeApp } from "firebase/app";
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from "firebase/app-check";
import { collection, doc, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseConfig, recaptchaSiteKey } from "./config.js";

const app = initializeApp(firebaseConfig);

/* App Check: istekler sadece bu siteden gelen gerçek tarayıcılardan kabul edilsin.
   Başlatılamazsa uygulama yine çalışır (sadece koruma devre dışı kalır). */
try {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true
  });
} catch (e) { console.warn("App Check başlatılamadı:", e); }

export let db;

try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { console.warn("Çevrimdışı önbellek açılamadı:", e); db = getFirestore(app); }

/* Çevrimdışıyken yazma sunucu onayını beklemez; bağlantı gelince Firestore kendisi gönderir.
   Çevrimiçiyken onayı bekler (hata varsa kullanıcı görsün). */
export const kuyrugaAl = p => { if (navigator.onLine) return p; p.catch(console.error); return Promise.resolve(); };

/* Yeni belge: kimlik yerelde üretilir, böylece çevrimdışıyken de gerçek kimlik döner (başka belgeden ona bağlanılabilir). */
export async function belgeEkle(koleksiyon, veri) {
  const ref = doc(collection(db, koleksiyon));
  await kuyrugaAl(setDoc(ref, veri));
  return ref;
}

export const auth = getAuth(app);
