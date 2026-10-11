import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/init.js";
import { logYaz } from "../../core/session.js";
import { aiFetch, proxyAktif } from "./transport.js";

/* ===== GEMINI YAPAY ZEKÂ ===== */
const AI_ANAHTAR_SABIT = ""; // İsterseniz anahtarı buraya yazabilirsiniz (önerilmez; yazarsanız Google'da siteye göre kısıtlayın)

let aiModel = localStorage.getItem("gemini_model2") || "gemini-3.1-flash-lite";

const AI_YEDEK = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];

const aiAnahtar = () => {
  if (AI_ANAHTAR_SABIT) return AI_ANAHTAR_SABIT;
  return localStorage.getItem("gemini_key");
};

let aiBulutAtla = false;   // kayıtlı anahtar geçersiz çıktıysa buluttan tekrar çekme, yeni anahtar sor

export async function aiAnahtarHazirla(zorla = false, sessiz = false) {
  if (proxyAktif()) return "proxy";   // anahtar sunucuda; tarayıcıda tutulmaz
  if (AI_ANAHTAR_SABIT) return AI_ANAHTAR_SABIT;
  let k = zorla ? "" : localStorage.getItem("gemini_key");
  if (!k && !zorla && !aiBulutAtla) {   // başka cihazda girilmiş anahtarı Firestore'dan al
    try { const d = await getDoc(doc(db, "ayarlar", "gemini")); k = (d.exists() && d.data().anahtar || "").trim(); if (k) localStorage.setItem("gemini_key", k); }
    catch (e) { console.warn("Bulut anahtarı okunamadı:", e); }
  }
  if (!k && !sessiz) {
    k = (prompt("Gemini API anahtarını girin (bir kez girmeniz yeterli, tüm cihazlarda kullanılır):") || "").trim();
    if (k) {
      localStorage.setItem("gemini_key", k); aiBulutAtla = false;
      try { await setDoc(doc(db, "ayarlar", "gemini"), { anahtar: k, guncelleyen: auth.currentUser?.email || "" }); logYaz("Gemini anahtarı kaydedildi"); }
      catch (e) { console.warn("Anahtar buluta kaydedilemedi:", e); showToast("Anahtar yalnızca bu cihaza kaydedildi (buluta sadece yönetici kaydedebilir)", "info"); }
    }
  }
  return k;
}

async function aiModelBul(k) {
  const r = await aiFetch("models?pageSize=200", { anahtar: k });
  if (!r.ok) throw new Error("Model listesi alınamadı (" + r.status + ")");
  const sur = m => parseFloat(m.name.match(/gemini-([\d.]+)-flash/)[1]);
  const l = ((await r.json()).models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && /^models\/gemini-[\d.]+-flash$/.test(m.name)).sort((a, b) => sur(b) - sur(a));
  if (!l.length) throw new Error("Bu anahtarla kullanılabilir Gemini Flash modeli bulunamadı");
  aiModel = l[0].name.replace("models/", ""); localStorage.setItem("gemini_model2", aiModel);
}

export class AiHata extends Error { constructor(m, bekle = 0) { super(m); this.name = "AiHata"; this.bekle = bekle; } }

export async function aiHataYap(r, ad = "Gemini") {
  let j = null; try { j = await r.json(); } catch (e) { }
  const mesaj = j?.error?.message || "";
  let bekle = 0;
  if (r.status === 429) {
    const ri = (j?.error?.details || []).find(d => /RetryInfo/.test(d["@type"] || ""));
    bekle = parseFloat(ri?.retryDelay) || parseFloat((mesaj.match(/retry in ([\d.]+)s/i) || [])[1]) || 60;
  }
  const e = new AiHata(r.status === 429
    ? `Ücretsiz kota doldu (dakikalık veya günlük). ${bekle <= 180 ? "Kısa süre sonra" : "Birkaç dakika sonra"} tekrar deneyin; sürerse AI Studio > Rate limit sayfasına bakın`
    : `${ad} hatası ${r.status}: ${mesaj.slice(0, 160)}`, bekle);
  e.durum = r.status; e.ayrinti = mesaj; return e;
}

