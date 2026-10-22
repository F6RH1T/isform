import { ikon } from "../../lib/ikon.js";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { $ } from "../../lib/dom.js";
import { aiButon, aiKutu, bugun, olay } from "./ui.js";
import { aiAnahtarHazirla, gemini, geminiAkis } from "./gemini.js";
import { proxyAktif } from "./transport.js";
import { AI_PROMPT, AI_SEMA } from "./prompts.js";
import { raporKayitYama, raporKayitYenile, raporVerisi } from "../reports/rapor-veri.js";
import { metniNormalizeEt } from "../../lib/text.js";
import { tarihiInputaCevir } from "../../lib/dates.js";
import { levenshtein } from "../../lib/levenshtein.js";
import { embedYap, vektorHazirla } from "./embeddings.js";
import { VEKTOR_SURUM, kosinus, vektorAc, vektorMetni, vektorPaketle } from "../../lib/vektor.js";
import { db } from "../../firebase/init.js";
import { sehirAdi } from "../reports/harita.js";
import { aramaKutusu } from "../search/search.js";
import { logYaz, yoneticiMi } from "../../core/session.js";

/* 1) Not alanları (İş formu tara + İş formu oluştur): yalnızca "Notu düzelt" ve "Notu kontrol et" */
for (const id of ["aciklamaNotu", "ofAciklama"]) {
  const ta = $(id); if (!ta) continue;
  const alan = ta.closest(".form-floating") || ta, sub = ta.closest("form")?.querySelector('button[type="submit"]');
  const kutu = sub ? aiKutu(sub, "beforebegin") : null;
  const notVar = () => { if (!ta.value.trim()) throw new Error("Önce bir not yazın"); };
  if (kutu) aiButon(alan, "afterend", "✨ Notu kontrol et", async () => {
    notVar(); kutuYaz(kutu, await gemini([{ text: AI_PROMPT.notKontrol($("islemTipi")?.value, ta.value) }], { sistem: AI_PROMPT.sistem }));
  });
  aiButon(alan, "afterend", "✨ Notu düzelt", async () => {
    notVar(); ta.value = await gemini([{ text: AI_PROMPT.notDuzelt(ta.value) }], { sistem: AI_PROMPT.sistem });
    olay(ta, "input"); showToast("Not düzeltildi", "success");
  });
}

/* 5) Firma özeti + müşteri mesajı */
{
  const zaman = $("fkZaman"), kutu = aiKutu(zaman, "beforebegin");
  const son = () => (window._fkSon || []).sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "")).slice(0, 25).map(v => ({ tarih: (v.tarih || "").slice(0, 10), islem: v.islemTipi, not: (v.aciklama || "").slice(0, 300), sonrakiBakim: (v.sonrakiBakim || "").slice(0, 10) }));
  const satir = document.createElement("div"); satir.style.cssText = "padding:0 18px"; zaman.insertAdjacentElement("beforebegin", satir);
  aiButon(satir, "beforeend", "✨ Firma özeti", async () => {
    const L = son(); if (!L.length) throw new Error("Bu firmada kayıt yok");
    kutu.style.display = "block"; kutu.textContent = await gemini([{ text: AI_PROMPT.firmaOzet($("fkBaslik").textContent, L) }], { sistem: AI_PROMPT.sistem });
  }, "margin-right:8px;");
  aiButon(satir, "beforeend", "✨ Müşteriye mesaj", async () => {
    const L = son(); const m = await gemini([{ text: AI_PROMPT.musteriMesaj($("fkYetkili").value, $("fkBaslik").textContent, L) }], { sistem: AI_PROMPT.sistem });
    kutu.style.display = "block"; kutu.textContent = m;
    const w = document.createElement("a"); w.textContent = "\n\n📲 WhatsApp'ta aç"; w.style.cssText = "display:inline-block;color:var(--primary);font-weight:700;margin-top:8px";
    w.href = $("fkWa").href.startsWith("http") ? $("fkWa").href + "?text=" + encodeURIComponent(m) : "#"; w.target = "_blank"; w.rel = "noopener"; kutu.appendChild(w);
  });
}

