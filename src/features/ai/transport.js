import { auth } from "../../firebase/init.js";

/* Gemini isteklerinin tek çıkış noktası.
   - VITE_AI_PROXY_URL tanımlıysa istekler Cloud Function (functions/) üzerinden gider: API anahtarı yalnızca
     sunucuda durur, tarayıcıya hiç inmez. Kullanıcı kimliği Firebase ID token'ı ile doğrulanır.
   - Tanımlı değilse eski davranış sürer: anahtar tarayıcıdan doğrudan Google'a gönderilir. */
const PROXY = String((import.meta.env && import.meta.env.VITE_AI_PROXY_URL) || "").replace(/\/+$/, "");
const DOGRUDAN = "https://generativelanguage.googleapis.com/v1beta/";

export const proxyAktif = () => !!PROXY;

/* yol: "models/gemini-x:generateContent" gibi, v1beta/ sonrası kısım */
export async function aiFetch(yol, { method = "GET", body, anahtar } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (PROXY) {
    const kullanici = auth.currentUser;
    if (!kullanici) throw new Error("AI için önce giriş yapın");
    headers.Authorization = "Bearer " + await kullanici.getIdToken();
    return fetch(`${PROXY}/${yol}`, { method, headers, body });
  }
  headers["x-goog-api-key"] = anahtar;
  return fetch(DOGRUDAN + yol, { method, headers, body });
}
