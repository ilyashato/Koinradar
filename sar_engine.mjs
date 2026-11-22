// SAR Radar motoru — ULUDAĞ SAR, Linear TSI ve BIST LRC KESISME TARAMA Pine kodlarının birebir JS karşılığı.
// Girdi: günlük mumlar {t[],o[],h[],l[],c[],v[]} (t = ms). Çıktı: sayfanın okuduğu sade "kart" nesnesi.
// Pine'daki request.security (lookahead kapalı) gibi: üst zaman dilimi değeri = o dönemin (kapanmamış olabilir) son barı.

/* ---------------- temel göstergeler ---------------- */

// Pine ta.sar — TradingView belgelerindeki pine_sar fonksiyonunun birebir kopyası.
// Ek olarak son barın iç durumunu döndürür: kapanışta oluşacak bir sonraki noktayı tahmin etmek için.
export function psar(h, l, c, start, inc, max) {
  const n = c.length, out = new Array(n).fill(null);
  let result = NaN, maxMin = NaN, acc = NaN, isBelow = null;
  for (let i = 1; i < n; i++) {
    let first = false;
    if (i === 1) {
      if (c[1] > c[0]) { isBelow = true; maxMin = h[1]; result = l[0]; }
      else { isBelow = false; maxMin = l[1]; result = h[0]; }
      first = true; acc = start;
    }
    result = result + acc * (maxMin - result);
    if (isBelow) {
      if (result > l[i]) { first = true; isBelow = false; result = Math.max(h[i], maxMin); maxMin = l[i]; acc = start; }
    } else {
      if (result < h[i]) { first = true; isBelow = true; result = Math.min(l[i], maxMin); maxMin = h[i]; acc = start; }
    }
    if (!first) {
      if (isBelow) { if (h[i] > maxMin) { maxMin = h[i]; acc = Math.min(acc + inc, max); } }
      else { if (l[i] < maxMin) { maxMin = l[i]; acc = Math.min(acc + inc, max); } }
    }
    if (isBelow) { result = Math.min(result, l[i - 1]); if (i > 1) result = Math.min(result, l[i - 2]); }
    else { result = Math.max(result, h[i - 1]); if (i > 1) result = Math.max(result, h[i - 2]); }
    out[i] = result;
  }
  // Bir sonraki bar için önceden belli olan nokta (yeni bar dönüş yapmazsa)
  let next = null;
  if (n >= 3 && isFinite(result)) {
    next = result + acc * (maxMin - result);
    next = isBelow ? Math.min(next, l[n - 1], l[n - 2]) : Math.max(next, h[n - 1], h[n - 2]);
  }
  return { s: out, next, acc, ep: maxMin, below: isBelow };
}

// LUCID SAR — Pine kodundaki fonksiyonun birebir karşılığı (ters dönüş sonrası "reversal_state" dalı Pine'da da çalışmıyor).
export function lucid(h, l, AFi = 0.02, AFinc = 0.02, AFmax = 0.2) {
  const n = h.length, S = new Array(n), EPa = new Array(n), AFa = new Array(n), UP = new Array(n), NT = new Array(n);
  for (let i = 0; i < n; i++) {
    let up = true, nt = false, EP = h[i], SAR = l[i], AF = AFi;
    if (i >= 1) {
      EP = UP[i - 1] ? Math.max(h[i], EPa[i - 1]) : Math.min(l[i], EPa[i - 1]);
      if (NT[i - 1]) AF = AFi; else AF = EP !== EPa[i - 1] ? Math.min(AFmax, AFa[i - 1] + AFinc) : AFa[i - 1];
      SAR = S[i - 1] + AF * (EP - S[i - 1]);
      if (UP[i - 1]) {
        SAR = Math.min(SAR, l[i - 1]); if (i >= 2) SAR = Math.min(SAR, l[i - 2]);
        if (SAR > l[i]) { up = false; nt = true; SAR = Math.max(h[i], EPa[i - 1]); EP = Math.min(l[i], l[i - 1]); }
        else { up = true; nt = false; }
      } else {
        SAR = Math.max(SAR, h[i - 1]); if (i >= 2) SAR = Math.max(SAR, h[i - 2]);
        if (SAR < h[i]) { up = true; nt = true; SAR = Math.min(l[i], EPa[i - 1]); EP = Math.max(h[i], h[i - 1]); }
        else { up = false; nt = false; }
      }
    }
    S[i] = SAR; EPa[i] = EP; AFa[i] = AF; UP[i] = up; NT[i] = nt;
  }
  return { s: S.map((v, i) => (i === 0 ? null : v)), next: null };
}

