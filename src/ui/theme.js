import { $ } from "../lib/dom.js";

let isDark = localStorage.getItem("theme") === "dark";

if (isDark) document.documentElement.setAttribute("data-theme", "dark");

$("btnTheme").addEventListener("click", () => {
  isDark = !isDark;
  if (isDark) document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
