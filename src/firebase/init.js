import { initializeApp } from "firebase/app";
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from "firebase/app-check";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
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

/* Çevrimdışıyken yazma sunucu onayını beklemez; bağlantı gelince Firestore kendisi gönderir */
export const kuyrugaAl = p => { if (navigator.onLine) return p; p.catch(console.error); return Promise.resolve({ id: "offline-" + Date.now() + Math.random().toString(36).slice(2, 7) }); };

export const auth = getAuth(app);
