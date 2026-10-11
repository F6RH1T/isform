import { $ } from "../lib/dom.js";

/* ===== PWA: uygulama olarak yükleme + çevrimdışı önbellek ===== */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  const kaydet = () => navigator.serviceWorker.register("sw.js").catch(e => console.warn("Service worker kaydedilemedi:", e));
  if (document.readyState === "complete") kaydet(); else window.addEventListener("load", kaydet);
}

let kurulumOlayi = null;

window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); kurulumOlayi = e; $("btnYukle").style.display = "block"; });

window.addEventListener("appinstalled", () => { kurulumOlayi = null; $("btnYukle").style.display = "none"; });

$("btnYukle").addEventListener("click", async () => {
  if (!kurulumOlayi) return;
  kurulumOlayi.prompt(); await kurulumOlayi.userChoice.catch(() => { }); kurulumOlayi = null; $("btnYukle").style.display = "none";
});
