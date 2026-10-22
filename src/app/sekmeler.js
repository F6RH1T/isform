import { $ } from "../lib/dom.js";

window.sekmeyiDegistir = function (ad, nav) {
  if (ad === "ekle" && !$("tab-ekle").classList.contains("active")) ekleModu(null);
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => { n.classList.remove("active"); n.removeAttribute("aria-current"); });
  $("tab-" + ad).classList.add("active");
  if (nav) { nav.classList.add("active"); nav.setAttribute("aria-current", "page"); }
};

/* Alt menü: kayan turuncu hap */
{
  const nav = document.querySelector(".bottom-nav"), pill = document.querySelector(".nav-pill");
  let hazir = false;
  const konumla = () => {
    const a = nav.querySelector(".nav-item.active"); if (!a || !a.offsetWidth) return;
    const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
    pill.style.width = r.width + "px"; pill.style.height = r.height + "px";
    pill.style.transform = `translate(${r.left - n.left - nav.clientLeft}px,${r.top - n.top - nav.clientTop}px)`;
    if (!hazir) requestAnimationFrame(() => { hazir = true; pill.classList.add("hazir"); });
  };
  const eski = window.sekmeyiDegistir;
  window.sekmeyiDegistir = function (...a) { eski.apply(this, a); konumla(); };
  new ResizeObserver(konumla).observe(nav);
  window.addEventListener("resize", konumla);
  konumla();
}
