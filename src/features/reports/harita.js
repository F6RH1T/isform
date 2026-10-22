import { state } from "../../core/state.js";
import { sehirIsimleri } from "../../lib/sehirler.js";
import { htmlGuvenli, metniNormalizeEt } from "../../lib/text.js";
import { $ } from "../../lib/dom.js";
import { yoneticiMi } from "../../core/session.js";
import { SIRA_YONU, kartDokumuHTML } from "../search/search.js";
import { tarihKarsilastir } from "../../lib/dates.js";
import { bashar } from "../../lib/tip.js";

export let secilenIl = null;

let harZoom = 1, harCx = 385, harCy = 165;

const SEHIR_KOORD = "adana:35.32,37.00;adiyaman:38.28,37.76;afyonkarahisar:30.54,38.76;agri:43.05,39.72;aksaray:34.03,38.37;amasya:35.83,40.65;ankara:32.85,39.93;antalya:30.71,36.90;ardahan:42.70,41.11;artvin:41.82,41.18;aydin:27.84,37.85;balikesir:27.89,39.65;bartin:32.34,41.64;batman:41.13,37.88;bayburt:40.23,40.26;bilecik:29.98,40.14;bingol:40.50,38.88;bitlis:42.11,38.40;bolu:31.61,40.73;burdur:30.29,37.72;bursa:29.06,40.19;canakkale:26.41,40.15;cankiri:33.62,40.60;corum:34.95,40.55;denizli:29.09,37.78;diyarbakir:40.24,37.91;duzce:31.16,40.84;edirne:26.56,41.68;elazig:39.22,38.67;erzincan:39.49,39.75;erzurum:41.27,39.90;eskisehir:30.52,39.78;gaziantep:37.38,37.07;giresun:38.39,40.91;gumushane:39.48,40.46;hakkari:43.74,37.58;hatay:36.16,36.40;igdir:44.04,39.92;isparta:30.55,37.76;istanbul:28.98,41.01;izmir:27.14,38.42;kahramanmaras:36.94,37.58;karabuk:32.62,41.20;karaman:33.22,37.18;kars:43.09,40.61;kastamonu:33.78,41.38;kayseri:35.48,38.73;kilis:37.12,36.72;kirikkale:33.51,39.85;kirklareli:27.22,41.74;kirsehir:34.16,39.15;kocaeli:29.94,40.77;konya:32.49,37.87;kutahya:29.98,39.42;malatya:38.31,38.35;manisa:27.43,38.61;mardin:40.74,37.31;mersin:34.64,36.80;mugla:28.36,37.22;mus:41.49,38.74;nevsehir:34.71,38.62;nigde:34.68,37.97;ordu:37.88,40.98;osmaniye:36.25,37.07;rize:40.52,41.02;sakarya:30.40,40.76;samsun:36.33,41.29;sanliurfa:38.79,37.16;siirt:41.94,37.93;sinop:35.15,42.03;sirnak:42.46,37.52;sivas:37.02,39.75;tekirdag:27.51,40.98;tokat:36.55,40.31;trabzon:39.72,41.00;tunceli:39.55,39.11;usak:29.41,38.68;van:43.38,38.50;yalova:29.27,40.65;yozgat:34.81,39.82;zonguldak:31.80,41.45";

const sehirKoord = Object.fromEntries(SEHIR_KOORD.split(";").map(s => { const [k, v] = s.split(":"); return [k, v.split(",").map(Number)]; }));

export const sehirAdi = Object.fromEntries(sehirIsimleri.map(a => [metniNormalizeEt(a), a]));

const ANADOLU = [[29.10,41.22],[29.90,41.17],[30.60,41.10],[31.30,41.12],[31.80,41.45],[32.40,41.75],[33.00,41.90],[33.80,42.02],[35.15,42.10],[35.90,41.65],[36.35,41.35],[37.20,41.10],[37.90,41.05],[38.40,40.95],[39.70,41.12],[40.50,41.12],[41.50,41.52],[42.50,41.50],[43.45,41.10],[43.75,40.70],[43.65,40.15],[44.10,39.95],[44.80,39.65],[44.40,38.40],[44.80,37.20],[44.20,37.00],[43.70,37.20],[42.60,37.20],[41.50,37.10],[40.00,36.85],[38.95,36.70],[38.00,36.82],[37.10,36.65],[36.60,36.25],[36.20,35.95],[35.95,35.85],[35.95,36.10],[36.15,36.55],[35.90,36.80],[35.50,36.55],[34.90,36.75],[34.60,36.75],[33.60,36.20],[32.90,36.05],[32.00,36.50],[31.00,36.85],[30.70,36.85],[30.50,36.55],[30.30,36.30],[29.60,36.15],[29.10,36.65],[28.40,36.65],[27.50,36.70],[27.40,37.00],[27.25,37.85],[26.70,38.20],[26.35,38.30],[26.50,38.70],[26.75,39.10],[26.65,39.50],[26.05,39.50],[26.20,40.00],[26.40,40.15],[26.70,40.40],[27.20,40.42],[27.95,40.35],[28.85,40.37],[29.15,40.43],[29.30,40.65],[29.90,40.72],[29.30,40.90],[29.05,40.97],[29.10,41.15]];

