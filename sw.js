/* ENORPA İş Formları - service worker
   Uygulama kabuğunu önbelleğe alır; Firestore, Auth ve Gemini istekleri her zaman doğrudan ağa gider. */
const SURUM = "enorpa-v2";
const TEMEL = ["./", "manifest.webmanifest","logo-enorpa.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "logo.png"];
const STATIK = /(^|\.)gstatic\.com$|^fonts\.googleapis\.com$|^cdnjs\.cloudflare\.com$|^cdn\.jsdelivr\.net$/;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SURUM)
    .then(c => Promise.all(TEMEL.map(u => c.add(u).catch(() => { }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== SURUM).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const ayni = u.origin === location.origin;
  if (!ayni && !STATIK.test(u.hostname)) return;

  // Sayfanın kendisi: önce ağ (yeni sürüm hemen gelsin), ağ yoksa ya da yavaşsa önbellek
  if (r.mode === "navigate" || (ayni && r.destination === "document")) {
    e.respondWith((async () => {
      const c = await caches.open(SURUM);
      try {
        const ag = await Promise.race([
          fetch(r),
          new Promise((_, red) => setTimeout(() => red(new Error("zaman aşımı")), 5000))
        ]);
        if (ag && ag.ok) c.put(r, ag.clone());
        return ag;
      } catch (err) {
        return (await c.match(r)) || (await c.match("./")) || Response.error();
      }
    })());
    return;
  }

  // Diğer dosyalar (ikon, Firebase SDK, yazı tipi): önce önbellek, arkada yenile
  e.respondWith((async () => {
    const c = await caches.open(SURUM);
    const eski = await c.match(r);
    const ag = fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(() => null);
    return eski || (await ag) || Response.error();
  })());
});