const aiModelSirasi = () => [aiModel, ...AI_YEDEK.filter(x => x !== aiModel)];

export async function gemini(parts, { json = false, sistem = "", sema = null } = {}) {
  if (!navigator.onLine) throw new AiHata("İnternet bağlantısı yok");
  const k = await aiAnahtarHazirla(); if (!k) throw new AiHata("API anahtarı girilmedi");
  let semaVar = !!(json && sema);
  const govde = () => {
    const b = { contents: [{ role: "user", parts }], generationConfig: { temperature: 0.3, ...(json ? { responseMimeType: "application/json", ...(semaVar ? { responseSchema: sema } : {}) } : {}) } };
    if (sistem) b.systemInstruction = { parts: [{ text: sistem }] };
    return JSON.stringify(b);
  };
  const ist = md => aiFetch(`models/${md}:generateContent`, { method: "POST", body: govde(), anahtar: k });
  let r;
  for (const md of aiModelSirasi()) {   // kota dolarsa / model kapanırsa sıradaki modele geç
    r = await ist(md);
    if (r.status === 400 && semaVar) { semaVar = false; r = await ist(md); }   // şema reddedilirse şemasız (eski davranış) dene
    if (r.ok) { if (md !== aiModel) { aiModel = md; localStorage.setItem("gemini_model2", md); } break; }
    if (r.status !== 429 && r.status !== 404) break;
  }
  if (r.status === 404) { await aiModelBul(k); r = await ist(aiModel); }
  if (!r.ok) {
    const e = await aiHataYap(r);
    if (!AI_ANAHTAR_SABIT && (r.status === 400 || r.status === 403) && /API key|permission|referer/i.test(e.ayrinti || "")) { localStorage.removeItem("gemini_key"); aiBulutAtla = true; }
    throw e;
  }
  const j = await r.json();
  const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
  if (!t) throw new AiHata("Boş yanıt geldi");
  return json ? JSON.parse(t.replace(/^```json|```$/g, "").trim()) : t;
}

/* Akışlı yanıt (SSE): metin geldikçe onMetin(tamMetin) çağrılır. Akış kurulamazsa normal gemini()'ye düşer. */
export async function geminiAkis(parts, { sistem = "", onMetin } = {}) {
  if (!navigator.onLine) throw new AiHata("İnternet bağlantısı yok");
  const k = await aiAnahtarHazirla(); if (!k) throw new AiHata("API anahtarı girilmedi");
  const b = { contents: [{ role: "user", parts }], generationConfig: { temperature: 0.3 } };
  if (sistem) b.systemInstruction = { parts: [{ text: sistem }] };
  let r;
  for (const md of aiModelSirasi()) {
    r = await aiFetch(`models/${md}:streamGenerateContent?alt=sse`, { method: "POST", body: JSON.stringify(b), anahtar: k });
    if (r.ok) { if (md !== aiModel) { aiModel = md; localStorage.setItem("gemini_model2", md); } break; }
    if (r.status !== 429 && r.status !== 404) break;
  }
  if (!r.ok || !r.body) return gemini(parts, { sistem });   // hata mesajlarını / model keşfini normal yol üretir
  const okuyucu = r.body.getReader(), cozucu = new TextDecoder(); let tampon = "", tam = "";
  for (; ;) {
    const { done, value } = await okuyucu.read(); if (done) break;
    tampon += cozucu.decode(value, { stream: true });
    const satirlar = tampon.split(/\r?\n/); tampon = satirlar.pop();
    for (const sa of satirlar) {
      if (!sa.startsWith("data:")) continue;
      const d = sa.slice(5).trim(); if (!d || d === "[DONE]") continue;
      try {
        const t = (JSON.parse(d).candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
        if (t) { tam += t; if (onMetin) onMetin(tam); }
      } catch (e) { }
    }
  }
  if (!tam.trim()) throw new AiHata("Boş yanıt geldi");
  return tam.trim();
}
