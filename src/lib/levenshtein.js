/* İki metin arasındaki düzenleme uzaklığı (benzer firma adı uyarısı için). */
export const levenshtein = (a, b) => {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let onceki = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const simdiki = [i];
    for (let j = 1; j <= n; j++) simdiki[j] = Math.min(onceki[j] + 1, simdiki[j - 1] + 1, onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    onceki = simdiki;
  }
  return onceki[n];
};