export function ema(src, len) {
  const a = 2 / (len + 1), out = new Array(src.length).fill(null); let s = null;
  for (let i = 0; i < src.length; i++) { const x = src[i]; if (x == null || !isFinite(x)) { out[i] = s; continue; } s = s == null ? x : a * x + (1 - a) * s; out[i] = s; }
  return out;
}

// ta.linreg(src, len, offset) — son len değere en küçük kareler doğrusu; i barındaki değeri
export function linregAt(src, len, i, offset = 0) {
  if (i - len + 1 < 0) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let k = 0; k < len; k++) { const y = src[i - len + 1 + k]; if (y == null) return null; sx += k; sy += y; sxx += k * k; sxy += k * y; }
  const slope = (len * sxy - sx * sy) / (len * sxx - sx * sx), icpt = (sy - slope * sx) / len;
  return icpt + slope * (len - 1 - offset);
}
// ta.dev — ortalama mutlak sapma
export function devAt(src, len, i) {
  if (i - len + 1 < 0) return null;
  let m = 0; for (let k = i - len + 1; k <= i; k++) m += src[k]; m /= len;
  let d = 0; for (let k = i - len + 1; k <= i; k++) d += Math.abs(src[k] - m); return d / len;
}


// BIST bedelsiz/bölünme düzeltmesi: günlük fiyat limiti ±%10 olduğu için kapanıştan sonraki açılışta
// %25'ten büyük düşüş ya da %35'ten büyük sıçrama şirket işlemidir; önceki tüm barlar o oranla ölçeklenir.
export function adjustSplits(d) {
  const n = d.c.length; let f = 1; const o = { t: d.t.slice(), o: [], h: [], l: [], c: [], v: d.v ? d.v.slice() : [] };
  const fac = new Array(n).fill(1);
  for (let i = n - 1; i > 0; i--) { fac[i] = f; const r = d.o[i] / d.c[i - 1]; if (r < 0.75 || r > 1.35) f *= r; }
  fac[0] = f;
  for (let i = 0; i < n; i++) { o.o.push(d.o[i] * fac[i]); o.h.push(d.h[i] * fac[i]); o.l.push(d.l[i] * fac[i]); o.c.push(d.c[i] * fac[i]); }
  return o;
}

/* ---------------- zaman dilimleri ---------------- */
// Günlük barları takvim dönemlerine toplar (TradingView gibi: hafta pazartesi, 3A ocak-nisan-temmuz-ekim, 6A ocak-temmuz, 12A ocak).
export function resample(d, tf, tz = 0) {
  if (tf === 'G') return d;
  const key = t => {
    const x = new Date(t + tz * 3600e3), y = x.getUTCFullYear(), m = x.getUTCMonth();
    if (tf === 'H') { const day = (x.getUTCDay() + 6) % 7; return Math.floor((Date.UTC(y, m, x.getUTCDate()) - day * 864e5) / 864e5); }
    if (tf === 'A') return y * 12 + m;
    if (tf === '3A') return y * 4 + Math.floor(m / 3);
    if (tf === '6A') return y * 2 + Math.floor(m / 6);
    if (tf === '12A') return y;
  };
  const o = { t: [], o: [], h: [], l: [], c: [], v: [] }; let last = null;
  for (let i = 0; i < d.t.length; i++) {
    const k = key(d.t[i]);
    if (k !== last) { o.t.push(d.t[i]); o.o.push(d.o[i]); o.h.push(d.h[i]); o.l.push(d.l[i]); o.c.push(d.c[i]); o.v.push(d.v ? d.v[i] || 0 : 0); last = k; }
    else { const j = o.t.length - 1; o.h[j] = Math.max(o.h[j], d.h[i]); o.l[j] = Math.min(o.l[j], d.l[i]); o.c[j] = d.c[i]; o.v[j] += d.v ? d.v[i] || 0 : 0; }
  }
  return o;
}

