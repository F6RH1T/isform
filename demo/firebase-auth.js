/* DEMO: sahte oturum. Herhangi bir e-posta/şifre ile giriş yapılır (yönetici rolüyle). Oturum sekme açık kaldıkça sürer. */
import { DEMO_KULLANICI } from "./ornek-veri.js";

const auth = { currentUser: null };
const izleyenler = new Set();
const bildir = () => izleyenler.forEach(cb => cb(auth.currentUser));
const kullanici = mail => ({ email: mail, uid: "demo-" + mail, getIdToken: async () => "demo-token" });
try { const m = sessionStorage.getItem("demo_oturum"); if (m) auth.currentUser = kullanici(m); } catch { /* yok */ }

export const getAuth = () => auth;
export const onAuthStateChanged = (_a, cb) => { izleyenler.add(cb); setTimeout(() => cb(auth.currentUser), 0); return () => izleyenler.delete(cb); };
export async function signInWithEmailAndPassword() {
  await new Promise(r => setTimeout(r, 300));
  auth.currentUser = kullanici(DEMO_KULLANICI);   // rolü olan tek demo hesabı; yazılan e-posta önemsizdir
  try { sessionStorage.setItem("demo_oturum", DEMO_KULLANICI); } catch { /* yok */ }
  bildir(); return { user: auth.currentUser };
}
export async function signOut() { auth.currentUser = null; try { sessionStorage.removeItem("demo_oturum"); } catch { /* yok */ } bildir(); }
export async function sendPasswordResetEmail() { await new Promise(r => setTimeout(r, 300)); }
