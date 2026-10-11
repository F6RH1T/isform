import { $ } from "../../lib/dom.js";

/* ===== İŞ FORMU OLUŞTUR ===== */
export const CIHAZ = ["Has","Ha NG","Kalsedon","Akuamarin","Ametist","Kuvars","Jasper","Has Turbo","Turkuaz","Oniks","Obsidyen","Ametrin","Turmalin","Diğer"];

const SERVIS = ["Arıza","Keşif","Ücretli","Kurulum","Bakım","Garantili"];

export const fa = (id, et, tip = "text", ek = "") => `<div class="form-floating ${ek}"><input type="${tip}" id="${id}" placeholder=" " autocomplete="off"><label for="${id}">${et}</label></div>`;

const chipler = (liste, ad) => liste.map(x => `<label class="chip-cb"><input type="checkbox" name="${ad}" value="${x}"><span>${x}</span></label>`).join("");

$("ofUst").innerHTML = fa("ofTarih", "Form tarihi", "date") + fa("ofFirma", "Firma") +
  `<div class="form-floating select-wrapper"><select id="ofSehir"><option value="" disabled selected></option><option value="belirsiz">Belirsiz</option></select><label for="ofSehir">Şehir</label></div>` +
  fa("ofYetkili", "Yetkili") + fa("ofGsm", "Gsm", "tel") + fa("ofAdres", "Adres", "text", "tam");

$("ofCihaz").innerHTML = chipler(CIHAZ, "cihaz");

$("ofCihazAlan").innerHTML = fa("ofMarka", "Marka / model") + fa("ofKapasite", "Kazan kapasitesi") + fa("ofSeri", "Kazan seri numarası") + fa("ofProje", "Proje numarası");

$("ofServis").innerHTML = chipler(SERVIS, "servis");

$("ofServisAlan").innerHTML = fa("ofBasla", "Başlama saati", "time") + fa("ofBitis", "Bitiş saati", "time") + fa("ofGidis", "Gidiş km", "number") + fa("ofDonus", "Dönüş km", "number");

$("ofPersonel").innerHTML = [1,2,3,4,5,6].map(i => fa("ofP" + i, i + ". personel")).join("");
