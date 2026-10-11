import { $ } from "../../lib/dom.js";
import { tarihiInputaCevir } from "../../lib/dates.js";
import { imzaKur } from "./imza.js";

window.ekleModu = m => {
  $("ekleSecim").style.display = m ? "none" : "";
  $("kartTara").style.display = m === "tara" ? "" : "none";
  $("kartOlustur").style.display = m === "olustur" ? "" : "none";
  if (m === "olustur" && !$("ofTarih").value) $("ofTarih").value = tarihiInputaCevir();
  if (m === "olustur") imzaKur();
};