/* ---------------- SAR seti ---------------- */
export const SAR_NAMES = { psar: 'Parabolic', lin: 'Linear', luc: 'Lucid', slow: 'Triple Slow', mod: 'Triple Moderate', fast: 'Triple Fast', ort: 'SAR Ort.' };
export function sarSet(b) {
  const { h, l, c } = b;
  const r = {
    psar: psar(h, l, c, 0.02, 0.02, 0.2),
    lin: psar(h, l, c, 0.02, 0.01, 0.1),      // Linear Up/Down aynı seri, sadece renk farkı
    luc: lucid(h, l, 0.02, 0.02, 0.2),
    slow: psar(h, l, c, 0.01, 0.01, 0.2),
    mod: psar(h, l, c, 0.01, 0.02, 0.2),
    fast: psar(h, l, c, 0.01, 0.03, 0.2),
  };
  const ort = r.lin.s.map((v, i) => (v == null || r.psar.s[i] == null || r.luc.s[i] == null ? null : (v + r.psar.s[i] + r.luc.s[i]) / 3));
  r.ort = { s: ort, next: null };
  return r;
}

const eq = (a, b) => a != null && b != null && Math.abs(a - b) <= Math.abs(b) * 1e-9;
const rnd = (x, p = 4) => (x == null || !isFinite(x) ? null : +(+x).toPrecision(p + 2));

