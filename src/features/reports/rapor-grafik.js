import { $ } from "../../lib/dom.js";
import { htmlGuvenli } from "../../lib/text.js";
import { TIP_RENK, tipSinif } from "../../lib/tip.js";
import { sehirGoster } from "../../lib/sehirler.js";

/* Rapor görselleri: işlem halka grafiği, aylık çubuk grafik, en çok form olan 5 il, sayaç animasyonu */
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const TIP_AD = { bakim: "Bakım", ariza: "Arıza", kurulum: "Kurulum", kesif: "Keşif", ziyaret: "Müşteri ziyareti", diger: "Diğer", yok: "Belirtilmemiş" };

export function sayacAnimasyonu(id) {
  const el = $(id); if (!el) return;
  const m = String(el.textContent).match(/^(\d+)(.*)$/); if (!m) return;
  const hedef = +m[1], son = m[2];
  if (!hedef || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const t0 = performance.now(), sure = 900;
  const adim = t => { const k = Math.min(1, (t - t0) / sure), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(hedef * e) + son; if (k < 1) requestAnimationFrame(adim); };
  requestAnimationFrame(adim);
}

function halka(tipler) {
  const top = tipler.reduce((a, [, n]) => a + n, 0); if (!top) return "";
  const R = 52, C = 2 * Math.PI * R; let ofs = 0;
  const yaylar = tipler.map(([k, n]) => {
    const u = n / top * C, g = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${TIP_RENK[k]}" stroke-width="20" stroke-dasharray="${Math.max(u - 1.5, 0.5)} ${C}" stroke-dashoffset="${-ofs}" transform="rotate(-90 70 70)"/>`;
    ofs += u; return g;
  }).join("");
  const lej = tipler.map(([k, n]) => `<div class="gr-lej"><i style="background:${TIP_RENK[k]}"></i><span>${TIP_AD[k]}</span><b>${n}</b></div>`).join("");
  return `<div class="gr-kart"><div class="gr-baslik">İşlem dağılımı</div><div class="gr-halka"><svg viewBox="0 0 140 140" role="img" aria-label="İşlem dağılımı halka grafiği"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--border)" stroke-width="20"/>${yaylar}<text x="70" y="67" text-anchor="middle" class="gr-orta">${top}</text><text x="70" y="84" text-anchor="middle" class="gr-orta-alt">kayıt</text></svg><div class="gr-lejant">${lej}</div></div></div>`;
}

function aylik(formlar) {
  const now = new Date(), say = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); say.push({ y: d.getFullYear(), m: d.getMonth(), n: 0 }); }
  formlar.forEach(v => { const d = new Date(v.tarih); if (isNaN(d)) return; const k = say.find(x => x.y === d.getFullYear() && x.m === d.getMonth()); if (k) k.n++; });
  const mx = Math.max(1, ...say.map(x => x.n)), W = 300, H = 130, bw = 30, gap = (W - bw * 6) / 7;
  const cubuk = say.map((x, i) => {
    const h = Math.max(x.n ? 4 : 0, x.n / mx * (H - 44)), px = gap + i * (bw + gap), py = H - 22 - h;
    return `<rect x="${px}" y="${py}" width="${bw}" height="${h}" rx="9" fill="url(#grCubuk)"/><text x="${px + bw / 2}" y="${py - 5}" text-anchor="middle" class="gr-say">${x.n || ""}</text><text x="${px + bw / 2}" y="${H - 6}" text-anchor="middle" class="gr-ay">${AYLAR[x.m]}</text>`;
  }).join("");
  return `<div class="gr-kart"><div class="gr-baslik">Son 6 ayda kayıt</div><svg viewBox="0 0 ${W} ${H}" class="gr-cubuk" role="img" aria-label="Aylık kayıt sayısı"><defs><linearGradient id="grCubuk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a4c"/><stop offset="1" stop-color="#f26522"/></linearGradient></defs>${cubuk}</svg></div>`;
}

function enCokIl(formlar) {
  const s = {}; formlar.forEach(v => { const k = sehirGoster(v.sehir || "Belirsiz").toLocaleUpperCase("tr-TR"); s[k] = (s[k] || 0) + 1; });
  const liste = Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 5); if (!liste.length) return "";
  const mx = liste[0][1];
  const satir = liste.map(([k, n], i) => `<div class="gr-il"><span class="gr-sira">${i + 1}</span><div class="gr-il-orta"><div class="gr-il-ust"><span>${htmlGuvenli(k)}</span><b>${n}</b></div><div class="gr-iz"><div style="width:${Math.round(n / mx * 100)}%"></div></div></div></div>`).join("");
  return `<div class="gr-kart"><div class="gr-baslik">En çok form olan 5 il</div>${satir}</div>`;
}

export function raporGrafikCiz(formlar) {
  const alan = $("raporGrafikAlani"); if (!alan) return;
  const say = {}; formlar.forEach(v => { const k = tipSinif(v.islemTipi); say[k] = (say[k] || 0) + 1; });
  const tipler = Object.entries(say).sort((a, b) => b[1] - a[1]);
  alan.innerHTML = halka(tipler) + aylik(formlar) + enCokIl(formlar);
  ["statToplam", "statFirma", "statIl"].forEach(sayacAnimasyonu);
}
