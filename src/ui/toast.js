import { htmlGuvenli } from "../lib/text.js";
import { $ } from "../lib/dom.js";
import { ikon } from "../lib/ikon.js";

window.showToast = function (msg, type = "info") {
  if (type === "success" && window.aramaOnbellek) window.aramaOnbellek.clear();
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.innerHTML = `<span class="toast-ik">${ikon(type === "success" ? "check" : type === "error" ? "alert" : "info", 16)}</span><span>${htmlGuvenli(msg)}</span>`;
  $("toast-container").appendChild(t);
  if (type === "error") t.setAttribute("role", "alert");
  t.addEventListener("click", () => t.remove());
  setTimeout(() => t.remove(), type === "error" ? 6000 : 3000);   // hata mesajları okunabilsin diye daha uzun
};