// Tek bir SAR serisinin son bar durumu
// Çekim: Parabolic SAR her bar fiyata AF × (uç nokta − SAR) kadar yaklaşır. Fiyat yatay kalırsa (son barın aralığı)
// SAR'ın fiyata kaç barda değeceği kapalı formülle hesaplanır: kalan mesafe her bar (1 − AF) ile küçülür.
export function etaOf(st, v, b) {
  if (!st || st.acc == null || st.ep == null || !isFinite(v)) return null;
  const i = b.c.length - 1, a = st.acc; if (a <= 0 || a >= 1) return null;
  if (v < b.c[i]) { const g0 = st.ep - v, need = st.ep - b.l[i]; if (g0 <= 0) return null; if (need <= 0) return 0; if (need >= g0) return 0; return Math.ceil(Math.log(need / g0) / Math.log(1 - a)); }
  const g0 = v - st.ep, need = b.h[i] - st.ep; if (g0 <= 0) return null; if (need <= 0) return 0; if (need >= g0) return 0; return Math.ceil(Math.log(need / g0) / Math.log(1 - a));
}
function sarState(s, b, nextVal, st) {
  const n = b.c.length, i = n - 1;
  if (n < 4 || s[i] == null || s[i - 1] == null) return null;
  const v = s[i], side = v < b.c[i] ? 'alt' : 'ust';
  const sideAt = k => (s[k] == null ? null : s[k] < b.c[k] ? 'alt' : 'ust');
  // yaş: son dönüşten beri bar sayısı
  let age = 0; for (let k = i; k > 0 && sideAt(k - 1) === side; k--) age++;
  // yana atma: değer önceki barla aynı (Pine: SAR == SAR[1]); kaç bardır sabit
  let flat = 0; for (let k = i; k > 0 && eq(s[k], s[k - 1]); k--) flat++;
  // son 2 bar içinde yana attı mı (Pine tablosu: barssince < 2)
  const flatRecent = eq(s[i], s[i - 1]) || eq(s[i - 1], s[i - 2]);
  const flipped = sideAt(i - 1) != null && sideAt(i - 1) !== side; // bu bar temas edip taraf değiştirdi
  // TEK SAR (Pine koşulu): SAR[1] > close[1] ve high > SAR[1] ve SAR < close ve SAR[2] < close[2]
  const tekAt = k => k >= 2 && s[k - 1] != null && s[k - 2] != null && s[k - 1] > b.c[k - 1] && b.h[k] > s[k - 1] && s[k] < b.c[k] && s[k - 2] < b.c[k - 2];
  const tek = tekAt(i) || tekAt(i - 1);
  // iğne: bar içinde SAR'a %1'den yakın geldi ama aşmadı
  const near = side === 'alt' ? (b.l[i] - v) / v : (v - b.h[i]) / v;
  const igne = !flipped && near >= 0 && near <= 0.01;
  // İğneli temas (Hoca): destek SAR'ına bar içinde temas edildi ama kapanış SAR'ın üstünde kaldı → tepki uzun sürer, aynı yere dönülmez
  const igneli = flipped && side === 'ust' && s[i - 1] != null && b.c[i] > s[i - 1];
  const igneliD = flipped && side === 'alt' && s[i - 1] != null && b.c[i] < s[i - 1];
  const eta = st && st.below != null && (st.below === (side === 'alt')) ? etaOf(st, v, b) : null;
  return { v: rnd(v), side, dist: rnd((v / b.c[i] - 1) * 100, 2), age, flat, flatRecent, flipped, tek, igne, igneli, igneliD, prev: rnd(s[i - 1]), next: rnd(nextVal), eta, af: st && st.acc != null ? +st.acc.toFixed(3) : null };
}

