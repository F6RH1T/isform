import { htmlGuvenli } from "../lib/text.js";
import { $ } from "../lib/dom.js";

window.showToast = function (msg, type = "info") {
  if (type === "success" && window.aramaOnbellek) window.aramaOnbellek.clear();
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.innerHTML = `<span>${type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}</span><span>${htmlGuvenli(msg)}</span>`;
  $("toast-container").appendChild(t);
  if (type === "error") t.setAttribute("role", "alert");
  t.addEventListener("click", () => t.remove());
  setTimeout(() => t.remove(), type === "error" ? 6000 : 3000);   // hata mesajları okunabilsin diye daha uzun
};
