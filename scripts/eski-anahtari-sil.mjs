/* AI proxy devreye girdikten sonra tarayıcı-anahtarı modunun kalıntısını siler: ayarlar/gemini belgesi.
   GitHub Actions'taki "Firebase kurulum" iş akışı çalıştırır (GOOGLE_APPLICATION_CREDENTIALS ile). */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault(), projectId: process.env.PROJE || "isform-b284d" });
const ref = getFirestore().doc("ayarlar/gemini");
const s = await ref.get();
if (!s.exists) console.log("ayarlar/gemini zaten yok.");
else { await ref.delete(); console.log("ayarlar/gemini silindi. Eski anahtarı Google AI Studio'da da iptal edin."); }