const TRAKYA = [[26.36,41.71],[27.55,42.00],[28.02,41.98],[28.40,41.55],[29.00,41.23],[29.05,41.05],[28.25,41.05],[27.50,40.95],[26.75,40.40],[26.18,40.04],[26.25,40.50],[26.05,40.75],[26.30,41.00],[26.60,41.35]];

const HX0 = 25.5, HY0 = 42.3, HS = 50, HKX = Math.cos(39 * Math.PI / 180);

const hpx = ([lon, lat]) => [(lon - HX0) * HKX * HS, (HY0 - lat) * HS];

function yarimDuzlemKirp(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const fp = a * P[0] + b * P[1] - c, fq = a * Q[0] + b * Q[1] - c;
    if (fp <= 0) out.push(P);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
  }
  return out;
}

let ilBolgeleri = null;

function ilBolgeleriniHesapla() {
  const alanlar = [ANADOLU.map(hpx), TRAKYA.map(hpx)];
  const trakya = ["edirne", "kirklareli", "tekirdag", "istanbul"];
  const tohumlar = Object.entries(sehirKoord).map(([k, c]) => ({ k, p: hpx(c), g: trakya.includes(k) ? 1 : 0 }));
  tohumlar.push({ k: "istanbul", p: hpx([29.2, 40.98]), g: 0 }, { k: "canakkale", p: hpx([26.3, 40.3]), g: 1 });
  return tohumlar.map(s => {
    let poly = alanlar[s.g];
    tohumlar.forEach(o => {
      if (o === s || o.g !== s.g || !poly.length) return;
      poly = yarimDuzlemKirp(poly, o.p[0] - s.p[0], o.p[1] - s.p[1], (o.p[0] ** 2 + o.p[1] ** 2 - s.p[0] ** 2 - s.p[1] ** 2) / 2);
    });
    return { k: s.k, poly };
  });
}

function bolgeMerkezi(p) {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length];
    const f = x0 * y1 - x1 * y0;
    A += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  A /= 2;
  if (!A) return { x: p[0][0], y: p[0][1], alan: 0 };
  return { x: cx / (6 * A), y: cy / (6 * A), alan: Math.abs(A) };
}

