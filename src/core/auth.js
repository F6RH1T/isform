import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { state } from "./state.js";
import { auth, db } from "../firebase/init.js";
import { $ } from "../lib/dom.js";
import { tarihiInputaCevir } from "../lib/dates.js";
import { duzenleyebilirMi, yoneticiMi } from "./session.js";

onAuthStateChanged(auth, user => {
  if (user) {
    state.aktifKullaniciMail = (user.email || "").toLowerCase();
    state.rolHazir = (async () => {
      const onbellekAnahtari = "rol_" + state.aktifKullaniciMail;
      try {
        const sn = await getDoc(doc(db, "kullanicilar", state.aktifKullaniciMail));
        const v = sn.exists() ? sn.data() : null;
        if (!v || v.aktif !== true || !["yonetici", "duzenleyen", "goruntuleyen"].includes(v.rol)) { localStorage.removeItem(onbellekAnahtari); state.aktifRol = ""; return false; }
        state.aktifRol = v.rol; localStorage.setItem(onbellekAnahtari, v.rol); return true;
      } catch (e) {
        console.warn("Rol okunamadı:", e.code || e);
        if (e.code === "permission-denied") { localStorage.removeItem(onbellekAnahtari); state.aktifRol = ""; return false; }
        const eski = localStorage.getItem(onbellekAnahtari);   // internet yoksa son bilinen rol
        if (eski) { state.aktifRol = eski; return true; }
        state.aktifRol = ""; return false;
      }
    })();
    state.rolHazir.then(ok => {
      if (!ok) { showToast("Hesabınız yetkilendirilmemiş. Lütfen yöneticiyle görüşün.", "error"); signOut(auth); return; }
      $("loginScreen").style.display = "none";
      $("mainApp").style.display = "block";
      if (!$("formTarihi").value) $("formTarihi").value = tarihiInputaCevir();
      showToast("Giriş başarılı, hoş geldin!", "success");
      $("btnOptimize").style.display = yoneticiMi() ? "block" : "none";
      $("btnKullanicilar").style.display = yoneticiMi() ? "block" : "none";
      const navlar = document.querySelectorAll(".nav-item");
      if (navlar[0]) navlar[0].style.display = duzenleyebilirMi() ? "" : "none";   // görüntüleyen form ekleyemez
      if (!duzenleyebilirMi() && navlar[1]) sekmeyiDegistir("ara", navlar[1]);
    });
  } else {
    state.aktifKullaniciMail = ""; state.aktifRol = ""; state.rolHazir = Promise.resolve(false);
    $("loginScreen").style.display = "flex";
    $("mainApp").style.display = "none";
  }
});

$("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const btn = $("loginBtn");
  btn.innerText = "Bekleyin…"; btn.disabled = true;
  $("loginError").style.display = "none";
  signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value)
    .catch(err => {
      console.error("Giriş hatası:", err.code, err.message);
      const kod = err.code || "";
      const dogruMu = ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(kod);
      $("loginError").textContent = dogruMu
        ? "Giriş başarısız. E-posta ve şifreyi kontrol edin."
        : "Giriş yapılamadı (" + (kod || "bilinmeyen hata") + "). Bu hata e-posta/şifreden değil, ayarlardan olabilir.";
      $("loginError").style.display = "block";
    })
    .finally(() => { btn.innerText = "Giriş yap"; btn.disabled = false; });
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

$("forgotPasswordLink").addEventListener("click", (e) => {
    e.preventDefault();
    $("resetPasswordModal").style.display = "flex";
});

$("btnResetCancel").addEventListener("click", () => {
    $("resetPasswordModal").style.display = "none";
    $("resetEmail").value = "";
});

$("btnResetSend").addEventListener("click", () => {
    const email = $("resetEmail").value.trim();
    if(!email) { showToast("Lütfen e-posta adresinizi girin.", "error"); return; }
    const btn = $("btnResetSend");
    btn.innerText = "⏳..."; btn.disabled = true;

    sendPasswordResetEmail(auth, email)
    /* Hesabın var olup olmadığı belli edilmez (e-posta taraması yapılamasın): bulunamasa da aynı mesaj gösterilir */
    .catch(error => {
        if (error.code === "auth/user-not-found") return;
        if (error.code === "auth/invalid-email") { showToast("E-posta adresi geçersiz.", "error"); throw error; }
        if (error.code === "auth/too-many-requests") { showToast("Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.", "error"); throw error; }
        console.error("Şifre sıfırlama:", error.code); showToast("Gönderilemedi, bağlantınızı kontrol edip tekrar deneyin.", "error"); throw error;
    })
    .then(() => {
        showToast("Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi.", "success");
        $("resetPasswordModal").style.display = "none";
        $("resetEmail").value = "";
    })
    .catch(() => { })
    .finally(() => { btn.innerText = "Gönder"; btn.disabled = false; });
});
