import { $ } from "../lib/dom.js";
import { ayEkle, inputtanIsoYap, tarihiInputaCevir } from "../lib/dates.js";

/* Tarih alanlarının altına tek dokunuşluk kısayollar: form tarihi için Bugün / Dün,
   sonraki bakım için form tarihinden 6 ay / 1 yıl sonrası. Telefonun tarih seçicisini açmaya gerek kalmaz. */
const gun = n => { const d = new Date(); d.setDate(d.getDate() + n); return tarihiInputaCevir(d); };
const bazdan = (bazId, ay) => () => tarihiInputaCevir(ayEkle(inputtanIsoYap($(bazId).value || tarihiInputaCevir()), ay));

function cipleriKur(id, secenekler) {
  const girdi = $(id); if (!girdi) return;
  const alan = girdi.closest(".form-floating") || girdi;
  const satir = document.createElement("div");
  satir.className = "tarih-cipleri"; satir.setAttribute("role", "group"); satir.setAttribute("aria-label", "Tarih kısayolları");
  secenekler.forEach(([ad, deger]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tarih-cip"; b.textContent = ad;
    b.addEventListener("click", () => {
      girdi.value = deger();
      girdi.dispatchEvent(new Event("input", { bubbles: true })); girdi.dispatchEvent(new Event("change", { bubbles: true }));
      isaretle();
    });
    satir.appendChild(b);
  });
  const isaretle = () => satir.querySelectorAll(".tarih-cip").forEach((b, i) => b.classList.toggle("secili", girdi.value === secenekler[i][1]()));
  girdi.addEventListener("input", isaretle); girdi.addEventListener("change", isaretle);
  girdi.closest("form")?.addEventListener("reset", () => setTimeout(isaretle, 0));
  alan.classList.add("cipli"); alan.appendChild(satir);   // alanın içinde: iki sütunlu form ızgarası bozulmaz
  setTimeout(isaretle, 0);
  return isaretle;
}

const BUGUN_DUN = [["Bugün", () => gun(0)], ["Dün", () => gun(-1)], ["2 gün önce", () => gun(-2)]];
const yenile = [
  cipleriKur("formTarihi", BUGUN_DUN),
  cipleriKur("ofTarih", BUGUN_DUN),
  cipleriKur("editTarih", BUGUN_DUN),
  cipleriKur("bakimTarihi", [["6 ay sonra", bazdan("formTarihi", 6)], ["1 yıl sonra", bazdan("formTarihi", 12)]]),
  cipleriKur("editBakim", [["6 ay sonra", bazdan("editTarih", 6)], ["1 yıl sonra", bazdan("editTarih", 12)]])
].filter(Boolean);
/* Alanlar koddan doldurulduğunda (düzenle, kopyala, bakım yapıldı) seçili çip güncellensin */
document.addEventListener("click", () => setTimeout(() => yenile.forEach(f => f()), 0), true);
