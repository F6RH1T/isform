import { addDoc, collection } from "firebase/firestore";
import { state } from "../../core/state.js";
import { $, v } from "../../lib/dom.js";
import { imzaVarMi, imzalariTemizle } from "./imza.js";
import { htmlGuvenli, metniNormalizeEt } from "../../lib/text.js";
import { getLocation } from "../../lib/konum.js";
import { firmaKodunuBul } from "../firms/firma-kodu-servis.js";
import { aciklamayiSayfala, gorselleriBekle, sablonHTML } from "./pdf-template.js";
import { db } from "../../firebase/init.js";
import { inputtanIsoYap, tarihiInputaCevir } from "../../lib/dates.js";
import { vektorHazirla } from "../ai/embeddings.js";
import { logYaz } from "../../core/session.js";

$("olusturFormu").addEventListener("submit", async e => {
  e.preventDefault();
  if (!navigator.onLine) { showToast("İnternet bağlantısı yok.", "error"); return; }
  const isl = ad => [...document.querySelectorAll(`input[name="${ad}"]:checked`)].map(x => x.value);
  const d = { 
    no: "", 
    tarih: $("ofTarih").value, firma: v("ofFirma"), sehir: $("ofSehir").value, yetkili: v("ofYetkili"), gsm: v("ofGsm"), adres: v("ofAdres"),
    cihaz: isl("cihaz"), marka: v("ofMarka"), kapasite: v("ofKapasite"), seri: v("ofSeri"), proje: v("ofProje"),
    servis: isl("servis"), basla: v("ofBasla"), bitis: v("ofBitis"), gidis: v("ofGidis"), donus: v("ofDonus"),
    aciklama: v("ofAciklama"), p: [1,2,3,4,5,6].map(i => v("ofP" + i)), sorumlu: v("ofSorumlu"), musteri: v("ofMusteri"),
    imza: imzaVarMi("imzaCanvas") ? document.getElementById("imzaCanvas").toDataURL("image/png") : "",
    imzaSorumlu: imzaVarMi("imzaSorumluCanvas") ? document.getElementById("imzaSorumluCanvas").toDataURL("image/png") : ""
  };
  
  if (!d.firma || !d.sehir || !d.tarih) { showToast("Firma, şehir ve tarih zorunlu.", "error"); return; }
  if (window.ofKilit) return;
  if (!d.imzaSorumlu && !confirm("Servis sorumlusu (firma yetkilisi) imzası atılmadı. Yine de devam edilsin mi?")) return;
  if (!d.imza && !confirm("Müşteri imzası atılmadı. Yine de devam edilsin mi?")) return;
  window.ofKilit = true;

  const btn = $("ofKaydet"); btn.disabled = true; btn.innerText = "PDF hazırlanıyor…";
  try {
    const aramaFirma = metniNormalizeEt(d.firma);
    const konum = await getLocation();
    
    const { firmaKodu, sonNo } = await firmaKodunuBul(aramaFirma);
    const no = sonNo + 1;
    d.no = `${firmaKodu}${no}`;

    const logoHTML = "";

    const { fs, parcalar } = await aciklamayiSayfala(d, logoHTML);
    await pdfKutuphaneleri();
    const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
    const canvaslar = [];
    for (let i = 0; i < parcalar.length; i++) {
      btn.innerText = `PDF hazırlanıyor (${i + 1}/${parcalar.length})…`;
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;left:-10000px;top:0";
      wrap.innerHTML = sablonHTML(d, logoHTML, { ac: parcalar[i], fs, sayfa: i + 1, toplam: parcalar.length });
      document.body.appendChild(wrap);
      let canvas;
      try {
        await gorselleriBekle(wrap);
        canvas = await html2canvas(wrap.firstElementChild, { scale: 2, backgroundColor: "#fff", useCORS: true, scrollX: 0, scrollY: 0 });
      } finally { wrap.remove(); }
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
      canvaslar.push(canvas);
    }
    const pdfAdi = `ENORPA_${firmaKodu}${no}.pdf`;
    pdf.save(pdfAdi);
    const pdfDosya = new File([pdf.output("blob")], pdfAdi, { type: "application/pdf" });

    const kucult = canvas => {
      const k = document.createElement("canvas"), s = 1100 / canvas.width;
      k.width = 1100; k.height = Math.round(canvas.height * s);
      k.getContext("2d").drawImage(canvas, 0, 0, k.width, k.height);
      return k.toDataURL("image/jpeg", 0.7);
    };
    const fotoRef = await addDoc(collection(db, "formFotograflari"), { base64: kucult(canvaslar[0]) });
    const ekIdler = [];
    for (let i = 1; i < canvaslar.length; i++) {
      const r = await addDoc(collection(db, "formFotograflari"), { base64: kucult(canvaslar[i]) });
      ekIdler.push(r.id);
    }
    const islemTipi = ["Bakım","Arıza","Kurulum","Keşif"].find(x => d.servis.includes(x)) || "Diğer";
    const payload = { firmaAdi: d.firma, aramaFirma, sehir: d.sehir, islemTipi, aciklama: d.aciklama, ekleyen: state.aktifKullaniciMail,
      fotoId: fotoRef.id, firmaKodu, formNo: no, formKodu: `${firmaKodu}${no}`, tarih: inputtanIsoYap(d.tarih),
      eklenmeTarihi: new Date().toISOString(), olusturulan: true, formVerisi: d };
    if (ekIdler.length) payload.ekFotoIdler = ekIdler;
    Object.assign(payload, await vektorHazirla(payload.islemTipi, payload.aciklama));
    if (konum) payload.konum = konum;
    await addDoc(collection(db, "formlar"), payload);
    logYaz("Form (PDF) oluşturuldu", payload.formKodu || "", payload.firmaAdi || "");

    showToast("PDF oluşturuldu ve kaydedildi 🎉", "success");
    pdfPaylasKartiAc(pdfDosya, d.firma);
    $("olusturFormu").reset(); 
    $("ofTarih").value = tarihiInputaCevir();
    imzalariTemizle();
    ekleModu(null);
  } catch (err) { console.error(err); showToast("Hata: " + err.message, "error"); }
  finally { window.ofKilit = false; btn.disabled = false; btn.innerText = "PDF oluştur ve kaydet"; }
});