export function raporHaritasiniCiz() {
  if (!ilBolgeleri) ilBolgeleri = ilBolgeleriniHesapla();
  const filtre = $("haritaFiltre").value, veri = {};
  Object.entries(state.raporSehirVeri).forEach(([k, l]) => {
    const m = filtre ? l.filter(x => x.v.islemTipi === filtre) : l;
    if (m.length) veri[k] = m;
  });
  const maks = Math.max(1, ...Object.values(veri).map(a => a.length));
  const yol = poly => "M" + poly.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L") + "Z";
  const ciz = h => {
    const n = (veri[h.k] || []).length, sec = h.k === secilenIl;
    return `<path class="hrt-il${n ? " ziyaret" : ""}${sec ? " secili" : ""}" data-sehir="${h.k}" d="${yol(h.poly)}" style="fill-opacity:${n ? (0.55 + 0.45 * n / maks).toFixed(2) : 1}"><title>${htmlGuvenli(sehirAdi[h.k])}${n ? " · " + n + " form" : ""}</title></path>`;
  };
  const bolgeler = ilBolgeleri.filter(h => h.poly.length >= 3);
  let svg = bolgeler.filter(h => h.k !== secilenIl).map(ciz).join("") + bolgeler.filter(h => h.k === secilenIl).map(ciz).join("");

  const mobil = window.innerWidth < 1024;
  const olcek = 770 / ($("raporHaritaKutu").clientWidth || 340);
  const hz = mobil ? harZoom : 1, hvw = 770 / hz, hvh = 330 / hz;
  const hvx = mobil ? harCx - hvw / 2 : 0, hvy = mobil ? harCy - hvh / 2 : 0;
  const merkezler = {};
  bolgeler.forEach(h => {
    const m = bolgeMerkezi(h.poly);
    if (!merkezler[h.k] || m.alan > merkezler[h.k].alan) merkezler[h.k] = m;
  });
  
  const kutular = [];
  const adaylar = Object.entries(merkezler)
    .sort((a, b) => ((b[0] === secilenIl) - (a[0] === secilenIl)) || ((veri[b[0]] ? 1 : 0) - (veri[a[0]] ? 1 : 0)) || (b[1].alan - a[1].alan));
  const carpisir = kt => kutular.some(q => kt.x1 < q.x2 && kt.x2 > q.x1 && kt.y1 < q.y2 && kt.y2 > q.y1);
  adaylar.forEach(([k, m]) => {
    if (mobil && (m.x < hvx || m.x > hvx + hvw || m.y < hvy || m.y > hvy + hvh)) return;
    const sec = k === secilenIl, ad = sehirAdi[k], var_ = !!veri[k];
    const kutuOlustur = (fs, oy) => {
      const w = ad.length * fs * 0.56 + fs * 0.4, h = fs * 1.1, cy = m.y + oy;
      return { x1: m.x - w / 2, x2: m.x + w / 2, y1: cy - h / 2, y2: cy + h / 2, fs, cy };
    };
    
    const baz = mobil
      ? (sec ? 12.5 : Math.min(10, 6.5 + hz)) * olcek / hz
      : Math.max(5.2, Math.min(9, Math.sqrt(m.alan) / 9)) + (sec ? 1.5 : 0);
    const asgari = mobil ? baz * 0.8 : 4.4;
    let secim = null;
    for (const carpan of [1, 0.88, 0.78, 0.7]) {
      const fs = Math.max(asgari, baz * carpan);
      for (const oy of [0, -fs * 1.05, fs * 1.05]) {
        const kt = kutuOlustur(fs, oy);
        if (sec || !carpisir(kt)) { secim = kt; break; }
      }
      if (secim) break;
    }
    
    if (!secim) { if (mobil) return; secim = kutuOlustur(asgari, 0); }
    kutular.push(secim);
    svg += `<text class="hrt-etiket${var_ ? "" : " bos"}${sec ? " buyuk" : ""}" x="${m.x.toFixed(1)}" y="${secim.cy.toFixed(1)}" dy=".35em" style="font-size:${secim.fs.toFixed(2)}px;stroke-width:${(secim.fs * 0.24).toFixed(2)}px">${htmlGuvenli(ad)}</text>`;
  });
  let zoomHTML = "";
  if (mobil) {
    zoomHTML = `<div class="zoom-kutu"><button type="button" class="zoom-btn" data-zoom="+" aria-label="Yakınlaştır">+</button><button type="button" class="zoom-btn" data-zoom="-" aria-label="Uzaklaştır">−</button><button type="button" class="zoom-btn" data-zoom="0" aria-label="Sıfırla" style="font-size:1rem">⟲</button></div>`;
  }
  $("raporHaritaKutu").innerHTML = `${zoomHTML}<svg viewBox="${hvx.toFixed(1)} ${hvy.toFixed(1)} ${hvw.toFixed(1)} ${hvh.toFixed(1)}" style="touch-action:${mobil && harZoom > 1 ? "none" : "pan-y"}" role="img" aria-label="Türkiye haritası">${svg}</svg>`;

  const gidilen = Object.keys(sehirKoord).filter(k => veri[k]);
  const belirsiz = (state.raporSehirVeri["belirsiz"] || []).length;
  $("haritaOzet").textContent = `81 ilin ${gidilen.length} tanesinde ${filtre ? filtre.toLowerCase() + " " : ""}iş formu var` + (belirsiz ? ` · ${belirsiz} formun ili belirsiz` : "");
  $("statIl").textContent = Object.keys(sehirKoord).filter(k => state.raporSehirVeri[k]).length + " / 81";
  const gidilmeyen = Object.keys(sehirKoord).filter(k => !veri[k]).map(k => sehirAdi[k]).sort((a, b) => a.localeCompare(b, "tr"));
  $("gidilmeyenBaslik").textContent = `Kaydı olmayan iller (${gidilmeyen.length})`;
  $("gidilmeyenListe").innerHTML = gidilmeyen.map(a => `<span>${htmlGuvenli(a)}</span>`).join("");
}

