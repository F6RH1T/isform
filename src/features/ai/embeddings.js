import { AiHata, aiAnahtarHazirla, aiHataYap } from "./gemini.js";
import { aiFetch } from "./transport.js";
import { VEKTOR_BOYUT, VEKTOR_SURUM, vNorm, vektorMetni, vektorPaketle } from "../../lib/vektor.js";

/* ===== ANLAMSAL ARAMA: embedding (kayıt anında üretilir, formlar belgesinde "vektor" olarak 256 baytlık base64 tutulur) ===== */
export const AI_EMBED = "gemini-embedding-001";

export async function embedYap(metinler, tip = "RETRIEVAL_DOCUMENT", sessiz = false) {
  if (!navigator.onLine) throw new AiHata("İnternet bağlantısı yok");
  const k = await aiAnahtarHazirla(false, sessiz); if (!k) throw new AiHata("API anahtarı girilmedi");
  const mdl = "models/" + AI_EMBED, cikti = [];
  for (let i = 0; i < metinler.length; i += 50) {
    const r = await aiFetch(`${mdl}:batchEmbedContents`, {
      method: "POST", anahtar: k,
      body: JSON.stringify({ requests: metinler.slice(i, i + 50).map(t => ({ model: mdl, content: { parts: [{ text: t }] }, taskType: tip, outputDimensionality: VEKTOR_BOYUT })) })
    });
    if (!r.ok) throw await aiHataYap(r, "Embedding");
    ((await r.json()).embeddings || []).forEach(e => cikti.push(vNorm(e.values || [])));
  }
  return cikti;
}

/* Kayıt/düzenleme sırasında çağrılır: anahtar yoksa, çevrimdışıysa veya 2 sn'de dönmezse {} verir; kayıt yine yapılır. */
export async function vektorHazirla(islemTipi, aciklama) {
  const t = String(aciklama || "").trim();
  if (t.length < 8 || !navigator.onLine) return {};
  try {
    const [v] = await Promise.race([embedYap([vektorMetni(islemTipi, t)], "RETRIEVAL_DOCUMENT", true), new Promise((_, rej) => setTimeout(() => rej(new Error("zaman aşımı")), 2000))]);
    return v && v.length === VEKTOR_BOYUT ? { vektor: vektorPaketle(v), vektorSurum: VEKTOR_SURUM } : {};
  } catch (e) { console.warn("Vektör üretilemedi:", e.message); return {}; }
}
