import { $ } from "../lib/dom.js";

/* ===== PWA: uygulama olarak yükleme + çevrimdışı önbellek ===== */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  /* Yeni sürüm indirilince kullanıcıya sorulur; onaylarsa yeni service worker devreye girer ve sayfa yenilenir */
  const yeniSurumVar = sw => {
    if (document.getElementById("surumBildirimi")) return;
    const k = document.createElement("div"); k.id = "surumBildirimi"; k.setAttribute("role", "status");
    k.innerHTML = '<span>Uygulamanın yeni sürümü hazır.</span><button type="button" class="btn btn-primary">Yenile</button>';
    k.querySelector("button").addEventListener("click", () => { sw.postMessage("guncelle"); k.remove(); });
    document.body.appendChild(k);
  };
  let yenilendi = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!yenilendi) { yenilendi = true; location.reload(); } });
  const kaydet = () => navigator.serviceWorker.register("sw.js").then(kayit => {
    if (kayit.waiting && navigator.serviceWorker.controller) yeniSurumVar(kayit.waiting);
    kayit.addEventListener("updatefound", () => {
      const yeni = kayit.installing; if (!yeni) return;
      yeni.addEventListener("statechange", () => { if (yeni.state === "installed" && navigator.serviceWorker.controller) yeniSurumVar(yeni); });
    });
    // Uygulama uzun süre açık kalıyorsa (saha tableti) saatte bir güncelleme kontrolü
    setInterval(() => kayit.update().catch(() => { }), 60 * 60 * 1000);
  }).catch(e => console.warn("Service worker kaydedilemedi:", e));
  if (document.readyState === "complete") kaydet(); else window.addEventListener("load", kaydet);
}

let kurulumOlayi = null;

window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); kurulumOlayi = e; $("btnYukle").style.display = "block"; });

window.addEventListener("appinstalled", () => { kurulumOlayi = null; $("btnYukle").style.display = "none"; });

$("btnYukle").addEventListener("click", async () => {
  if (!kurulumOlayi) return;
  kurulumOlayi.prompt(); await kurulumOlayi.userChoice.catch(() => { }); kurulumOlayi = null; $("btnYukle").style.display = "none";
});
