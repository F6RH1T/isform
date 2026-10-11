/* Firebase web ayarları. Bu değerler gizli değildir (tarayıcıya zaten iner); güvenlik Firestore kuralları
   ve App Check ile sağlanır. Başka bir projeye geçmek için .env dosyasında VITE_* değişkenlerini verin. */
const env = import.meta.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyC2OWlHtSGY-2Xk6CKDfekCaDXD8k-erDs",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "isform-b284d.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "isform-b284d",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "isform-b284d.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "601360853063",
  appId: env.VITE_FIREBASE_APP_ID || "1:601360853063:web:ec6fa97a46f3d00cfaa962"
};

export const recaptchaSiteKey = env.VITE_RECAPTCHA_SITE_KEY || "6Ldxg-YtAAAAAFLJEzwdIIBCw_i3-Tb5Pcvaqg5N";