/* 6) Rapor yorumu + anahtar sıfırlama */
{
  const yenile = $("btnRaporYenile"), kutu = aiKutu(yenile, "afterend");
  aiButon(yenile, "afterend", "✨ Raporu yorumla", async () => {
    const snap = await raporVerisi(), say = (k) => { const o = {}; snap.forEach(d => { const v = d.data(), a = k(v); if (a) o[a] = (o[a] || 0) + 1; }); return o; };
    const veri = { toplam: snap.size, sehir: say(v => v.sehir), islem: say(v => v.islemTipi), personel: say(v => v.ekleyen), aylik: say(v => (v.tarih || "").slice(0, 7)) };
    kutu.style.display = "block"; kutu.textContent = await gemini([{ text: AI_PROMPT.raporYorum(veri) }], { sistem: AI_PROMPT.sistem });
  });
  if (!proxyAktif()) aiButon(yenile, "afterend", "🔑 Gemini anahtarını değiştir", async () => { localStorage.removeItem("gemini_key"); await aiAnahtarHazirla(true); }, "background:var(--border);color:var(--text-main);border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;text-shadow:none;font-size:.8rem;");
}

/* ===== AI EK ÖZELLİKLER ===== */
const kutuYaz = (k, m) => {
  k.style.display = "block"; k.textContent = m;
  const c = document.createElement("a"); c.textContent = "\n\n📋 Kopyala"; c.href = "#"; c.style.cssText = "display:inline-block;color:var(--primary);font-weight:700;margin-top:8px";
  c.addEventListener("click", e => { e.preventDefault(); navigator.clipboard?.writeText(m); showToast("Kopyalandı", "success"); }); k.appendChild(c);
};

async function aiResim(f) {
  const bmp = await createImageBitmap(f).catch(() => { throw new Error("Bu fotoğraf biçimi okunamadı"); });
  const o = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.round(bmp.width * o); c.height = Math.round(bmp.height * o); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85).split(",")[1];
}

