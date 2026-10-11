/* ENORPA — Cloud Functions
   1) aiProxy : tarayıcıdan gelen Gemini isteklerini, API anahtarını sunucuda tutarak Google'a iletir.
   2) asistan : Siri Kestirmeleri / Android otomasyonları için tek uçlu soru-cevap (sesle sor, sesle dinle).

   Kurulum: README.md → "AI proxy ve Siri/Gemini uç noktası" bölümü. */
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";

initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const SHORTCUT_TOKEN = defineSecret("SHORTCUT_TOKEN");
const IZINLI_ORIGINLER = defineString("IZINLI_ORIGINLER", { default: "", description: "Virgülle ayrılmış site adresleri, örn. https://kullanici.github.io" });

const REGION = "europe-west1";
const GEMINI = "https://generativelanguage.googleapis.com/v1beta/";
const MODELLER = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite", "gemini-3.5-flash"];
const ROLLER = ["yonetici", "duzenleyen", "goruntuleyen"];

/* Yalnızca uygulamanın kullandığı Gemini yöntemlerine izin verilir */
const YOL_IZIN = /^models(\?pageSize=\d{1,3})?$|^models\/[A-Za-z0-9.\-]+:(generateContent|streamGenerateContent|batchEmbedContents|embedContent)(\?alt=sse)?$/;

class HttpHata extends Error { constructor(kod, mesaj) { super(mesaj); this.kod = kod; } }

function cors(req, res) {
  const origin = req.get("origin") || "";
  const izinli = IZINLI_ORIGINLER.value().split(",").map(s => s.trim()).filter(Boolean);
  if (origin && izinli.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Max-Age", "3600");
  }
}

/* Basit hız sınırı (örnek başına, kullanıcı başına dakikada 60 istek). Çok örnekli ölçekte kesin değildir; yine de kontrolsüz tüketimi keser. */
const kovalar = new Map();
function hizSiniri(anahtar, limit = 60) {
  const dk = Math.floor(Date.now() / 60000), k = kovalar.get(anahtar);
  if (!k || k.dk !== dk) { kovalar.set(anahtar, { dk, n: 1 }); if (kovalar.size > 5000) kovalar.clear(); return; }
  if (++k.n > limit) throw new HttpHata(429, "Çok fazla istek, biraz bekleyin");
}

async function kullaniciDogrula(req) {
  const m = /^Bearer (.+)$/.exec(req.get("authorization") || "");
  if (!m) throw new HttpHata(401, "Kimlik bilgisi yok");
  let jeton;
  try { jeton = await getAuth().verifyIdToken(m[1]); } catch { throw new HttpHata(401, "Geçersiz oturum"); }
  const mail = String(jeton.email || "").toLowerCase();
  if (!mail) throw new HttpHata(403, "E-posta doğrulanamadı");
  const d = await getFirestore().doc(`kullanicilar/${mail}`).get();
  if (!d.exists || d.data().aktif !== true || !ROLLER.includes(d.data().rol)) throw new HttpHata(403, "Yetkilendirilmemiş hesap");
  return { mail, rol: d.data().rol };
}

function hataYaz(res, e) {
  const kod = e instanceof HttpHata ? e.kod : 500;
  if (kod === 500) console.error(e);
  res.status(kod).json({ error: { message: kod === 500 ? "Sunucu hatası" : e.message } });
}

/* ---------- 1) AI proxy ---------- */
export const aiProxy = onRequest({ region: REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: "256MiB", cors: false, maxInstances: 5 }, async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    if (req.method !== "GET" && req.method !== "POST") throw new HttpHata(405, "Yöntem desteklenmiyor");
    const yol = req.url.replace(/^\/+/, "");
    if (!YOL_IZIN.test(yol)) throw new HttpHata(404, "Bu yola izin verilmiyor");
    const kul = await kullaniciDogrula(req);
    hizSiniri(kul.mail);
    const r = await fetch(GEMINI + yol, {
      method: req.method,
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY.value() },
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined
    });
    res.status(r.status);
    res.set("Content-Type", r.headers.get("content-type") || "application/json");
    if (!r.body) return res.end();
    Readable.fromWeb(r.body).pipe(res);   // akışlı (SSE) yanıtlar da aynen geçer
  } catch (e) { hataYaz(res, e); }
});

/* ---------- 2) Siri / Gemini / otomasyon uç noktası ---------- */
const guvenliKarsilastir = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

const SISTEM = "Sen bir teknik servis firmasının sesli yardımcısısın. Türkçe, kısa ve konuşma diliyle cevap ver; madde işareti, yıldız veya başlık kullanma. Yalnızca verilen servis kayıtlarına dayan, kayıtta olmayan bilgiyi asla uydurma; bilmiyorsan 'Kayıtlarda bulamadım' de.";

async function geminiSor(istem) {
  let son;
  for (const md of MODELLER) {
    const r = await fetch(`${GEMINI}models/${md}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY.value() },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SISTEM }] }, contents: [{ role: "user", parts: [{ text: istem }] }], generationConfig: { temperature: 0.2 } })
    });
    if (r.ok) {
      const j = await r.json();
      const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
      if (t) return t;
      son = new HttpHata(502, "Boş yanıt geldi");
    } else if (r.status === 404 || r.status === 429) { son = new HttpHata(r.status === 429 ? 429 : 502, "Model şu an kullanılamıyor"); }
    else throw new HttpHata(502, `Gemini hatası ${r.status}`);
  }
  throw son || new HttpHata(502, "Yanıt alınamadı");
}

export const asistan = onRequest({ region: REGION, secrets: [GEMINI_API_KEY, SHORTCUT_TOKEN], timeoutSeconds: 60, memory: "512MiB", cors: false, maxInstances: 3 }, async (req, res) => {
  try {
    if (req.method !== "POST") throw new HttpHata(405, "POST kullanın");
    const gelen = req.get("x-asistan-anahtari") || "";
    if (!guvenliKarsilastir(gelen, SHORTCUT_TOKEN.value())) throw new HttpHata(401, "Yetkisiz");
    hizSiniri("asistan", 30);
    const soru = String((req.body && req.body.soru) || req.query.soru || "").trim().slice(0, 500);
    if (!soru) throw new HttpHata(400, "Soru boş");

    /* v1: son 200 kayıt bağlam olarak verilir. Daha eski kayıtlar için uygulamadaki asistanın planlayıcısı buraya taşınabilir. */
    const snap = await getFirestore().collection("formlar").orderBy("tarih", "desc").limit(200).get();
    const satirlar = snap.docs.map(d => {
      const x = d.data();
      return [String(x.tarih || "").slice(0, 10), x.firmaAdi || "", x.sehir || "", x.islemTipi || "", String(x.aciklama || "").replace(/\s+/g, " ").slice(0, 160)].join(" | ");
    });
    const bugun = new Date().toISOString().slice(0, 10);
    const cevap = await geminiSor(`Bugün: ${bugun}\nServis kayıtları (tarih | firma | şehir | işlem | açıklama), yeniden eskiye:\n${satirlar.join("\n")}\n\nSoru: ${soru}`);

    if (req.query.format === "text") return res.type("text/plain; charset=utf-8").send(cevap);
    res.json({ cevap });
  } catch (e) { hataYaz(res, e); }
});