/* ---------------- LRC kanal ve kesişme ---------------- */
// BIST LRC KESISME TARAMA: orta üst = linreg(high,300), orta alt = linreg(low,300); kanal = orta ± ta.dev
// crossunder(orta üst, orta alt) = YEŞİL; crossover = TURUNCU.
export function lrc(b, len = 300, look = 160) {
  const n = b.c.length; if (n < len + 2) return { yok: true, bars: n, gerek: len };
  const from = Math.max(len, n - look), mh = [], ml = [], idx = [];
  for (let i = from - 1; i < n; i++) { idx.push(i); mh.push(linregAt(b.h, len, i)); ml.push(linregAt(b.l, len, i)); }
  const ev = [];
  for (let k = 1; k < idx.length; k++) {
    const i = idx[k];
    if (mh[k - 1] >= ml[k - 1] && mh[k] < ml[k]) ev.push({ tip: 'yesil', ago: n - 1 - i, px: rnd(b.c[i]), i });
    else if (mh[k - 1] <= ml[k - 1] && mh[k] > ml[k]) ev.push({ tip: 'turuncu', ago: n - 1 - i, px: rnd(b.c[i]), i });
  }
  // 298 ile sağlama (son 30 bar)
  const ev2 = [];
  for (let i = Math.max(len, n - 30); i < n; i++) {
    const a0 = linregAt(b.h, len - 2, i - 1), b0 = linregAt(b.l, len - 2, i - 1), a1 = linregAt(b.h, len - 2, i), b1 = linregAt(b.l, len - 2, i);
    if (a0 != null && ((a0 >= b0 && a1 < b1) || (a0 <= b0 && a1 > b1))) ev2.push(i);
  }
  ev.forEach(e => { e.teyit = ev2.some(j => Math.abs(j - e.i) <= 3); });
  const i = n - 1, up = mh[mh.length - 1] + devAt(b.h, len, i), lo = ml[ml.length - 1] - devAt(b.l, len, i);
  const mid = (mh[mh.length - 1] + ml[ml.length - 1]) / 2, c = b.c[i];
  const slope = k => (mh.length > k ? (ml[ml.length - 1] - ml[ml.length - 1 - k]) : 0);
  const konum = c < lo ? 'alt' : c > up ? 'ust' : 'ic';
  let hi300 = -Infinity; for (let k = n - len; k < n; k++) hi300 = Math.max(hi300, b.h[k]);
  // son kesişme dizisinin değerlendirmesi
  const recent = ev.filter(e => e.ago <= 120), last = ev[ev.length - 1];
  const yorum = [];
  if (last) {
    const since = (c / b.c[last.i] - 1) * 100;
    if (last.ago <= 20) yorum.push('taze');
    if (since > 20) yorum.push('kacti');
    const prevY = [...ev].reverse().find(e => e.tip === 'yesil' && e.i < last.i);
    if (last.tip === 'turuncu' && prevY) {
      const gap = last.i - prevY.i; let mn = Infinity; for (let k = prevY.i; k <= last.i; k++) mn = Math.min(mn, b.l[k]);
      const dip = (mn / b.c[prevY.i] - 1) * 100;
      if (gap <= 3) yorum.push('arka_arkaya');
      else if (dip <= -5 && slope(5) >= 0) yorum.push('ideal');
      else if (dip > -3 && slope(10) < 0) yorum.push('tehlikeli');
    }
    if (last.tip === 'yesil' && slope(10) < 0 && since > 10) yorum.push('tehlikeli');
  }
  if (recent.filter(e => e.ago <= 60).length >= 4) yorum.push('coklu');
  const yas = n - len; if (yas < 20) yorum.push('yeni_bant');
  return {
    ust: rnd(up), alt: rnd(lo), ortaUst: rnd(mh[mh.length - 1]), ortaAlt: rnd(ml[ml.length - 1]), konum,
    altUzak: rnd((c / lo - 1) * 100, 2), ortaKat: rnd(c / mid, 3), egim: slope(5) >= 0 ? 'yukari' : 'asagi',
    dusus: rnd((c / hi300 - 1) * 100, 2), yas,
    kesisme: ev.slice(-6).map(e => ({ tip: e.tip, ago: e.ago, px: e.px, teyit: e.teyit, fark: rnd((c / e.px - 1) * 100, 2) })),
    yorum,
  };
}

/* ---------------- Linear TSI ---------------- */
// tsi(close, 3, 9) → doğrusal regresyon (10); renk: eğim bir önceki eğimden büyük/eşitse yeşil
export function linTsi(b) {
  const c = b.c, n = c.length; if (n < 40) return null;
  const m = [null], am = [null]; for (let i = 1; i < n; i++) { m.push(c[i] - c[i - 1]); am.push(Math.abs(c[i] - c[i - 1])); }
  const ds = x => ema(ema(x, 9), 3), num = ds(m), den = ds(am);
  const t = num.map((v, i) => (v == null || !den[i] ? null : v / den[i]));
  const slopeAt = i => { const a = linregAt(t, 10, i, 0), b2 = linregAt(t, 10, i, 1); return a == null || b2 == null ? null : a - b2; };
  const col = i => { const s1 = slopeAt(i), s0 = slopeAt(i - 1); return s1 == null || s0 == null ? null : s1 >= s0 ? 'yesil' : 'kirmizi'; };
  const now = col(n - 1); let sure = 0; for (let i = n - 1; i > 20 && col(i) === now; i--) sure++;
  return { renk: now, sure, deger: rnd(t[n - 1], 3), cizgi: rnd(linregAt(t, 10, n - 1), 3) };
}

