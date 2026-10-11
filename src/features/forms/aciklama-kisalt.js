/* Uzun form açıklamalarını 3 satıra kısaltır; "Devamını oku" ile tamamı açılır.
   Açıklama kutusu nerede oluşursa (arama, firma grubu, AI) otomatik çalışır. */
const SELEKTOR = ".aciklama-kutusu";

// Kutu ekranda görününce (gizli firma grupları açılınca da) taşıp taşmadığına bakar
const gozcu = "IntersectionObserver" in window
  ? new IntersectionObserver(kayitlar => kayitlar.forEach(k => {
      if (k.isIntersecting) { gozcu.unobserve(k.target); olc(k.target); }
    }))
  : null;

function olc(kutu) {
  if (!kutu.isConnected || kutu.nextElementSibling?.classList.contains("aciklama-devam")) return;
  if (kutu.scrollHeight <= kutu.clientHeight + 1) { kutu.classList.remove("kisalt"); return; }   // zaten kısa
  const b = document.createElement("button");
  b.type = "button"; b.className = "aciklama-devam"; b.textContent = "Devamını oku";
  b.setAttribute("aria-expanded", "false");
  kutu.insertAdjacentElement("afterend", b);
}

function hazirla(kutu) {
  if (kutu.dataset.kisa) return;
  kutu.dataset.kisa = "1";
  kutu.classList.add("kisalt");        // önce kısalt, sonra ölç (görüntü zıplamasın)
  if (gozcu) gozcu.observe(kutu); else olc(kutu);
}

function tara(kok) {
  if (kok.nodeType !== 1) return;
  if (kok.matches(SELEKTOR)) hazirla(kok);
  kok.querySelectorAll(SELEKTOR).forEach(hazirla);
}

document.addEventListener("click", e => {
  const b = e.target.closest(".aciklama-devam");
  if (!b) return;
  e.stopPropagation();
  const kutu = b.previousElementSibling;
  const acik = kutu.classList.toggle("kisalt") === false;
  b.textContent = acik ? "Daha az göster" : "Devamını oku";
  b.setAttribute("aria-expanded", String(acik));
});

new MutationObserver(ler => ler.forEach(l => l.addedNodes.forEach(tara))).observe(document.body, { childList: true, subtree: true });
tara(document.body);