/* Asistan (Ara sekmesi): kayıtlarda arar, sayar, özetler, taslak yazar, uygulamayı anlatır */
{
  const k = document.createElement("div"); k.className = "card"; k.id = "asistanKart";
  k.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px"><div class="card-title as-baslik" style="margin:0">'+ikon("spark",22)+' Asistan</div><button type="button" id="asTemizle" class="btn-firma" style="margin:0;display:none">Sohbeti temizle</button></div>'
    + '<div id="asSohbet" style="display:none;max-height:420px;overflow:auto;flex-direction:column;gap:8px;margin-bottom:10px"></div>'
    + '<div id="asOneri" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"></div>'
    + '<div class="form-floating"><input type="text" id="aiSoru" placeholder=" " autocomplete="off"><label for="aiSoru">Sorun veya ne bulmak istediğinizi yazın</label></div>';
  $("sonuclar").insertAdjacentElement("beforebegin", k);
  const sohbetEl = $("asSohbet"), asGecmis = [], nrm = x => metniNormalizeEt(x || "");

  const asYaz = (el, m) => {
    el.classList.remove("yaziyor"); el.textContent = "";
    String(m).replace(/^\s*[*-] /gm, "• ").split(/\*\*(.+?)\*\*/g).forEach((p, i) => {
      if (i % 2) { const b = document.createElement("b"); b.textContent = p; el.appendChild(b); } else el.appendChild(document.createTextNode(p));
    });
  };
  const asBalon = (rol, metin) => {
    sohbetEl.style.display = "flex"; $("asTemizle").style.display = "inline-block";
    const b = document.createElement("div");
    b.style.cssText = "max-width:94%;padding:10px 13px;border-radius:16px;font-size:.9rem;line-height:1.5;white-space:pre-wrap;word-break:break-word;" + (rol === "k"
      ? "align-self:flex-end;background:var(--primary);color:#fff;border-bottom-right-radius:4px"
      : "align-self:flex-start;background:var(--surface-2);border:1px solid var(--border);border-bottom-left-radius:4px");
    asYaz(b, metin); sohbetEl.appendChild(b); sohbetEl.scrollTop = sohbetEl.scrollHeight; return b;
  };
  const konusma = () => asGecmis.slice(-8).map(x => (x.r === "k" ? "Kullanıcı: " : "Asistan: ") + x.t.slice(0, 400)).join("\n") || "-";

  async function asPlan(soru) {
    return gemini([{ text: AI_PROMPT.asPlan(konusma(), soru) }], { json: true, sema: AI_SEMA.plan });
  }
  /* "⚠ Benzer firma var, onu mu seçmek istedin?" — firma adı kayıtlarda yoksa yakın yazımlı firmaları önerir (ek okuma yapmaz, önbellekten çalışır) */
  function asBenzerFirma(snap, ad) {
    const na = nrm(ad); if (na.length < 3) return [];
    const firmalar = new Map();
    snap.forEach(d => { const x = d.data(), k = x.aramaFirma || nrm(x.firmaAdi), g = x.firmaAdi || x.aramaFirma; if (k && g && !firmalar.has(k)) firmalar.set(k, g); });
    if ([...firmalar.keys()].some(k => k.includes(na))) return [];   // asFiltrele ile aynı kural: zaten eşleşiyor
    const esik = Math.max(1, Math.floor(na.length / 6));
    return [...firmalar.entries()].map(([k, g]) => ({
      g, d: na.startsWith(k) ? 0 : (na.split(/\s+/)[0].length >= 4 && na.split(/\s+/)[0] === k.split(/\s+/)[0]) ? 1 : Math.min(levenshtein(k, na), levenshtein(k.slice(0, na.length), na), ...k.split(/\s+/).filter(t => t.length > 2).map(t => levenshtein(t, na)))
    })).filter(x => x.d <= esik).sort((a, b) => a.d - b.d).slice(0, 3);
  }
  function asBenzerKutu(bal, soru, p, adaylar) {
    const kutu = document.createElement("div");
    kutu.style.cssText = "margin-top:10px;padding:10px 12px;border-radius:var(--r-sm);background:var(--primary-soft);font-size:.82rem;line-height:1.5";
    kutu.append("⚠ Benzer firma var, onu mu seçmek istedin?", document.createElement("br"));
    adaylar.forEach(a => {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn-firma"; b.style.margin = "2px 4px 2px 0";
      b.textContent = a.g.toLocaleUpperCase("tr-TR") + " ✔ Seç";
      b.addEventListener("click", async () => {
        const dugmeler = kutu.querySelectorAll("button"); dugmeler.forEach(x => x.disabled = true);
        try { await sor(soru, a.g, p); kutu.remove(); } catch (e) { console.error(e); showToast("AI: " + e.message, "error"); dugmeler.forEach(x => x.disabled = false); }
      });
      kutu.appendChild(b);
    });
    bal.appendChild(kutu);
  }
  /* Anlamsal arama: diğer filtreler uygulanır, kalanlar sorgu vektörüne benzerliğe göre sıralanır */
  async function anlamsalSirala(snap, p) {
    const aday = asFiltrele(snap, { ...p, anahtar: [] }).filter(x => typeof x.v.vektor === "string" && x.v.vektorSurum === VEKTOR_SURUM);
    if (!aday.length) return [];
    const [q] = await embedYap([p.anlamsal], "RETRIEVAL_QUERY");
    const puan = aday.map(x => ({ x, s: kosinus(q, vektorAc(x.v.vektor)) })).sort((a, b) => b.s - a.s);
    const en = puan[0].s;
    return puan.filter(z => z.s >= Math.max(0.45, en - 0.12)).slice(0, 15).map(z => z.x);   // eşik değerleri gerçek veriyle ayarlanabilir
  }
  async function anlamsalIndeksle(btn) {
    const snap = await raporVerisi(), eksik = [];
    snap.forEach(d => { const v = d.data(); if ((typeof v.vektor !== "string" || v.vektorSurum !== VEKTOR_SURUM) && String(v.aciklama || "").trim().length >= 8) eksik.push({ id: d.id, v }); });
    if (!eksik.length) { showToast("Tüm kayıtlar zaten indekslenmiş", "success"); return; }
    if (!confirm(`${eksik.length} kayıt anlamsal aramaya hazırlanacak (kayıt başına 1 yazma). Devam edilsin mi?`)) return;
    for (let i = 0; i < eksik.length; i += 20) {
      const grup = eksik.slice(i, i + 20);
      btn.textContent = `🧠 İndeksleniyor ${Math.min(i + 20, eksik.length)}/${eksik.length}`;
      const vek = await embedYap(grup.map(x => vektorMetni(x.v.islemTipi, x.v.aciklama)));
      await Promise.all(grup.map((x, j) => {
        const yama = { vektor: vektorPaketle(vek[j]), vektorSurum: VEKTOR_SURUM };
        return updateDoc(doc(db, "formlar", x.id), yama).then(() => raporKayitYama(x.id, yama));
      }));
      await new Promise(r => setTimeout(r, 1200));   // dakikalık limitlere takılmamak için
    }
    showToast("İndeksleme tamamlandı", "success");
  }
  function asFiltrele(snap, p) {
    const kel = (p.anahtar || []).map(nrm).filter(Boolean), bg = bugun(), out = [];
    const lim = p.bakim === "yaklasan" ? tarihiInputaCevir(new Date(Date.now() + (Number(p.yaklasanGun) || 7) * 864e5)) : "";
    snap.forEach(d => {
      const v = d.data(), t = (v.tarih || "").slice(0, 10), sb = (v.sonrakiBakim || "").slice(0, 10);
      if (p.firma && !nrm(v.firmaAdi || v.aramaFirma).includes(nrm(p.firma))) return;
      if (p.sehir && nrm(v.sehir) !== nrm(p.sehir)) return;
      if (p.islemTipi && v.islemTipi !== p.islemTipi) return;
      if (p.baslangic && t < p.baslangic) return; if (p.bitis && t > p.bitis) return;
      if (p.ekleyen && !(v.ekleyen || "").toLowerCase().includes(String(p.ekleyen).toLowerCase())) return;
      if (p.bakim === "gecikmis" && !(sb && sb < bg)) return;
      if (p.bakim === "yaklasan" && !(sb && sb >= bg && sb <= lim)) return;
      if (kel.length) { const m = nrm(v.aciklama); if (!kel.some(x => m.includes(x))) return; }
      out.push({ id: d.id, v });
    });
    if (p.bakim === "gecikmis" || p.bakim === "yaklasan") out.sort((a, b) => (a.v.sonrakiBakim || "").localeCompare(b.v.sonrakiBakim || ""));
    else { const yon = p.sirala === "eski" ? 1 : -1; out.sort((a, b) => yon * (a.v.tarih || "").localeCompare(b.v.tarih || "")); }
    return out;
  }
  const anahtarlar = {
    firma: v => (v.firmaAdi || v.aramaFirma || "?").toLocaleUpperCase("tr-TR"),
    sehir: v => sehirAdi[nrm(v.sehir)] || v.sehir || "?",
    islemTipi: v => v.islemTipi || "?",
    ay: v => (v.tarih || "").slice(0, 7) || "?",
    ekleyen: v => v.ekleyen || "?"
  };
  const asSay = (out, g, en = 25) => {
    const f = anahtarlar[g]; if (!f) return "";
    const c = {}; out.forEach(x => { const a = f(x.v); c[a] = (c[a] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, en).map(([a, b]) => `${a}: ${b}`).join("\n");
  };
  const satirYap = v => {
    const s = document.createElement("div"); s.style.cssText = "padding:8px 0;border-top:1px solid var(--border);cursor:pointer";
    const a = document.createElement("div"); a.style.cssText = "font-weight:700;font-size:.85rem";
    const sb = (v.sonrakiBakim || "").slice(0, 10);
    a.textContent = `${v.firmaAdi || v.aramaFirma} · ${sehirAdi[nrm(v.sehir)] || v.sehir || ""} · ${v.islemTipi || ""} · ${(v.tarih || "").slice(0, 10)}` + (sb ? ` · bakım: ${sb}` : "");
    const b = document.createElement("div"); b.style.cssText = "font-size:.8rem;color:var(--text-muted)"; b.textContent = (v.aciklama || "").slice(0, 140);
    s.append(a, b);
    s.addEventListener("click", () => window.firmaKartiAc(v.aramaFirma, v.firmaAdi || v.aramaFirma, sehirAdi[nrm(v.sehir)] || v.sehir || ""));
    return s;
  };
  function asEylemler(bal, out, p) {
    const satir = document.createElement("div"); satir.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin-top:10px";
    const mk = (t, fn) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn-firma"; b.style.margin = "0"; b.textContent = t; b.addEventListener("click", fn); satir.appendChild(b); return b; };
    const liste = document.createElement("div"); liste.style.cssText = "display:none;margin-top:8px";
    const dahaB = document.createElement("button"); dahaB.type = "button"; dahaB.className = "btn-firma"; dahaB.style.cssText = "margin:8px 0 0;display:none";
    liste.appendChild(dahaB);
    let cizilen = 0, hedef = 0;
    const ciz = () => {
      while (cizilen < Math.min(out.length, hedef)) liste.insertBefore(satirYap(out[cizilen++].v), dahaB);
      dahaB.style.display = cizilen < out.length ? "block" : "none"; dahaB.textContent = `Daha fazla göster (${out.length - cizilen})`;
    };
    dahaB.addEventListener("click", () => { hedef += 20; ciz(); sohbetEl.scrollTop = sohbetEl.scrollHeight; });
    const goster = mk(`📄 Kayıtları göster (${out.length})`, () => {
      if (liste.style.display === "none") { if (!hedef) hedef = 15; ciz(); liste.style.display = "block"; goster.textContent = "🔼 Kayıtları gizle"; }
      else { liste.style.display = "none"; goster.textContent = `📄 Kayıtları göster (${out.length})`; }
    });
    mk("⬇ Excel (CSV)", () => { window.sonAramaSonuclari = out; window.sonuclariCsvIndir(); });
    if (p.firma) mk("🔍 Ara sekmesinde aç", () => { aramaKutusu.value = p.firma; $("aramaButonu").click(); });
    bal.append(satir, liste);
  }

  async function sor(soru, firmaZorla, planOnceki) {
    asBalon("k", firmaZorla ? `${soru}  →  ${firmaZorla}` : soru);
    const bal = asBalon("a", ""); bal.classList.add("yaziyor"); bal.innerHTML = '<span class="nokta"></span><span class="nokta"></span><span class="nokta"></span>';
    try {
      let p = planOnceki;
      if (!p) {
        try { p = await asPlan(soru); }
        catch (e) { if (/kota|bağlantı|Gemini hatası|anahtar/i.test(e.message)) throw e; p = { kayit: false }; }
      }
      if (firmaZorla) p = { ...p, kayit: true, firma: firmaZorla };
      let istem, out = [], eksikIndeks = false;
      if (p && p.kayit) {
        const snap = await raporVerisi(); out = asFiltrele(snap, p);
        if (p.firma && !out.length) {
          const benzer = asBenzerFirma(snap, p.firma);
          if (benzer.length) {   // firma bulunamadı ama yakın yazımlı firma var: Gemini'ye gitmeden öner
            asYaz(bal, `“${p.firma}” adında kayıt bulamadım.`);
            asBenzerKutu(bal, soru, p, benzer);
            asGecmis.push({ r: "k", t: soru }, { r: "a", t: `“${p.firma}” için kayıt bulunamadı; benzer firma önerildi.` });
            sohbetEl.scrollTop = sohbetEl.scrollHeight; return;
          }
        }
        let anlamsalNot = "";
        if (p.anlamsal) {
          let vektorlu = 0; snap.forEach(d => { if (d.data().vektor) vektorlu++; });
          const kapsam = snap.size ? vektorlu / snap.size : 0; eksikIndeks = kapsam < 0.9;
          try {
            const sira = await anlamsalSirala(snap, p);
            if (sira.length) { out = sira; anlamsalNot = `Kayıtlar "${p.anlamsal}" ifadesine anlamsal benzerliğe göre sıralandı (kayıtların %${Math.round(kapsam * 100)}'i indeksli). Gerçekten benzer kayıt yoksa bunu açıkça söyle.`; }
          } catch (e) { console.warn("Anlamsal arama:", e); }
        }
        const f = [p.firma && "firma: " + p.firma, p.sehir && "şehir: " + p.sehir, p.islemTipi && "işlem: " + p.islemTipi, p.baslangic && "başlangıç: " + p.baslangic, p.bitis && "bitiş: " + p.bitis, p.ekleyen && "ekleyen: " + p.ekleyen, p.bakim && "bakım: " + p.bakim, (p.anahtar || []).length && "notta geçen: " + p.anahtar.join(", "), p.anlamsal && "anlamsal: " + p.anlamsal].filter(Boolean).join(" · ");
        const firmaSay = new Set(out.map(x => nrm(x.v.firmaAdi || x.v.aramaFirma))).size;
        const grup = asSay(out, p.gruplama), tip = asSay(out, "islemTipi");
        const veri = out.slice(0, 60).map(({ v }) => [(v.tarih || "").slice(0, 10), v.firmaAdi || v.aramaFirma, sehirAdi[nrm(v.sehir)] || v.sehir, v.islemTipi, (v.aciklama || "").slice(0, 220), v.sonrakiBakim ? "sonraki bakım:" + v.sonrakiBakim.slice(0, 10) : ""].join(" | ")).join("\n");
        istem = AI_PROMPT.asVeri({ konusma: konusma(), soru, toplam: snap.size, filtre: f, eslesen: out.length, firmaSay, tip, grup, gruplamaAd: p.gruplama, anlamsal: anlamsalNot, veri });
      } else {
        istem = AI_PROMPT.asSohbet(konusma(), soru);
      }
      const cevap = await geminiAkis([{ text: istem }], { sistem: AI_PROMPT.asSistem, onMetin: t => { asYaz(bal, t); sohbetEl.scrollTop = sohbetEl.scrollHeight; } });
      asYaz(bal, cevap);
      asGecmis.push({ r: "k", t: soru }, { r: "a", t: cevap });
      if (out.length) asEylemler(bal, out, p);
      if (eksikIndeks && yoneticiMi()) { const ib = aiButon(bal, "beforeend", "🧠 Anlamsal aramayı geliştir (eski kayıtları indeksle)", () => anlamsalIndeksle(ib), "margin:10px 0 0;font-size:.78rem;padding:8px 14px"); }
      sohbetEl.scrollTop = sohbetEl.scrollHeight;
    } catch (e) { bal.remove(); sohbetEl.lastElementChild && sohbetEl.lastElementChild.remove(); throw e; }
  }
  const gonder = aiButon(k, "beforeend", "✨ Sor", async () => {
    const soru = $("aiSoru").value.trim(); if (!soru) throw new Error("Bir soru yazın");
    $("aiSoru").value = "";
    try { await sor(soru); } catch (e) { $("aiSoru").value = soru; throw e; }
  }, "margin-top:10px;");

  ["Gecikmiş bakımlar hangileri?", "Önümüzdeki 7 gün içinde bakımı gelen firmalar", "Bu ay kaç işlem yapıldı? Tiplerine göre dağılımı ver", "Geçen ay en çok arıza kaydı olan firmalar"].forEach(t => {
    const c = document.createElement("button"); c.type = "button"; c.className = "btn-firma"; c.style.cssText = "margin:0;font-size:.75rem"; c.textContent = t;
    c.addEventListener("click", () => { $("aiSoru").value = t; gonder.click(); });
    $("asOneri").appendChild(c);
  });
  $("asTemizle").addEventListener("click", () => { asGecmis.length = 0; sohbetEl.textContent = ""; sohbetEl.style.display = "none"; $("asTemizle").style.display = "none"; });
  $("aiSoru").addEventListener("keydown", e => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); gonder.click(); } });
}