/* ---------------- Medyan ve ortalama (sistem sahibi kendi hesabını paylaşmıyor; standart hesap) ---------------- */
// Son MEDN kapanışın medyanı ve aritmetik ortalaması. Kural: fiyat medyanın üstünde = olumlu (yeşil), altı = olumsuz/sıkışma;
// medyan ile ortalama arası fark %10'u geçmemeli, geçerse derin düzeltme riski.
export const MEDN = 50;
export function medAt(c, i, N = MEDN) { if (i - N + 1 < 0) return null; const a = c.slice(i - N + 1, i + 1).sort((x, y) => x - y); return N % 2 ? a[(N - 1) / 2] : (a[N / 2 - 1] + a[N / 2]) / 2; }
export function medyan(b, N = MEDN) {
  const c = b.c, n = c.length, i = n - 1; if (n < N + 2) return null;
  const m = medAt(c, i, N), m1 = medAt(c, i - 1, N); let ort = 0; for (let k = n - N; k < n; k++) ort += c[k]; ort /= N;
  let sure = 0; const up = c[i] > m; for (let k = i; k >= N && (c[k] > medAt(c, k, N)) === up; k--) sure++;
  return { v: rnd(m), ort: rnd(ort), fark: rnd((ort / m - 1) * 100, 2), dist: rnd((m / c[i] - 1) * 100, 2), ust: up, sure, yon: m > m1 ? 'yukari' : m < m1 ? 'asagi' : 'sabit' };
}

/* ---------------- bir enstrümanın tam analizi ---------------- */
export function analyze(daily, cfg) {
  const out = { tf: {}, lrc: {}, tsi: {} }, n = daily.c.length, price = daily.c[n - 1];
  for (const tf of cfg.tfs) {
    const b = resample(daily, tf, cfg.tz);
    if (b.c.length < 4) continue;
    const S = sarSet(b), i = b.c.length - 1, row = { bars: b.c.length, s: {} };
    for (const k of Object.keys(S)) { const st = sarState(S[k].s, b, S[k].next, S[k]); if (st) row.s[k] = st; }
    // SAR birleşmesi (Pine): Parabolic == Moderate == Fast (son 2 bar)
    const bir = k => eq(S.psar.s[k], S.mod.s[k]) && eq(S.psar.s[k], S.fast.s[k]);
    row.birlesme = bir(i) || bir(i - 1);
    const e5 = ema(b.c, 5), e21 = ema(b.c, 21);
    row.ema5 = rnd(e5[i]); row.ema21 = rnd(e21[i]); row.ust5 = b.c[i] > e5[i]; row.ust21 = b.c[i] > e21[i];
    out.tf[tf] = row;
  }
  for (const tf of cfg.lrcTfs) out.lrc[tf] = lrc(resample(daily, tf, cfg.tz));
  for (const tf of cfg.tsiTfs) { const b = resample(daily, tf, cfg.tz); out.tsi[tf] = linTsi(b); }
  // günlük EMA21 (aylık SAR tepki taraması için)
  out.med = {}; for (const tf of ['G', 'H', 'A']) { const b = resample(daily, tf, cfg.tz); out.med[tf] = medyan(b); }
  const e21d = ema(daily.c, 21); out.ema21g = rnd(e21d[n - 1]);
  out.price = rnd(price); out.chg = n > 1 ? rnd((price / daily.c[n - 2] - 1) * 100, 2) : null; out.t = daily.t[n - 1];
  return out;
}

