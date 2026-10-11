import { $ } from "../lib/dom.js";

window.sekmeyiDegistir = function (ad, nav) {
  if (ad === "ekle" && !$("tab-ekle").classList.contains("active")) ekleModu(null);
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  $("tab-" + ad).classList.add("active");
  if (nav) nav.classList.add("active");
};