/* Kartvizitten firma kartı */
{
  const satir = $("fkZaman").previousElementSibling; satir.style.display = "flex"; satir.style.flexWrap = "wrap";
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.style.display = "none"; satir.appendChild(inp);
  aiButon(satir, "beforeend", "✨ Kartvizitten doldur", () => { inp.value = ""; inp.click(); });
  inp.addEventListener("change", async () => {
    const f = inp.files[0]; if (!f) return; showToast("Kartvizit okunuyor…", "info");
    try {
      const r = await gemini([{ inlineData: { mimeType: "image/jpeg", data: await aiResim(f) } }, { text: AI_PROMPT.kartvizit }], { json: true, sema: AI_SEMA.kartvizit });
      if (r.yetkili) $("fkYetkili").value = r.yetkili;
      if (r.telefon) { $("fkTelefon").value = r.telefon; olay($("fkTelefon"), "input"); }
      if (r.adres) { $("fkAdres").value = r.adres; olay($("fkAdres"), "input"); }
      if (r.eposta) $("fkNot").value = ($("fkNot").value ? $("fkNot").value + "\n" : "") + "E-posta: " + r.eposta;
      showToast("Kartvizit okundu, kontrol edip kaydedin", "success");
    } catch (e) { console.error(e); showToast("AI: " + e.message, "error"); }
  });
}

