export const getLocation = () => new Promise(resolve => {
  if (!navigator.geolocation) { showToast("Tarayıcı GPS desteklemiyor", "error"); resolve(null); return; }
  navigator.geolocation.getCurrentPosition(
    p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
    err => { console.warn("GPS hatası:", err); resolve(null); },
    { timeout: 7000, enableHighAccuracy: true }
  );
});
