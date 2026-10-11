import { doc, getDoc } from "firebase/firestore";
import { $ } from "../../lib/dom.js";
import { db } from "../../firebase/init.js";

window.resmiAc = async function (docId, fotoId) {
  $("modalLoading").style.display = "block";
  $("modalImage").style.display = "none";
  $("zoomSahne").style.display = "none";
  $("imgZoomKutu").style.display = "none";
  $("imgZoomIpucu").style.display = "none";
  if (window.imgZoomSifirla) window.imgZoomSifirla();
  $("downloadLink").style.display = "none";
  $("imageModal").style.display = "flex";
  try {
    const fDoc = fotoId ? await getDoc(doc(db, "formFotograflari", fotoId)) : await getDoc(doc(db, "formlar", docId));
    const src = fDoc.exists() ? (fotoId ? fDoc.data().base64 : fDoc.data().fotograf) : null;
    if (src) { $("modalImage").src = src; $("downloadLink").href = src; }
    $("modalLoading").style.display = "none";
    $("modalImage").style.display = "block";
    $("zoomSahne").style.display = "block";
    $("imgZoomKutu").style.display = "flex";
    $("imgZoomIpucu").style.display = "block";
    $("downloadLink").style.display = "block";
  } catch (e) { showToast("Fotoğraf alınamadı.", "error"); window.modaliKapat(); }
};

window.modaliKapat = () => { $("imageModal").style.display = "none"; $("modalImage").src = ""; if (window.imgZoomSifirla) window.imgZoomSifirla(); };