/* ===== FOTOĞRAF GÖRÜNTÜLEYİCİ: DÖNDÜRME + AI İLE FORM OKUMA ===== */
{
  const img = $("modalImage"); let d = 0;
  const uyg = () => { const odd = d % 180 !== 0, w = img.offsetWidth, h = img.offsetHeight; img.style.transition = "rotate .25s, scale .25s"; img.style.rotate = d ? d + "deg" : ""; img.style.scale = odd && w && h ? Math.min(1, w / h, h / w) : ""; };
  const sifirla = () => { d = 0; img.style.transition = ""; img.style.rotate = ""; img.style.scale = ""; };
  $("imgDondur").addEventListener("click", () => { d = (d + 90) % 360; uyg(); });
  const a = window.resmiAc; window.resmiAc = async function () { sifirla(); return a.apply(this, arguments); };
  const k = window.modaliKapat; window.modaliKapat = () => { sifirla(); k(); };
}

{
  const panel = document.createElement("div");
  panel.style.cssText = "display:none;flex-direction:column;align-items:center;gap:8px;margin-top:12px;width:min(560px,100%)";
  const onizle = document.createElement("div");
  onizle.style.cssText = "display:none;flex-direction:column;gap:8px;width:100%";
  const not = document.createElement("div"); not.style.cssText = "color:#fff;font-size:.78rem;line-height:1.4;opacity:.9";
  const ta = document.createElement("textarea");
  ta.setAttribute("aria-label", "AI'ın okuduğu açıklama; kaydetmeden önce düzenleyebilirsiniz");
  ta.style.cssText = "width:100%;min-height:110px;max-height:30vh;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff;font:inherit;font-size:.85rem;line-height:1.45;resize:vertical";
  const satir = document.createElement("div"); satir.style.cssText = "display:flex;gap:8px";
  const kaydet = document.createElement("button"); kaydet.type = "button"; kaydet.className = "btn btn-primary"; kaydet.style.cssText = "flex:1;margin:0"; kaydet.textContent = "💾 Kaydet";
  const vazgec = document.createElement("button"); vazgec.type = "button"; vazgec.className = "btn"; vazgec.style.cssText = "margin:0;background:var(--border);color:var(--text-main)"; vazgec.textContent = "Vazgeç";
  satir.append(kaydet, vazgec); onizle.append(not, ta, satir); panel.appendChild(onizle);
  $("downloadLink").insertAdjacentElement("beforebegin", panel);
  let docId = null;
  const gizle = () => { onizle.style.display = "none"; ta.value = ""; };
  vazgec.addEventListener("click", gizle);
  kaydet.addEventListener("click", async () => {
    const id = docId, t = ta.value.trim();
    if (!id || !t) return;
    if (!yoneticiMi()) { showToast("Kaydetme yetkiniz yok", "error"); return; }
    kaydet.disabled = true;
    try {
      const v = window.formCache?.[id] || (await getDoc(doc(db, "formlar", id))).data() || {};
      if (v.aciklama && !confirm("Bu formda zaten açıklama var. AI okuması üzerine yazılsın mı?")) return;
      const vv = await vektorHazirla(v.islemTipi, t);
      await updateDoc(doc(db, "formlar", id), { aciklama: t, ...(vv.vektor ? vv : { vektor: deleteField(), vektorSurum: deleteField() }) });
      logYaz("Not AI ile yazıldı", v.formKodu || id, "Form fotoğrafından okundu");
      if (window.formCache?.[id]) window.formCache[id].aciklama = t;
      const kart = $("kart-" + id);
      if (kart) { let x = kart.querySelector(".aciklama-kutusu"); if (!x) { x = document.createElement("div"); x.className = "aciklama-kutusu"; kart.appendChild(x); } x.textContent = t; }
      if (window.aramaOnbellek) window.aramaOnbellek.clear();
      raporKayitYenile(id);
      showToast("Açıklama kaydedildi", "success"); gizle();
    } catch (e) { console.error(e); showToast("Kaydedilemedi: " + e.message, "error"); }
    finally { kaydet.disabled = false; }
  });
  const oku = async () => {
    const id = docId, src = $("modalImage").src;
    if (!id || !src.startsWith("data:")) throw new Error("Fotoğraf henüz yüklenmedi");
    const t = (await gemini([{ inlineData: { mimeType: src.slice(5, src.indexOf(";")), data: src.split(",")[1] } }, { text: AI_PROMPT.formOku }], { sistem: AI_PROMPT.sistem })).trim();
    if (/^OKUNAMADI/i.test(t)) { gizle(); showToast("Formdan açıklama okunamadı", "info"); return; }
    const yetkili = yoneticiMi();
    ta.value = t; kaydet.style.display = yetkili ? "" : "none";
    not.textContent = yetkili ? "AI okuması henüz kaydedilmedi. Gerekirse düzeltin, sonra Kaydet'e basın." : "AI okuması (kaydetme yetkiniz yok).";
    onizle.style.display = "flex";
  };
  aiButon(panel, "afterbegin", "✨ Formu oku", oku, "margin:0;");
  const ra = window.resmiAc;
  window.resmiAc = async function (id) {
    docId = id; gizle(); panel.style.display = "none";
    await ra.apply(this, arguments);
    panel.style.display = "flex";
  };
}