/* ---------------- Makro: enstrüman listesi ve türetilmiş seriler ---------------- */
// y: Yahoo sembolü; f: türetilmiş seri [işlem, A, B, çarpan] (A/B başka maddelerin anahtarı ya da Yahoo sembolü)
export const MAKRO = [
  ['ALTIN', 'Altın (ons, $)', 'maden', { y: 'GC=F' }], ['GUMUS', 'Gümüş (ons, $)', 'maden', { y: 'SI=F' }],
  ['PLATIN', 'Platin (ons, $)', 'maden', { y: 'PL=F' }], ['PALADYUM', 'Paladyum (ons, $)', 'maden', { y: 'PA=F' }],
  ['GRAMALTIN', 'Gram altın (₺)', 'maden', { f: ['*', 'GC=F', 'USDTRY=X', 1 / 31.1035] }], ['GUMUSTL', 'Gümüş (ons, ₺)', 'maden', { f: ['*', 'SI=F', 'USDTRY=X', 1] }], ['GRAMGUMUS', 'Gram gümüş (₺)', 'maden', { f: ['*', 'SI=F', 'USDTRY=X', 1 / 31.1035] }],
  ['WTI', 'Ham petrol WTI', 'emtia', { y: 'CL=F' }], ['BRENT', 'Brent petrol', 'emtia', { y: 'BZ=F' }], ['DOGALGAZ', 'Doğalgaz', 'emtia', { y: 'NG=F' }],
  ['BAKIR', 'Bakır', 'emtia', { y: 'HG=F' }], ['BUGDAY', 'Buğday', 'emtia', { y: 'ZW=F' }], ['MISIR', 'Mısır', 'emtia', { y: 'ZC=F' }],
  ['DXY', 'Dolar endeksi (DXY)', 'fx', { y: 'DX-Y.NYB' }], ['EURUSD', 'Euro / Dolar', 'fx', { y: 'EURUSD=X' }], ['GBPUSD', 'Sterlin / Dolar', 'fx', { y: 'GBPUSD=X' }],
  ['USDJPY', 'Dolar / Yen', 'fx', { y: 'USDJPY=X' }], ['USDCAD', 'Dolar / Kanada doları', 'fx', { y: 'USDCAD=X' }], ['CADUSD', 'Kanada doları / Dolar', 'fx', { y: 'CADUSD=X' }],
  ['USDCHF', 'Dolar / Frank', 'fx', { y: 'USDCHF=X' }], ['AUDUSD', 'Avustralya doları / Dolar', 'fx', { y: 'AUDUSD=X' }],
  ['CADJPY', 'Kanada doları / Yen', 'fx', { y: 'CADJPY=X' }], ['GBPJPY', 'Sterlin / Yen', 'fx', { y: 'GBPJPY=X' }], ['EURJPY', 'Euro / Yen', 'fx', { y: 'EURJPY=X' }],
  ['USDTRY', 'Dolar / TL', 'fx', { y: 'USDTRY=X' }], ['EURTRY', 'Euro / TL', 'fx', { y: 'EURTRY=X' }], ['GBPTRY', 'Sterlin / TL', 'fx', { y: 'GBPTRY=X' }],
  ['US3A', 'ABD 13 haftalık faiz', 'faiz', { y: '^IRX' }], ['US5Y', 'ABD 5 yıllık faiz', 'faiz', { y: '^FVX' }], ['US10Y', 'ABD 10 yıllık faiz', 'faiz', { y: '^TNX' }],
  ['US30Y', 'ABD 30 yıllık faiz', 'faiz', { y: '^TYX' }], ['FEDFON', 'Fed fonları vadeli (ZQ)', 'faiz', { y: 'ZQ=F' }],
  ['SP500', 'S&P 500', 'endeks', { y: '^GSPC' }], ['NASDAQ100', 'Nasdaq 100', 'endeks', { y: '^NDX' }], ['DOW', 'Dow Jones', 'endeks', { y: '^DJI' }],
  ['DAX', 'DAX', 'endeks', { y: '^GDAXI' }], ['NIKKEI', 'Nikkei 225', 'endeks', { y: '^N225' }], ['VIX', 'VIX (korku endeksi)', 'endeks', { y: '^VIX' }],
  ['BIST100USD', 'BIST 100 (dolar bazlı)', 'endeks', { f: ['/', 'XU100.IS', 'USDTRY=X', 1] }],
  ['BTC', 'Bitcoin ($)', 'kripto', { y: 'BTC-USD' }], ['ETH', 'Ethereum ($)', 'kripto', { y: 'ETH-USD' }], ['BTCCME', 'Bitcoin CME vadeli', 'kripto', { y: 'BTC=F' }],
  ['ETHCME', 'Ether CME vadeli', 'kripto', { y: 'ETH=F' }], ['BTCEUR', 'Bitcoin / Euro', 'kripto', { y: 'BTC-EUR' }], ['BTCJPY', 'Bitcoin / Yen', 'kripto', { y: 'BTC-JPY' }],
  ['BTCTRY', 'Bitcoin / TL', 'kripto', { f: ['*', 'BTC-USD', 'USDTRY=X', 1] }],
  ['ALTINGUMUS', 'Altın / Gümüş rasyosu', 'rasyo', { f: ['/', 'GC=F', 'SI=F', 1] }], ['BAKIRALTIN', 'Bakır / Altın rasyosu', 'rasyo', { f: ['/', 'HG=F', 'GC=F', 1] }],
  ['XU100ALTIN', 'BIST 100 / Gram altın', 'rasyo', { f: ['/', 'XU100.IS', 'GC=F', 31.1035, 'USDTRY=X'] }], ['SP500ALTIN', 'S&P 500 / Altın', 'rasyo', { f: ['/', '^GSPC', 'GC=F', 1] }],
  ['BTCALTIN', 'Bitcoin / Altın', 'rasyo', { f: ['/', 'BTC-USD', 'GC=F', 1] }],
];
export const MAKRO_GRP = { maden: 'Değerli madenler', emtia: 'Emtia', fx: 'Dolar ve pariteler', faiz: 'Faizler', endeks: 'Endeksler', kripto: 'Kripto (makro)', rasyo: 'Rasyolar' };
export function makroSyms(def) { if (def.y) return [def.y]; return [def.f[1], def.f[2], def.f[4]].filter(Boolean); }
// iki günlük seriyi tarihe göre eşle (Yahoo saat farklarını +2 saatle aynı güne toplar)
export function makroBuild(def, S) {
  if (def.y) return S[def.y] || null;
  const [op, A, B, k, C] = def.f, a = S[A], b = S[B], c = C ? S[C] : null; if (!a || !b || (C && !c)) return null;
  const key = t => Math.floor((t + 72e5) / 864e5), mb = new Map(), mc = new Map();
  b.t.forEach((t, i) => mb.set(key(t), i)); if (c) c.t.forEach((t, i) => mc.set(key(t), i));
  const o = { t: [], o: [], h: [], l: [], c: [], v: [] };
  for (let i = 0; i < a.t.length; i++) {
    const j = mb.get(key(a.t[i])); if (j == null) continue; let q = null; if (c) { q = mc.get(key(a.t[i])); if (q == null) continue; }
    // XU100/gram altın: A / (B × C / k)
    const den = c ? (x, y) => (b[x][j] * c[y][q]) / k : null;
    let O, H, L, Cl;
    if (op === '*') { O = a.o[i] * b.o[j] * k; Cl = a.c[i] * b.c[j] * k; H = a.h[i] * b.h[j] * k; L = a.l[i] * b.l[j] * k; }
    else if (c) { O = a.o[i] / den('o', 'o'); Cl = a.c[i] / den('c', 'c'); H = a.h[i] / den('l', 'l'); L = a.l[i] / den('h', 'h'); }
    else { O = a.o[i] / b.o[j] * k; Cl = a.c[i] / b.c[j] * k; H = a.h[i] / b.l[j] * k; L = a.l[i] / b.h[j] * k; }
    if (![O, H, L, Cl].every(isFinite)) continue;
    o.t.push(a.t[i]); o.o.push(O); o.c.push(Cl); o.h.push(Math.max(H, O, Cl)); o.l.push(Math.min(L, O, Cl)); o.v.push(0);
  }
  return o.c.length ? o : null;
}
