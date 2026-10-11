import { $ } from "../lib/dom.js";

/* Üst bar ⋯ menüsü: aç/kapat, dışarı tıklayınca ve Esc ile kapanır */
const dugme = $("btnMenu"), menu = $("ustMenu");
const kapat = () => { menu.hidden = true; dugme.setAttribute("aria-expanded", "false"); };
dugme.addEventListener("click", e => { e.stopPropagation(); menu.hidden = !menu.hidden; dugme.setAttribute("aria-expanded", String(!menu.hidden)); });
document.addEventListener("click", e => { if (!menu.hidden && !menu.contains(e.target)) kapat(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") kapat(); });
menu.addEventListener("click", e => { if (e.target.closest("button")) setTimeout(kapat, 0); });