/* ===== PDF PAYLAŞ (telefonun paylaş menüsü / WhatsApp) ===== */
window.pdfPaylasKartiAc = function (dosya, firma) {
  const eski = document.getElementById("pdfPaylasKarti"); if (eski) eski.remove();
  const paylasilabilir = !!(navigator.canShare && navigator.canShare({ files: [dosya] }));
  const k = document.createElement("div");
  k.id = "pdfPaylasKarti";
  k.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom,0px));width:calc(100% - 32px);max-width:420px;z-index:10000;background:var(--surface);color:var(--text-main);border:1px solid var(--border);border-radius:var(--r-md);box-shadow:0 14px 40px -8px rgba(0,0,0,.4);padding:16px";
  k.innerHTML = `<div style="font-weight:700;margin-bottom:4px">📄 PDF hazır</div>
    <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:12px">${htmlGuvenli(firma)} · ${htmlGuvenli(dosya.name)}</div>
    <div style="display:flex;gap:8px">
      ${paylasilabilir ? '<button type="button" id="btnPdfPaylas" class="btn btn-primary" style="flex:1">📤 Paylaş / WhatsApp</button>'
        : '<div style="flex:1;font-size:.8rem;color:var(--text-muted)">Bu tarayıcı dosya paylaşımını desteklemiyor; PDF cihaza indirildi, WhatsApp’tan elle ekleyebilirsiniz.</div>'}
      <button type="button" id="btnPdfKapat" class="btn" style="background:var(--border);color:var(--text-main)">Kapat</button>
    </div>`;
  document.body.appendChild(k);
  $("btnPdfKapat").onclick = () => k.remove();
  const b = $("btnPdfPaylas");
  if (b) b.onclick = async () => {
    try { await navigator.share({ files: [dosya], title: dosya.name, text: "ENORPA servis formu" }); k.remove(); }
    catch (e) { if (e && e.name !== "AbortError") showToast("Paylaşılamadı: " + e.message, "error"); }
  };
};