export function ilPaneliniCiz() {
  const div = document.getElementById("raporIlPaneli"), k = secilenIl, ad = sehirAdi[k] ? sehirAdi[k] : k, filtre = document.getElementById("haritaFiltre").value;
  const liste = (state.raporSehirVeri[k] || []).filter(x => !filtre || x.v.islemTipi === filtre);
  if (!liste.length) { div.innerHTML = `<div class="empty-state"><p>${htmlGuvenli(ad)} için kayıt yok.</p></div>`; return; }
  const isAdmin = yoneticiMi();
  const opt = { day: "numeric", month: "short", year: "numeric" };
  const gruplar = {};
  liste.forEach(x => { const f = (x.v.firmaAdi || "İSİMSİZ FİRMA").toLocaleUpperCase("tr-TR"); (gruplar[f] = gruplar[f] || []).push(x); });
  let h = `<div class="sonuc-bilgisi">${htmlGuvenli(ad.toLocaleUpperCase("tr-TR"))}: ${Object.keys(gruplar).length} firma · ${liste.length} form</div>`;
  Object.entries(gruplar).sort((a, b) => b[1].length - a[1].length).forEach(([firma, formlar]) => {
    formlar.sort((a, b) => SIRA_YONU * tarihKarsilastir(a.v, b.v));
    const kod = (formlar.find(x => x.v.firmaKodu) || { v: {} }).v.firmaKodu;
    h += `<div class="firma-grup">
      <div class="firma-baslik" onclick="this.parentElement.classList.toggle('acik')">
        <span class="fb-sol"><span class="fb-av" aria-hidden="true">${bashar(firma)}</span><span class="fb-ad">${htmlGuvenli(firma)}</span>${kod ? `<span class="badge fb-kod">${htmlGuvenli(kod)}</span>` : ""}<span class="fb-sayi" title="Form sayısı">${formlar.length}</span></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div class="firma-icerik">${formlar.map(x => kartDokumuHTML(x.id, x.v, opt, isAdmin)).join("")}</div></div>`;
  });
  div.innerHTML = h;
}

let harSurukleme = false, harHareket = 0, harMesafe0 = 0, harZoom0 = 1;

const harPtr = new Map();

const harSinirla = () => {
  harZoom = Math.min(8, Math.max(1, harZoom));
  const vw = 770 / harZoom, vh = 330 / harZoom;
  harCx = Math.min(770 - vw / 2, Math.max(vw / 2, harCx));
  harCy = Math.min(330 - vh / 2, Math.max(vh / 2, harCy));
};

const harViewBox = () => {
  const s = $("raporHaritaKutu").querySelector("svg");
  if (s) s.setAttribute("viewBox", `${harCx - 385 / harZoom} ${harCy - 165 / harZoom} ${770 / harZoom} ${330 / harZoom}`);
};

const harKutu = $("raporHaritaKutu");

harKutu.addEventListener("pointerdown", e => {
  if (window.innerWidth >= 1024 || e.target.closest(".zoom-btn")) return;
  if (!harPtr.size) { harHareket = 0; harSurukleme = false; }
  harPtr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (harPtr.size === 2) {
    const [a, b] = [...harPtr.values()];
    harMesafe0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; harZoom0 = harZoom;
  }
});

harKutu.addEventListener("pointermove", e => {
  const p = harPtr.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (harPtr.size === 2) {
    const [a, b] = [...harPtr.values()];
    harZoom = harZoom0 * (Math.hypot(a.x - b.x, a.y - b.y) / harMesafe0);
    harSurukleme = true; harSinirla(); harViewBox();
  } else if (harZoom > 1) {
    harHareket += Math.abs(dx) + Math.abs(dy);
    if (harHareket > 8) harSurukleme = true;
    const u = (770 / harZoom) / (harKutu.clientWidth || 340);
    harCx -= dx * u; harCy -= dy * u;
    harSinirla(); harViewBox();
  }
});

const harBitir = e => {
  if (!harPtr.delete(e.pointerId)) return;
  if (!harPtr.size && harSurukleme) { raporHaritasiniCiz(); setTimeout(() => { harSurukleme = false; }, 80); }
};

harKutu.addEventListener("pointerup", harBitir);

harKutu.addEventListener("pointercancel", harBitir);

$("raporHaritaKutu").addEventListener("click", e => {
  const zb = e.target.closest("[data-zoom]");
  if (zb) {
    const v = zb.dataset.zoom;
    if (v === "+") harZoom *= 1.6; else if (v === "-") harZoom /= 1.6; else { harZoom = 1; harCx = 385; harCy = 165; }
    harSinirla(); raporHaritasiniCiz();
    return;
  }
  if (harSurukleme) return;
  const g = e.target.closest("[data-sehir]");
  if (!g) return;
  secilenIl = g.dataset.sehir;
  raporHaritasiniCiz();
  ilPaneliniCiz();
  $("raporIlPaneli").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("haritaFiltre").addEventListener("change", () => { raporHaritasiniCiz(); if (secilenIl) ilPaneliniCiz(); });
