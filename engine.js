/*  Coin Radarı — skor motoru
    Kaynak: "Eğitim Notları – İnvestorcoin" (87 sayfa) kurallarının mekanik karşılığı.
    Tarayıcıda (window.CoinRadar) ve Node'da (require) aynı kodla çalışır; sayfa ile geri test
    birebir aynı kuralları kullanır.

    Kademe (tier):
      K = Kesin    → tanımı net, standart teknik analiz kuralı, mekanik hesaplanır
      S = Sezgisel → kursa özgü iddia ya da yoruma açık çizim kuralı; kanıtı yok, yine de skora girer
*/
(function (root) {
  'use strict';

  // ───────────────────────── Modüller ─────────────────────────
  const MODULES = {
    dip:   { label: 'Dip sıkışması (maliyetlenme)', w: 15 },
    trend: { label: 'Trend & Ortalamalar', w: 22 },
    yapi:  { label: 'Yapı (Pin · William · Fib · Dirgen)', w: 20 },
    akis:  { label: 'Para akışı & Hacim', w: 18 },
    mom:   { label: 'Momentum', w: 17 },
    mtf:   { label: 'Zaman dilimi uyumu', w: 8 },
  };

  // ───────────────────────── Kural kataloğu ─────────────────────────
  // w = kuralın tam ağırlığı (puan). Kural ateşlenince v ∈ [-1, 1] ile çarpılır.
  // p = PDF sayfası
  const RULES = [
    // DİP SIKIŞMASI — s.27–30, 18, 23: "Her mal aşırı düştükten sonra akümüle yaşaması lazım; maliyetler iç içe geçince zamanı geliyor"
    ['dip_kurulum',  'dip','S',4,'Diplerde 20/50/100/200 iç içe (sıkışma kalitesi)', 27],
    ['dip_tetik',    'dip','S',3,'Sıkışmadan çıkış: tüm ortalamaların ve kutu tavanının üstü', 29],
    ['dip_200',      'dip','S',1.5,'MA200 yatay seyre döndü ("geçilmesini kolaylaştırır")', 18],
    ['dip_yelpaze',  'dip','S',1.5,'Ortalamaların uçları yukarı açılıyor (20>50>100)', 27],
    ['dip_uzun',     'dip','S',1,'Uzun maliyetlenme: MA200 kısa sürede yeniden test edilmez', 23],

    // TREND & ORTALAMALAR
    ['ma200',        'trend','K',3,'Fiyat MA200 üstünde/altında', 17],
    ['ma_dizilim',   'trend','K',3,'MA 9>20>50>100>200 dizilimi', 18],
    ['ma_egim',      'trend','K',2,'MA20/MA50 uçlarının yönü', 16],
    ['ema510',       'trend','K',3,'Günlük EMA5/EMA10 yönü (trend yönü)', 25],
    ['ema510_kesis', 'trend','K',1.5,'Taze EMA5/10 kesişimi', 25],
    ['fiyat_9_20',   'trend','K',1.5,'Fiyat MA9 ve MA20 üstünde', 19],
    ['yapi_hhhl',    'trend','K',3,'Yükselen tepe/dip (uzun bacak yönü)', 9],
    ['trend_kirilim','trend','K',3,'Önceki dibin altına sarkma = trend kırılımı', 9],
    ['ma920_birles', 'trend','S',1.5,'9 ve 20 birleşip yukarı açıldı ("zor durdurulur")', 18],
    ['ma_kavga',     'trend','S',1.5,'Ortalamalarda sık kesişim ("kavga başlar")', 17],
    ['duzeltme',     'trend','S',1,'9/20 aşağı ama MA200 kırılmadı → düzeltme', 19],
    ['hepsinin_alti','trend','S',2.5,'Bütün ortalamaların altında ("tutunacak dal yok")', 24],
    ['ma9_kirildi',  'trend','S',1,'MA9 kırıldı → hedef MA20', 20],
    ['wma522',       'trend','S',1.5,'WMA5/22 ve WMA200 konumu', 27],
    ['ma200_test',   'trend','S',2,'MA200 testi tuttu ("son kale")', 23],
    ['yatay',        'trend','S',1,'Yatay = testere / fırsat maliyeti', 10],
    ['yatay_sonrasi','trend','S',2,'Uzun yatay sonrası hacimli çıkış (sağlıklı yükseliş)', 11],
    ['v_hareket',    'trend','S',1,'Hızlı V hareket ("sert düşüşler getirir")', 11],
    ['uzun_mum',     'trend','S',0.5,'Uzun mumdan sonra yatay beklenir', 20],

    // YAPI
    ['fraktal_destek','yapi','K',2,'Yakında fraktal destek / direnç', 14],
    ['fib_sig',      'yapi','K',2,'Fib: sığ geri çekilme (0.382 üstü)', 58],
    ['william_bolge','yapi','S',2,'William bölgesi (en uzun mum filtresi) içinde/üstünde', 4],
    ['william_gecis','yapi','S',2,'William direnci hacimli geçildi ("boyalı bölge")', 4],
    ['ust_pin',      'yapi','S',1.5,'Uzun üst pin ("kaçın")', 3],
    ['alt_pin',      'yapi','S',1.5,'Destekte uzun alt pin (alıcı)', 3],
    ['bolge_yaklasma','yapi','S',2,'Desteğe hacimsiz yaklaşma = sekme / hacimli = kırılım', 5],
    ['destek_ust_uste','yapi','S',1,'Destek üstüne destek / direnç üstüne direnç', 6],
    ['destek_kirildi','yapi','S',2,'Destek hacimli kırıldı (retest + düşüş)', 5],
    ['fib_618_donus','yapi','S',1.5,'Fib 0.618\'den dönüş', 67],
    ['fib_618_kirilim','yapi','S',2,'0.618 kırıldı → hedef 1.618', 58],
    ['fib_786_gecis','yapi','S',2,'0.786 hacimli geçildi → hedef 1.114, sonra 1.618', 62],
    ['fib_1114',     'yapi','S',2,'1.114 kapı gibi durur / kırılırsa 1.272–1.414', 65],
    ['fib_1114_red', 'yapi','S',2,'1.114/1.272\'den red → düşüş', 67],
    ['fib_272',      'yapi','S',1.5,'−0.272\'ye dokundu → 0.707/0.786 ister', 59],
    ['fib_382_hacimsiz','yapi','S',1,'0.382 hacimsiz kırıldı (zayıf)', 64],
    ['tfib',         'yapi','S',1,'Trend temelli fib (3 nokta) geçerli / iptal', 70],
    ['dirgen',       'yapi','S',1.5,'Schiff dirgeni: medyan üstü / dirgen dışı', 75],
    ['hiz_fani',     'yapi','S',1.5,'Fib hız fanı: 0.786 altı = düşüş trendi', 85],
    ['fib_kanal',    'yapi','S',1,'Fib kanalı kırılımı', 80],

    // PARA AKIŞI & HACİM
    ['cmf_sifir',    'akis','K',2,'CMF sıfır üstü / altı', 42],
    ['mfi_50',       'akis','K',1,'MFI 50 üstü / altı', 40],
    ['kirilim_hacmi','akis','K',2,'Kırılım hacmi ortalamanın 1.5 katı mı', 10],
    ['mfi_10',       'akis','S',3,'MFI 10\'a değdi ("kesin al" iddiası)', 46],
    ['mfi_90',       'akis','S',1,'MFI 90 üstü (aşırı)', 41],
    ['cmf_kesis',    'akis','S',1.5,'CMF sıfırı yukarı kesti ("fiyatı iter")', 43],
    ['cmf_yaniltici','akis','S',1.5,'Fiyat yükseliyor ama CMF < 0 ("yanıltır")', 42],
    ['cmf_guclu',    'akis','S',1,'CMF > 0.2 ("3–4 gün rahat")', 43],
    ['di_sifir',     'akis','S',1.5,'Demand Index sıfır üstü / altı (yaklaşık)', 47],
    ['di_sahte',     'akis','S',1.5,'Fiyat düşüyor, talep sabit ("düşüş fake")', 47],
    ['di_zayif',     'akis','S',1,'Fiyat artıyor, talep azalıyor', 47],
    ['hacimsiz_yatay','akis','S',1,'Hacimsiz yatay (mal toplama/dağıtma)', 6],
    ['mfi_uyumsuz',  'akis','S',1,'MFI uyumsuzluğu', 31],

    // MOMENTUM
    ['rsi_50',       'mom','K',2,'RSI 50 üstü / altı', 46],
    ['rsi_50_kesis', 'mom','K',1.5,'RSI 50\'yi aşağıdan kesti', 46],
    ['rsi_uyumsuz',  'mom','K',2.5,'RSI tepe / dip uyumsuzluğu (yakın tepeler)', 31],
    ['macd_sinyal',  'mom','K',2,'MACD sinyal üstü / altı', 51],
    ['macd_sifir',   'mom','K',1,'MACD sıfır üstü / altı', 51],
    ['fisher',       'mom','K',0.5,'Fisher kesişimi', 55],
    ['wt',           'mom','K',1,'WT Cross (±53 bölgesinde kesişim)', 55],
    ['vortex',       'mom','K',1,'Vortex VI+ / VI−', 56],
    ['rsi_50_alti',  'mom','S',2,'RSI 50 altı ("kesinlikle işlemde olunmaz")', 46],
    ['rsi_yukaridan','mom','S',1.5,'RSI 70\'ten gelip 50–60\'ta ("işlemde olma")', 46],
    ['rsi_70',       'mom','S',1.5,'RSI 70 üstü ("en az %7–8")', 46],
    ['rsi_70_yok',   'mom','S',1,'Yükselişte RSI 70\'i geçemedi (zayıf)', 38],
    ['rsi_trend',    'mom','S',1.5,'RSI trend kırılımı fiyattan önce', 13],
    ['rsi_dip_yesil','mom','S',1,'Dip uyumsuzluğu + yeşil mum teyidi', 35],
    ['macd_0_kesis', 'mom','S',1.5,'Sıfır üstünde taze MACD kesişimi', 52],
    ['macd_aci',     'mom','S',1,'MACD açısı açılıyor (sert hareket)', 51],
    ['macd_uyumsuz', 'mom','S',1.5,'MACD uyumsuzluğu (0 altı riskli)', 51],
    ['smi_giris',    'mom','S',1.5,'SMI −0.5 altından döndü (giriş)', 54],
    ['smi_tepe',     'mom','S',1.5,'SMI +0.5 üstünde döndü (MACD kesişimi yaklaşıyor)', 54],
    ['vortex_agiz',  'mom','S',1,'Vortex ağzı açılıyor / kesişim patlaması', 56],

    // ZAMAN DİLİMİ
    ['hafta_ma9',    'mtf','K',2.5,'Haftalık MA9 üstü ("altında kalınmadığı sürece")', 17],
    ['tf4_ema',      'mtf','K',2,'4 saatlik EMA5/10 günlükle aynı yönde', 26],
    ['tf4_bozulma',  'mtf','S',2,'Alt zamansal bozuluyor, üst zamana yayılır', 24],
    ['tf4_erken',    'mtf','S',1.5,'Alt zamansal tüm ortalamaların üstünde (erken dönüş)', 19],
  ].map(([id, mod, tier, w, label, p]) => ({ id, mod, tier, w, label, p }));
  const RULE = Object.fromEntries(RULES.map(r => [r.id, r]));

  const GATES = [
    { id: 'g_ma200', label: 'MA200 altı → skor en fazla 40', cap: 40, p: 19, tier: 'S',
      src: '"200 günlük ma geçilmeden işleme girilmez"' },
    { id: 'g_ema',   label: 'Günlük EMA5/10 aşağı → skor en fazla 55', cap: 55, p: 26, tier: 'S',
      src: '"Günlükte 5/10 aşağı döndüyse long kovalama"' },
    { id: 'g_rsi',   label: 'RSI 50 altı → skor en fazla 50', cap: 50, p: 46, tier: 'S',
      src: '"50\'nin altında kesinlikle işlemde olunmamalıdır"' },
  ];

  const FIB = [-0.272, -0.114, 0, 0.114, 0.236, 0.382, 0.5, 0.618, 0.707, 0.786, 0.886, 1, 1.114, 1.272, 1.414, 1.618, 2];

  // ───────────────────────── Yardımcılar ─────────────────────────
  const N = NaN;
  const isF = x => typeof x === 'number' && isFinite(x);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const arr = n => new Array(n).fill(N);

  function sma(a, n) {
    const o = arr(a.length); let s = 0, k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!isF(a[i])) { s = 0; k = 0; continue; }
      s += a[i]; k++;
      if (k > n) { s -= a[i - n]; k = n; }
      if (k === n) o[i] = s / n;
    }
    return o;
  }
  function ema(a, n) {
    const o = arr(a.length), al = 2 / (n + 1); let prev = N, s = 0, k = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (!isF(x)) continue;
      if (!isF(prev)) { s += x; k++; if (k === n) { prev = s / n; o[i] = prev; } continue; }
      prev = al * x + (1 - al) * prev; o[i] = prev;
    }
    return o;
  }
  function rma(a, n) {
    const o = arr(a.length); let prev = N, s = 0, k = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i]; if (!isF(x)) continue;
      if (!isF(prev)) { s += x; k++; if (k === n) { prev = s / n; o[i] = prev; } continue; }
      prev = (prev * (n - 1) + x) / n; o[i] = prev;
    }
    return o;
  }
  function wma(a, n) {
    const o = arr(a.length), den = n * (n + 1) / 2;
    for (let i = n - 1; i < a.length; i++) {
      let s = 0, ok = true;
      for (let j = 0; j < n; j++) { const x = a[i - j]; if (!isF(x)) { ok = false; break; } s += x * (n - j); }
      if (ok) o[i] = s / den;
    }
    return o;
  }
  function rollSum(a, n) {
    const o = arr(a.length); let s = 0;
    for (let i = 0; i < a.length; i++) { s += a[i] || 0; if (i >= n) s -= a[i - n] || 0; if (i >= n - 1) o[i] = s; }
    return o;
  }
  function rollMax(a, n) { const o = arr(a.length); for (let i = n - 1; i < a.length; i++) { let m = -Infinity; for (let j = i - n + 1; j <= i; j++) if (a[j] > m) m = a[j]; o[i] = m; } return o; }
  function rollMin(a, n) { const o = arr(a.length); for (let i = n - 1; i < a.length; i++) { let m = Infinity; for (let j = i - n + 1; j <= i; j++) if (a[j] < m) m = a[j]; o[i] = m; } return o; }

  // ───────────────────────── Göstergeler ─────────────────────────
  function indicators(d) {
    const { o, h, l, c, v } = d, n = c.length;
    const I = {};
    for (const p of [5, 9, 10, 20, 50, 100, 200]) I['sma' + p] = sma(c, p);
    I.ema5 = ema(c, 5); I.ema10 = ema(c, 10);
    I.wma5 = wma(c, 5); I.wma22 = wma(c, 22); I.wma200 = wma(c, 200);

    const tr = arr(n);
    for (let i = 0; i < n; i++) tr[i] = i === 0 ? h[i] - l[i] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
    I.atr = rma(tr, 14);

    // RSI (Wilder 14)
    const g = arr(n), ls = arr(n);
    for (let i = 1; i < n; i++) { const ch = c[i] - c[i - 1]; g[i] = Math.max(ch, 0); ls[i] = Math.max(-ch, 0); }
    const ag = rma(g, 14), al = rma(ls, 14);
    I.rsi = ag.map((x, i) => isF(x) && isF(al[i]) ? (al[i] === 0 ? 100 : 100 - 100 / (1 + x / al[i])) : N);

    // MFI 14
    const tp = c.map((x, i) => (h[i] + l[i] + x) / 3), pmf = arr(n), nmf = arr(n);
    for (let i = 1; i < n; i++) { const f = tp[i] * v[i]; pmf[i] = tp[i] > tp[i - 1] ? f : 0; nmf[i] = tp[i] < tp[i - 1] ? f : 0; }
    const sp = rollSum(pmf, 14), sn = rollSum(nmf, 14);
    I.mfi = sp.map((x, i) => i < 14 ? N : (sn[i] === 0 ? 100 : 100 - 100 / (1 + x / sn[i])));

    // CMF 20
    const mfv = c.map((x, i) => { const r = h[i] - l[i]; return r > 0 ? (((x - l[i]) - (h[i] - x)) / r) * v[i] : 0; });
    const smfv = rollSum(mfv, 20), sv = rollSum(v, 20);
    I.cmf = smfv.map((x, i) => isF(x) && sv[i] > 0 ? x / sv[i] : N);

    // MACD 12/26/9
    const e12 = ema(c, 12), e26 = ema(c, 26);
    I.macd = e12.map((x, i) => x - e26[i]);
    I.macdSig = ema(I.macd, 9);
    I.macdHist = I.macd.map((x, i) => x - I.macdSig[i]);

    // SMI Ergodic (TSI tabanlı: Fast 4 / Slow 8 / Sinyal 3, bantlar ±0.5)
    const mom = arr(n), amom = arr(n);
    for (let i = 1; i < n; i++) { mom[i] = c[i] - c[i - 1]; amom[i] = Math.abs(mom[i]); }
    const num = ema(ema(mom, 8), 4), den = ema(ema(amom, 8), 4);
    I.smi = num.map((x, i) => isF(x) && den[i] > 0 ? x / den[i] : N);
    I.smiSig = ema(I.smi, 3);

    // Fisher 9
    const hl2 = h.map((x, i) => (x + l[i]) / 2), mx9 = rollMax(hl2, 9), mn9 = rollMin(hl2, 9);
    I.fisher = arr(n); I.fisherTrig = arr(n);
    let val = 0, fish = 0;
    for (let i = 0; i < n; i++) {
      if (!isF(mx9[i])) continue;
      const rng = mx9[i] - mn9[i];
      val = clamp(0.66 * ((rng > 0 ? (hl2[i] - mn9[i]) / rng : 0.5) - 0.5) + 0.67 * val, -0.999, 0.999);
      const prev = fish; fish = 0.5 * Math.log((1 + val) / (1 - val)) + 0.5 * fish;
      I.fisher[i] = fish; I.fisherTrig[i] = prev;
    }

    // WaveTrend (10, 21)
    const ap = tp, esa = ema(ap, 10), dd = ema(ap.map((x, i) => Math.abs(x - esa[i])), 10);
    const ci = ap.map((x, i) => isF(esa[i]) && dd[i] > 0 ? (x - esa[i]) / (0.015 * dd[i]) : N);
    I.wt1 = ema(ci, 21); I.wt2 = sma(I.wt1, 4);

    // Vortex 14
    const vp = arr(n), vm = arr(n);
    for (let i = 1; i < n; i++) { vp[i] = Math.abs(h[i] - l[i - 1]); vm[i] = Math.abs(l[i] - h[i - 1]); }
    const svp = rollSum(vp, 14), svm = rollSum(vm, 14), str = rollSum(tr, 14);
    I.viP = svp.map((x, i) => i >= 14 && str[i] > 0 ? x / str[i] : N);
    I.viM = svm.map((x, i) => i >= 14 && str[i] > 0 ? x / str[i] : N);

    // Demand Index (Sibbet yaklaşımı, −1…+1)
    const P = c.map((x, i) => h[i] + l[i] + 2 * x), rng10 = sma(h.map((x, i) => x - l[i]), 10), va = sma(v, 10);
    const bp = arr(n), spr = arr(n);
    for (let i = 1; i < n; i++) {
      if (!isF(rng10[i]) || !(va[i] > 0) || !(rng10[i] > 0)) continue;
      const K = 3 * c[i] / rng10[i], pr = (P[i] - P[i - 1]) / P[i - 1], x = Math.min(Math.abs(pr) * K, 20), vr = v[i] / va[i];
      if (pr >= 0) { bp[i] = vr; spr[i] = vr / Math.exp(x); } else { spr[i] = vr; bp[i] = vr / Math.exp(x); }
    }
    const sbp = rollSum(bp, 10), ssp = rollSum(spr, 10);
    I.di = ema(sbp.map((x, i) => { const m = Math.max(x, ssp[i]); return i > 20 && m > 0 ? (x - ssp[i]) / m : N; }), 3);

    I.volSma20 = sma(v, 20); I.volSma100 = sma(v, 100);
    // Ortalama sıkışması: 20/50/100/200 bandının fiyata oranı
    I.maDisp = c.map((x, i) => { const g = [I.sma20[i], I.sma50[i], I.sma100[i], I.sma200[i]]; return g.every(isF) ? (Math.max(...g) - Math.min(...g)) / x : N; });
    I.hh20 = rollMax(h, 20); I.ll20 = rollMin(l, 20);
    I.hh30 = rollMax(h, 30); I.ll30 = rollMin(l, 30);

    // Fraktallar (2 sol / 2 sağ) ve William (en uzun mum) pivotları — onay j+2'de
    I.piv = []; // {j, conf, type:'H'|'L', price, william, zone:[lo,hi]}
    for (let j = 2; j < n - 2; j++) {
      const rj = h[j] - l[j];
      let isH = h[j] > h[j - 1] && h[j] > h[j - 2] && h[j] >= h[j + 1] && h[j] >= h[j + 2];
      let isL = l[j] < l[j - 1] && l[j] < l[j - 2] && l[j] <= l[j + 1] && l[j] <= l[j + 2];
      if (!isH && !isL) continue;
      let longest = true;
      for (const k of [j - 2, j - 1, j + 1, j + 2]) if (h[k] - l[k] > rj) longest = false;
      if (isH) I.piv.push({ j, conf: j + 2, type: 'H', price: h[j], william: longest, zone: [Math.max(o[j], c[j]), h[j]] });
      if (isL) I.piv.push({ j, conf: j + 2, type: 'L', price: l[j], william: longest, zone: [l[j], Math.min(o[j], c[j])] });
    }
    // RSI üzerinde pivotlar (RSI trend çizgisi için)
    I.rsiPivH = [];
    const r = I.rsi;
    for (let j = 2; j < n - 2; j++) if (isF(r[j - 2]) && r[j] > r[j - 1] && r[j] > r[j - 2] && r[j] >= r[j + 1] && r[j] >= r[j + 2]) I.rsiPivH.push({ j, conf: j + 2, val: r[j] });
    return I;
  }

  // Haftalık: o güne kadarki tamamlanan haftalar + içinde bulunulan haftanın anlık kapanışı
  function weekKey(ts) { const d = new Date(ts); const day = (d.getUTCDay() + 6) % 7; return Math.floor((ts - day * 864e5) / 864e5); }

  // ───────────────────────── Dip sıkışması dedektörü ─────────────────────────
  // Aşama: 0 yok · 1 maliyetlenme sürüyor · 2 fiyat tüm ortalamaların üstünde (eşikte)
  //        3 kutu tavanı kırıldı (son 10 gün) · 4 gecikmiş (%25+ uzaklaştı ya da 30+ gün geçti) · −1 aşağı kırıldı
  const DIP = { disp: 0.12, minDur: 20, minDrop: 0.30 };
  function dipSetup(d, I, i) {
    const { h, l, c, v } = d, D = I.maDisp, none = { stage: 0, score: 0 };
    if (!isF(D[i])) return none;
    // En yakın sıkışma bitişi: son 40 gün içinde bant < eşik olan en son gün
    let e = -1; for (let q = i; q >= Math.max(0, i - 40); q--) if (D[q] < DIP.disp) { e = q; break; }
    if (e < 0) return none;
    // Geriye doğru süre (3 güne kadar kopukluk tolere edilir)
    let st = e, gap = 0;
    for (let q = e - 1; q >= 0 && isF(D[q]); q--) { if (D[q] < DIP.disp) { st = q; gap = 0; } else if (++gap > 3) break; }
    if (e - st + 1 < DIP.minDur) return none;
    // Sıkışmadan önceki zirve (400 gün) → ne kadar düşmüş
    let hi = -Infinity; for (let q = Math.max(0, st - 400); q < st; q++) hi = Math.max(hi, h[q]);
    // Kutu: sıkışma başlangıcından itibaren kapanışların tepesi. İlk gerçek kırılımda (en az 20 gün sonra,
    // tepenin %1 üstü ve tüm ortalamaların üstü) kutu dondurulur; sonraki günler kutuyu büyütmez.
    let top = -Infinity, first = -1;
    for (let q = st; q <= i; q++) {
      // Gerçek kırılım: kutu en az 30 gün olgunlaşmış, kapanış tepenin %3 üstünde, tüm ortalamaların üstünde,
      // ve hacimli ya da iki kapanış üst üste kutu üstünde (tek mumluk iğne kutuyu bozmaz)
      if (q >= st + 30 && c[q] > top * 1.03 && c[q] > Math.max(I.sma20[q], I.sma50[q], I.sma100[q], I.sma200[q])
        && (c[q - 1] > top || (I.volSma20[q - 1] > 0 && v[q] / I.volSma20[q - 1] >= 1.5))) { first = q; break; }
      // Kutu tepesi 10 gün gecikmeli güncellenir: yavaş tırmanış kutuyu kendisiyle birlikte büyütmesin
      const qq = q - 9; if (qq >= st && qq <= e) top = Math.max(top, c[qq]);
    }
    if (first < 0) for (let q = Math.max(st, i - 8); q <= Math.min(e, i); q++) top = Math.max(top, c[q]);
    const bEnd = first > 0 ? first - 1 : e;
    let sumC = 0, sumD = 0, rH = -Infinity, rL = Infinity;
    for (let q = st; q <= bEnd; q++) { sumC += c[q]; sumD += D[q]; rH = Math.max(rH, h[q]); rL = Math.min(rL, l[q]); }
    const bl = bEnd - st + 1, mid = sumC / bl, drop = isF(hi) ? 1 - mid / hi : 0, avgDisp = sumD / bl;
    if (drop < DIP.minDrop) return none;
    const boxH = top;
    const s20 = I.sma20[i], s50 = I.sma50[i], s100 = I.sma100[i], s200 = I.sma200[i], C = c[i];
    const slope200 = isF(I.sma200[i - 20]) ? s200 / I.sma200[i - 20] - 1 : 0;
    const aboveAll = C > Math.max(s20, s50, s100, s200);
    const fan = s20 > s50 && s50 > s100 && s20 > I.sma20[i - 5] && s50 > I.sma50[i - 5] && s100 >= I.sma100[i - 5];
    // Son kırılım günü (ilk kırılımdan sonra tavanın altına inip yeniden çıkışlar dahil)
    let brk = first; if (first > 0) for (let q = first + 1; q <= i; q++) if (c[q] > boxH && c[q - 1] <= boxH) brk = q;
    const volBreak = brk > 0 && I.volSma20[brk - 1] > 0 && Math.max(v[brk], v[brk + 1] || 0, v[brk + 2] || 0) / I.volSma20[brk - 1] >= 1.5;
    const dur = bl;
    let stage = 1, stageText = 'Maliyetlenme sürüyor: ortalamalar iç içe, kırılım bekleniyor';
    if (C < rL * 0.97 && D[i] < DIP.disp * 1.3) { stage = -1; stageText = `Sıkışma aşağı kırıldı (kutu dibi ${fmt(rL)})`; }
    else if (brk > 0 && C > boxH) {
      const ext = C / boxH - 1, age = i - brk;
      if (ext > 0.25 || age > 30) { stage = 4; stageText = `Kırılım ${age} gün önce, fiyat tavanın %${(ext * 100).toFixed(0)} üstünde (geç kalınmış olabilir)`; }
      else { stage = 3; stageText = `Kutu tavanı ${fmt(boxH)} ${age ? age + " gün önce" : "bugün"} ${volBreak ? 'hacimli' : 'hacimsiz'} kırıldı`; }
    } else if (first > 0) { stage = aboveAll ? 2 : 1; stageText = `Kırılım denemesi (${fmt(boxH)}) geri alındı: fake-out olabilir, kutu içinde`; }
    else if (aboveAll) { stage = 2; stageText = `Fiyat tüm ortalamaların üstünde, kutu tavanı ${fmt(boxH)}`; }
    // Kurulum kalitesi 0–100
    const sc = clamp((drop - 0.25) / 0.45, 0, 1) * 20       // ne kadar dipte
      + clamp((DIP.disp - avgDisp) / 0.09, 0, 1) * 25         // ne kadar sıkı
      + clamp(dur / 90, 0, 1) * 20                            // ne kadar uzun
      + (Math.abs(slope200) < 0.015 ? 10 : Math.abs(slope200) < 0.03 ? 5 : 0)  // MA200 yataylaştı
      + clamp((0.6 - (rH - rL) / mid) / 0.45, 0, 1) * 10      // kutu dar
      + (aboveAll ? 7 : 0) + (brk > 0 ? 4 : 0) + (volBreak ? 4 : 0); // tetik
    return { stage, stageText, score: sc, dur, start: st, end: bEnd, drop, avgDisp, dispNow: D[i], boxH, boxL: rL, slope200, aboveAll, fan, brk, volBreak, peak: hi };
  }

  // ───────────────────────── Değerlendirici ─────────────────────────
  function Walker(d, I, opts) {
    this.d = d; this.I = I; this.opts = opts || {};
    this.pi = 0; this.ri = 0;
    this.zz = [];      // zigzag swing listesi {j, type, price}
    this.zones = [];   // onaylı fraktal bölgeleri
    this.rsiPiv = [];
    this.wkCloses = []; this.wkCur = null; this.wkIdx = 0;
    this.lastI = -1;
  }

  Walker.prototype.advance = function (i) {
    const { I, d } = this;
    while (this.lastI < i) {
      const k = ++this.lastI;
      // haftalık
      if (d.t && d.t[k] != null) {
        const wk = weekKey(d.t[k]);
        if (this.wkCur !== null && wk !== this.wkCur) this.wkCloses.push(d.c[k - 1]);
        this.wkCur = wk;
      }
      // pivotlar
      while (this.pi < I.piv.length && I.piv[this.pi].conf <= k) {
        const p = I.piv[this.pi++];
        this.zones.push(p); if (this.zones.length > 60) this.zones.shift();
        const thr = 2 * (I.atr[p.j] || 0);
        const zz = this.zz, last = zz[zz.length - 1];
        if (!last) zz.push({ j: p.j, type: p.type, price: p.price });
        else if (last.type === p.type) {
          if ((p.type === 'H' && p.price > last.price) || (p.type === 'L' && p.price < last.price)) zz[zz.length - 1] = { j: p.j, type: p.type, price: p.price };
        } else if (Math.abs(p.price - last.price) >= thr) zz.push({ j: p.j, type: p.type, price: p.price });
        if (zz.length > 12) zz.shift();
      }
      while (this.ri < I.rsiPivH.length && I.rsiPivH[this.ri].conf <= k) { this.rsiPiv.push(I.rsiPivH[this.ri++]); if (this.rsiPiv.length > 8) this.rsiPiv.shift(); }
    }
  };

  // tf4: {I, d} 4 saatlik (opsiyonel). i4: değerlendirilecek 4s mum indeksi
  Walker.prototype.evaluate = function (i, tf4) {
    this.advance(i);
    const { d, I } = this, { o, h, l, c, v } = d;
    const out = [], ctx = {};
    const fire = (id, val, note) => { if (!RULE[id]) throw new Error('kural yok ' + id); if (isF(val) && val !== 0) out.push({ id, v: clamp(val, -1, 1), note: note || '' }); };
    const at = (a, k = 0) => a[i - k];
    const C = c[i], atr = I.atr[i] || (C * 0.03), vRatio = I.volSma20[i - 1] > 0 ? v[i] / I.volSma20[i - 1] : 1;
    const volOK = vRatio >= 1.5;
    const green = c[i] >= o[i];
    const crossUp = (a, b, k) => { for (let q = 0; q < k; q++) { const x0 = a[i - q - 1], x1 = a[i - q], y0 = typeof b === 'number' ? b : b[i - q - 1], y1 = typeof b === 'number' ? b : b[i - q]; if (x0 <= y0 && x1 > y1) return true; } return false; };
    const crossDn = (a, b, k) => { for (let q = 0; q < k; q++) { const x0 = a[i - q - 1], x1 = a[i - q], y0 = typeof b === 'number' ? b : b[i - q - 1], y1 = typeof b === 'number' ? b : b[i - q]; if (x0 >= y0 && x1 < y1) return true; } return false; };
    const pct = x => (x * 100).toFixed(1) + '%';
    ctx.vRatio = vRatio; ctx.atr = atr;

    // ═════════ TREND & ORTALAMALAR ═════════
    const s9 = at(I.sma9), s20 = at(I.sma20), s50 = at(I.sma50), s100 = at(I.sma100), s200 = at(I.sma200);
    const has200 = isF(s200);
    if (has200) fire('ma200', C > s200 ? 1 : -1, C > s200 ? `MA200'ün ${pct(C / s200 - 1)} üstünde` : `MA200'ün ${pct(1 - C / s200)} altında`);
    const mas = [s9, s20, s50, s100, s200].filter(isF);
    if (mas.length >= 4) {
      let up = 0, dn = 0; for (let q = 0; q < mas.length - 1; q++) { if (mas[q] > mas[q + 1]) up++; else dn++; }
      fire('ma_dizilim', (up - dn) / (mas.length - 1), up === mas.length - 1 ? 'Tam boğa dizilimi' : dn === mas.length - 1 ? 'Tam ayı dizilimi' : `${up}/${mas.length - 1} çift yukarı`);
    }
    if (isF(I.sma50[i - 5])) {
      const e20 = s20 / I.sma20[i - 5] - 1, e50 = s50 / I.sma50[i - 5] - 1;
      fire('ma_egim', (Math.sign(e20) + Math.sign(e50)) / 2, `MA20 ${e20 >= 0 ? '↑' : '↓'} · MA50 ${e50 >= 0 ? '↑' : '↓'}`);
    }
    const e5 = at(I.ema5), e10 = at(I.ema10);
    ctx.emaUp = e5 > e10;
    fire('ema510', e5 > e10 ? 1 : -1, e5 > e10 ? 'EMA5 > EMA10: trend yukarı' : 'EMA5 < EMA10: trend aşağı');
    if (crossUp(I.ema5, I.ema10, 3)) fire('ema510_kesis', 1, 'Son 3 mumda yukarı kesişim');
    else if (crossDn(I.ema5, I.ema10, 3)) fire('ema510_kesis', -1, 'Son 3 mumda aşağı kesişim');
    if (isF(s20)) fire('fiyat_9_20', ((C > s9) + (C > s20) - 1), `MA9 ${C > s9 ? 'üstü' : 'altı'} · MA20 ${C > s20 ? 'üstü' : 'altı'}`);

    // Swing yapısı
    const zz = this.zz;
    const H = zz.filter(p => p.type === 'H').slice(-2), L = zz.filter(p => p.type === 'L').slice(-2);
    let structUp = null;
    if (H.length === 2 && L.length === 2) {
      const hh = H[1].price > H[0].price, hl = L[1].price > L[0].price;
      if (hh && hl) { structUp = true; fire('yapi_hhhl', 1, 'Yükselen tepe + yükselen dip'); }
      else if (!hh && !hl) { structUp = false; fire('yapi_hhhl', -1, 'Alçalan tepe + alçalan dip'); }
    }
    const lastLow = L[L.length - 1], lastHigh = H[H.length - 1];
    if (lastLow && C < lastLow.price && c[i - 1] >= lastLow.price) {
      fire('trend_kirilim', -1, `Son dip ${fmt(lastLow.price)} aşağı kırıldı${volOK ? ' (hacimli)' : ''}`);
    } else if (lastLow && C < lastLow.price) fire('trend_kirilim', -0.6, `Fiyat son dibin (${fmt(lastLow.price)}) altında`);
    ctx.lastLow = lastLow; ctx.lastHigh = lastHigh;

    // S: 9-20 birleşme
    if (crossUp(I.sma9, I.sma20, 5) && s9 > I.sma9[i - 3] && s20 >= I.sma20[i - 3]) fire('ma920_birles', 1, 'MA9 MA20\'yi yukarı kesti, ikisi de yukarı bakıyor');
    // S: kavga
    let crosses = 0; for (let q = i - 19; q <= i; q++) if ((I.sma9[q - 1] - I.sma20[q - 1]) * (I.sma9[q] - I.sma20[q]) < 0) crosses++;
    if (crosses >= 3) fire('ma_kavga', -1, `Son 20 mumda ${crosses} kesişim`);
    // ═════════ DİP SIKIŞMASI ═════════
    const dip = dipSetup(d, I, i);
    ctx.dip = dip; ctx.maDisp = I.maDisp[i];
    if (dip.stage !== 0) {
      const dPct = x => '%' + (x * 100).toFixed(0);
      if (dip.stage >= 1) fire('dip_kurulum', clamp((dip.score - 35) / 55, -0.3, 1),
        `Sıkışma ${dip.score.toFixed(0)}/100 · ${dip.dur} gün · bant ${dPct(dip.avgDisp)} · zirveden ${dPct(dip.drop)} aşağıda`);
      const tv = { 1: 0, 2: 0.5, 3: dip.volBreak ? 1 : 0.6, 4: 0.25, '-1': -1 }[dip.stage];
      if (tv) fire('dip_tetik', tv, dip.stageText);
      if (dip.stage >= 1) fire('dip_200', Math.abs(dip.slope200) < 0.015 ? 1 : dip.slope200 < -0.03 ? -0.5 : 0.3,
        `MA200 20 günde ${(dip.slope200 * 100).toFixed(1)}%`);
      if (dip.stage >= 2 && dip.fan) fire('dip_yelpaze', 1, 'MA20 > MA50 > MA100, hepsi yukarı bakıyor');
      if (dip.stage >= 3 && dip.dur >= 60) fire('dip_uzun', 1, `${dip.dur} gün maliyetlenme`);
    }
    if (has200 && s9 < s20 && C > s200) fire('duzeltme', -0.5, '9 < 20 ama MA200 üstü: düzeltme sayılır, trend dönüşü değil');
    if (mas.length >= 4 && mas.every(m => C < m)) fire('hepsinin_alti', -1, 'Fiyat tüm ortalamaların altında');
    if (C < s9 && c[i - 1] >= I.sma9[i - 1] && s9 > s20) fire('ma9_kirildi', -1, `MA9 kırıldı, hedef MA20 (${fmt(s20)})`);
    const w5 = at(I.wma5), w22 = at(I.wma22), w200 = at(I.wma200);
    if (isF(w200)) {
      if (w5 > w22 && C > w200) fire('wma522', 1, 'WMA5 > WMA22, fiyat WMA200 üstü');
      else if (w5 < w22 && w5 < w200) fire('wma522', -1, 'WMA5, WMA22 ve WMA200\'ün altında');
    }
    if (has200) {
      let touched = false; for (let q = 0; q < 3; q++) if (l[i - q] <= I.sma200[i - q] * 1.01 && c[i - q] > I.sma200[i - q]) touched = true;
      if (touched && C > s200) fire('ma200_test', 1, 'MA200\'e değip üstünde kapandı');
    }
    const range20 = at(I.hh20) - at(I.ll20);
    ctx.yatay = range20 < 3 * atr;
    if (ctx.yatay) fire('yatay', -1, `20 mumluk aralık ${(range20 / atr).toFixed(1)} ATR`);
    const hh30p = I.hh30[i - 1], ll30p = I.ll30[i - 1];
    if (isF(hh30p) && hh30p - ll30p < 4.5 * atr && C > hh30p) fire('yatay_sonrasi', volOK ? 1 : 0.4, `30 mumluk yataydan çıkış${volOK ? ', hacimli' : ', hacim zayıf'}`);
    const low5 = Math.min(l[i - 4], l[i - 3], l[i - 2], l[i - 1], l[i]);
    if (C - low5 > 4 * atr) fire('v_hareket', -1, `5 mumda ${((C - low5) / atr).toFixed(1)} ATR yükseliş, taban yok`);
    if (h[i] - l[i] > 2.5 * atr) fire('uzun_mum', -0.5, 'Uzun mum: ortalama yetişsin diye yatay beklenir');

    // ═════════ YAPI ═════════
    const zones = this.zones.filter(z => i - z.j <= 150);
    // Çakışan bölgeleri birleştir (aynı fiyat bandındaki pinler tek bölge sayılır, dokunma sayısı = güç)
    const merged = [];
    for (const z of [...zones].sort((a, b) => a.zone[0] - b.zone[0])) {
      const m = merged[merged.length - 1];
      if (m && z.zone[0] <= m.zone[1] + 0.15 * atr) { m.zone = [m.zone[0], Math.max(m.zone[1], z.zone[1])]; m.william = m.william || z.william; m.touch++; if (z.j > m.j) { m.j = z.j; m.type = z.type; } }
      else merged.push({ zone: [z.zone[0], z.zone[1]], william: z.william, touch: 1, j: z.j, type: z.type });
    }
    let supBelow = [], resAbove = [], inside = null;
    for (const z of merged) {
      const [lo, hi] = z.zone; if (!(hi >= lo)) continue;
      if (hi < C) supBelow.push(z); else if (lo > C) resAbove.push(z); else inside = z;
    }
    supBelow.sort((a, b) => b.zone[1] - a.zone[1]); resAbove.sort((a, b) => a.zone[0] - b.zone[0]);
    const ns = supBelow[0], nr = resAbove[0];
    ctx.support = ns ? ns.zone : null; ctx.resistance = nr ? nr.zone : null;
    ctx.supports = supBelow.slice(0, 3).map(z => ({ zone: z.zone, william: z.william, touch: z.touch }));
    ctx.resists = resAbove.slice(0, 3).map(z => ({ zone: z.zone, william: z.william, touch: z.touch }));
    const dS = ns ? (C - ns.zone[1]) / atr : 99, dR = nr ? (nr.zone[0] - C) / atr : 99;
    if (dS < 1 || dR < 1) fire('fraktal_destek', (dS < 1 ? 1 : 0) - (dR < 1 ? 1 : 0) || (dS < dR ? 0.3 : -0.3),
      `${ns ? 'Destek ' + fmt(ns.zone[1]) + ' (' + dS.toFixed(1) + ' ATR)' : ''}${ns && nr ? ' · ' : ''}${nr ? 'Direnç ' + fmt(nr.zone[0]) + ' (' + dR.toFixed(1) + ' ATR)' : ''}`);
    // William
    const wSup = supBelow.find(z => z.william), wRes = resAbove.find(z => z.william);
    if (inside && inside.william) fire('william_bolge', inside.type === 'L' ? 0.7 : -0.7, `${inside.type === 'L' ? 'William destek' : 'William direnç'} bölgesinin içinde`);
    else if (wSup && (C - wSup.zone[1]) < 1.5 * atr) fire('william_bolge', 0.6, `William destek ${fmt(wSup.zone[0])}–${fmt(wSup.zone[1])} hemen altta`);
    else if (wRes && (wRes.zone[0] - C) < 1.5 * atr) fire('william_bolge', -0.6, `William direnç ${fmt(wRes.zone[0])}–${fmt(wRes.zone[1])} hemen üstte`);
    // William geçişi: son 3 mumda bir William tepe bölgesinin üstüne kapanış
    for (const z of zones) {
      if (!z.william || z.type !== 'H') continue;
      if (C > z.zone[1] && c[i - 3] <= z.zone[1] && i - z.j > 3) { fire('william_gecis', volOK ? 1 : 0.3, `William direnci ${fmt(z.zone[1])} geçildi${volOK ? ' (hacimli)' : ', hacim ikna etmiyor'}`); break; }
    }
    // Pinler
    const body = Math.abs(c[i] - o[i]), upPin = h[i] - Math.max(o[i], c[i]), dnPin = Math.min(o[i], c[i]) - l[i], rg = h[i] - l[i];
    if (rg > 0.8 * atr && upPin > 2 * body && upPin > 0.5 * rg && C > s20) fire('ust_pin', -1, `Üst pin gövdenin ${(upPin / Math.max(body, 1e-12)).toFixed(1)} katı`);
    if (rg > 0.8 * atr && dnPin > 2 * body && dnPin > 0.5 * rg && (dS < 1.5 || (ns && l[i] <= ns.zone[1]))) fire('alt_pin', 1, 'Destekte uzun alt pin: alıcılar karşıladı');
    // Bölgeye yaklaşma hacmi
    if (ns && dS < 1) {
      const v3 = (v[i] + v[i - 1] + v[i - 2]) / 3, vr = v3 / (I.volSma20[i - 3] || v3);
      fire('bolge_yaklasma', vr < 0.9 ? 1 : vr > 1.3 ? -1 : 0.2, vr < 0.9 ? 'Desteğe hacimsiz geliyor: sekme ihtimali' : vr > 1.3 ? 'Desteğe hacimli geliyor: kırılım riski' : 'Desteğe normal hacimle yaklaşıyor');
    }
    const stackS = supBelow.filter(z => (C - z.zone[1]) < 3 * atr).length, stackR = resAbove.filter(z => (z.zone[0] - C) < 3 * atr).length;
    if (stackS >= 2 || stackR >= 2) fire('destek_ust_uste', clamp((stackS - stackR) / 2, -1, 1), `3 ATR içinde ${stackS} destek, ${stackR} direnç`);
    // Destek kırılımı
    for (const z of zones) {
      if (z.type !== 'L' || i - z.j < 3) continue;
      if (C < z.zone[0] && c[i - 1] >= z.zone[0]) { fire('destek_kirildi', volOK ? -1 : -0.4, `Destek ${fmt(z.zone[0])} kırıldı${volOK ? ' (hacimli)' : ' (hacimsiz, fake olabilir)'}`); break; }
    }

    // Fibonacci (son onaylı swing)
    if (zz.length >= 2) {
      const A = zz[zz.length - 2], B = zz[zz.length - 1];
      const start = A.price, end = B.price, span = start - end; // level(r) = end + r*span
      const lvl = r => end + r * span;
      const up = B.type === 'H';
      const rNow = (C - end) / span;      // up: r = (end-C)/(end-start)
      let rMinSince = Infinity, rMaxSince = -Infinity;
      for (let q = B.j + 1; q <= i; q++) {
        const rh = (h[q] - end) / span, rl = (l[q] - end) / span;
        rMinSince = Math.min(rMinSince, rh, rl); rMaxSince = Math.max(rMaxSince, rh, rl);
      }
      ctx.fib = { dir: up ? 'up' : 'down', start, end, startJ: A.j, endJ: B.j, r: rNow, levels: FIB.map(r => ({ r, price: lvl(r) })) };
      const rPrev = (c[i - 1] - end) / span;
      if (up) {
        if (rNow >= 0 && rNow < 0.382) fire('fib_sig', 1, `Geri çekilme ${rNow.toFixed(3)}: 0.382 üstünde`);
        else if (rNow >= 0.382 && rNow <= 0.618) fire('fib_sig', 0.2, `Geri çekilme ${rNow.toFixed(3)}: 0.382–0.618 arası`);
        else if (rNow > 0.618 && rNow <= 1) fire('fib_sig', -0.6, `Geri çekilme ${rNow.toFixed(3)}: 0.618 altı`);
        if (rMaxSince > 0.55 && rMaxSince < 0.7 && rNow < 0.55 && green) fire('fib_618_donus', 1, `0.618 bölgesinden (${fmt(lvl(0.618))}) dönüş`);
        if (rNow > 0.618 && rPrev <= 0.618) fire('fib_618_kirilim', volOK ? -1 : -0.4, `0.618 (${fmt(lvl(0.618))}) kırıldı${volOK ? ', hacimli → hedef 1.618 ' + fmt(lvl(1.618)) : ', hacimsiz'}`);
        else if (rNow > 0.618 && rNow < 1.2) fire('fib_618_kirilim', -0.5, `0.618 altında, 1.618 hedefi ${fmt(lvl(1.618))}`);
        if (rMinSince <= -0.25 && rNow > rMinSince + 0.1) fire('fib_272', -1, `−0.272 (${fmt(lvl(-0.272))}) görüldü → 0.707/0.786 (${fmt(lvl(0.707))}/${fmt(lvl(0.786))}) beklenir`);
        if (rNow > 0.382 && rPrev <= 0.382 && !volOK) fire('fib_382_hacimsiz', 0.5, '0.382 hacimsiz kırıldı: zayıf satış, yukarı atma ihtimali');
      } else {
        // aşağı swing: r = toparlanma oranı
        if (rNow >= 0.786 && rMaxSince >= 0.786) {
          let brk = -1; for (let q = i; q > B.j; q--) { if ((c[q] - end) / span >= 0.786 && (c[q - 1] - end) / span < 0.786) { brk = q; break; } }
          const bv = brk > 0 && I.volSma20[brk - 1] > 0 ? v[brk] / I.volSma20[brk - 1] : 0;
          if (rNow < 1.114) fire('fib_786_gecis', bv >= 1.5 ? 1 : 0.4, `0.786 ${bv >= 1.5 ? 'hacimli' : 'hacimsiz'} geçildi → hedef 1.114 (${fmt(lvl(1.114))}), sonra 1.618 (${fmt(lvl(1.618))})`);
        }
        if (rNow >= 1.0 && rNow < 1.114) fire('fib_1114', -0.6, `1.114 (${fmt(lvl(1.114))}) hemen üstte: kapı gibi durur`);
        if (rNow >= 1.114 && rPrev < 1.114) fire('fib_1114', volOK ? 1 : 0.5, `1.114 kırıldı → 1.272 (${fmt(lvl(1.272))}) / 1.414 (${fmt(lvl(1.414))})`);
        if (rMaxSince >= 1.1 && rNow < 1.0) fire('fib_1114_red', -1, `${rMaxSince >= 1.27 ? '1.272' : '1.114'} seviyesinden red, üzerinde kalamadı`);
        if (rMinSince <= -0.25 && rNow > rMinSince + 0.1) fire('fib_272', 1, `−0.272 (${fmt(lvl(-0.272))}) görüldü → 0.707/0.786 (${fmt(lvl(0.707))}/${fmt(lvl(0.786))}) ister`);
        if (rNow > 0.382 && rPrev <= 0.382 && !volOK) fire('fib_382_hacimsiz', -0.5, '0.382 hacimsiz geçildi: yükseliş güçlü değil');
        if (rNow >= 0.382 && rNow < 0.786) fire('fib_sig', 0.3, `Toparlanma ${rNow.toFixed(3)}`);
      }
    }
    // Trend temelli fib (3 nokta): L-H-L (yükseliş) / H-L-H (düşüş)
    if (zz.length >= 3) {
      const [P1, P2, P3] = zz.slice(-3), rng = P2.price - P1.price;
      if (P1.type === 'L' && P3.type === 'L' && rng > 0) {
        const yatay = Math.abs(P3.price - P1.price) < 0.15 * rng;
        const tgt = [0.382, 0.618, 1, 1.272, 1.618].map(k => ({ k, price: P3.price + k * rng }));
        ctx.tfib = { dir: 'up', anchor: P3.price, targets: tgt, valid: !yatay && C > P3.price };
        if (yatay) {} // yatay yapıda çizilmez
        else if (C < P3.price) fire('tfib', -1, `Trend temelli fib iptal: ${fmt(P3.price)} altı`);
        else { const nxt = tgt.find(t => t.price > C); fire('tfib', 0.6, `Geçerli; sıradaki hedef ${nxt ? nxt.k + ' → ' + fmt(nxt.price) : '1.618 üstü'}`); }
      } else if (P1.type === 'H' && P3.type === 'H' && rng < 0) {
        const tgt = [0.382, 0.618, 1, 1.272, 1.618].map(k => ({ k, price: P3.price + k * rng }));
        ctx.tfib = { dir: 'down', anchor: P3.price, targets: tgt, valid: C < P3.price };
        if (C > P3.price) fire('tfib', 0.5, `Düşüş trend fib\'i iptal: ${fmt(P3.price)} üstü`);
        else { const nxt = tgt.find(t => t.price < C); fire('tfib', -0.6, `Düşüş hedefi ${nxt ? nxt.k + ' → ' + fmt(nxt.price) : ''}`); }
      }
      // Schiff dirgeni
      const p1 = { x: P1.j, y: P1.price }, p2 = { x: P2.j, y: P2.price }, p3 = { x: P3.j, y: P3.price };
      const s1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, m = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
      if (m.x > s1.x) {
        const slope = (m.y - s1.y) / (m.x - s1.x);
        const med = s1.y + slope * (i - s1.x), hA = p2.y + slope * (i - p2.x), hB = p3.y + slope * (i - p3.x);
        const lo = Math.min(hA, hB), hi = Math.max(hA, hB), u = (C - lo) / (hi - lo);
        ctx.dirgen = { median: med, lo, hi, u };
        if (u > 1.05) fire('dirgen', slope > 0 ? 0.6 : 0.8, 'Dirgenin üstüne çıktı (yeni zirve arayışı / iptal)');
        else if (u < -0.05) fire('dirgen', -1, 'Dirgenin altına düştü: dirgen iptal');
        else fire('dirgen', C > med ? 0.6 : -0.6, `Dirgen içinde, medyanın ${C > med ? 'üstünde' : 'altında'}`);
      }
      // Fib kanalı: iki dip hattı, aradaki tepeye paralel
      if (P1.type === 'L' && P3.type === 'L' && P3.j > P1.j) {
        const sl = (P3.price - P1.price) / (P3.j - P1.j), base = P1.price + sl * (i - P1.j), width = P2.price - (P1.price + sl * (P2.j - P1.j));
        if (width > 0) {
          const w = (C - base) / width; ctx.kanal = { pos: w };
          if (w < 0) fire('fib_kanal', -1, 'Kanal tabanı aşağı kırıldı');
          else if (w > 1) fire('fib_kanal', 0.8, 'Kanal tavanı yukarı kırıldı');
        }
      }
    }
    // Fib hız fanı: son yukarı swing (dip → tepe)
    {
      let a = null, b = null;
      for (let q = zz.length - 1; q > 0; q--) if (zz[q].type === 'H' && zz[q - 1].type === 'L') { a = zz[q - 1]; b = zz[q]; break; }
      if (a && b && b.j > a.j) {
        const lineAt = r => a.price + (b.price - r * (b.price - a.price) - a.price) * (i - a.j) / (b.j - a.j);
        const f786 = lineAt(0.786), f382 = lineAt(0.382), f618 = lineAt(0.618);
        ctx.fan = { f382, f618, f786 };
        if (C < f786) fire('hiz_fani', -1, `Hız fanı 0.786 hattı (${fmt(f786)}) altında: düşüş trendine girdi`);
        else if (C > f382) fire('hiz_fani', 1, 'Hız fanı 0.382 hattı üstünde');
        else if (C < f618) fire('hiz_fani', -0.4, '0.618 fan hattı altında');
      }
    }

    // ═════════ PARA AKIŞI ═════════
    const cmf = at(I.cmf), mfi = at(I.mfi), di = at(I.di);
    if (isF(cmf)) fire('cmf_sifir', cmf > 0 ? Math.min(1, 0.4 + cmf * 4) : Math.max(-1, -0.4 + cmf * 4), `CMF ${cmf.toFixed(2)}`);
    if (isF(mfi)) fire('mfi_50', mfi > 50 ? 1 : -1, `MFI ${mfi.toFixed(0)}`);
    // Kırılım hacmi (son 3 mumda son tepe üstü kapanış)
    if (lastHigh && C > lastHigh.price && c[i - 3] <= lastHigh.price) {
      let bq = i; for (let q = i; q > i - 3; q--) if (c[q] > lastHigh.price && c[q - 1] <= lastHigh.price) bq = q;
      const br = I.volSma20[bq - 1] > 0 ? v[bq] / I.volSma20[bq - 1] : 1;
      fire('kirilim_hacmi', br >= 1.5 ? 1 : -0.7, `Tepe ${fmt(lastHigh.price)} kırılımı, hacim ×${br.toFixed(1)}${br < 1.5 ? ' → fake-out riski' : ''}`);
    }
    let mfiMin = Infinity; for (let q = 0; q < 3; q++) mfiMin = Math.min(mfiMin, I.mfi[i - q]);
    if (mfiMin <= 10) fire('mfi_10', 1, `MFI ${mfiMin.toFixed(0)}'a indi`);
    if (mfi >= 90) fire('mfi_90', -1, `MFI ${mfi.toFixed(0)}`);
    if (crossUp(I.cmf, 0, 3)) fire('cmf_kesis', 1, 'CMF sıfırı yukarı kesti');
    else if (crossDn(I.cmf, 0, 3)) fire('cmf_kesis', -1, 'CMF sıfırın altına indi');
    if (C > c[i - 5] && cmf < 0) fire('cmf_yaniltici', -1, 'Fiyat 5 mumda yükseldi ama CMF negatif');
    if (cmf > 0.2) fire('cmf_guclu', 1, `CMF ${cmf.toFixed(2)}`);
    if (isF(di)) {
      fire('di_sifir', di > 0 ? 1 : -1, `Demand Index ${di.toFixed(2)}`);
      const dP = C / c[i - 5] - 1, dD = di - I.di[i - 5];
      if (dP < -0.03 && dD >= 0) fire('di_sahte', 1, 'Fiyat düşerken talep sabit/yükseliyor');
      if (dP > 0.03 && dD < -0.1) fire('di_zayif', -1, 'Fiyat artarken talep azalıyor');
    }
    if (ctx.yatay && I.volSma20[i] < 0.7 * I.volSma100[i]) fire('hacimsiz_yatay', -1, 'Hacimsiz yatay: mal toplanıyor ya da dağıtılıyor');
    const dvM = this.divergence(I.mfi, i, 'MFI'); if (dvM) fire('mfi_uyumsuz', dvM.v, dvM.note);

    // ═════════ MOMENTUM ═════════
    const rsi = at(I.rsi);
    if (isF(rsi)) {
      fire('rsi_50', rsi > 50 ? 1 : -1, `RSI ${rsi.toFixed(0)}`);
      if (crossUp(I.rsi, 50, 3)) fire('rsi_50_kesis', 1, 'RSI 50\'yi aşağıdan kesti');
      if (rsi < 50) fire('rsi_50_alti', -1, `RSI ${rsi.toFixed(0)}`);
      let mx10 = -1; for (let q = 1; q <= 10; q++) mx10 = Math.max(mx10, I.rsi[i - q]);
      if (mx10 > 70 && rsi >= 50 && rsi < 62 && rsi < I.rsi[i - 2]) fire('rsi_yukaridan', -1, 'RSI 70\'ten aşağı geliyor');
      if (rsi > 70) fire('rsi_70', 1, `RSI ${rsi.toFixed(0)}: güçlü yapı, tepe uyumsuzluğu izlenmeli`);
      let mx30 = -1; for (let q = 0; q < 30; q++) mx30 = Math.max(mx30, I.rsi[i - q]);
      if (mx30 < 70 && C > s50) fire('rsi_70_yok', -1, `30 mumdur RSI 70'i göremedi (en yüksek ${mx30.toFixed(0)})`);
    }
    const dvR = this.divergence(I.rsi, i, 'RSI');
    if (dvR) {
      fire('rsi_uyumsuz', dvR.v * (ctx.yatay ? 0.5 : 1), dvR.note + (ctx.yatay ? ' (yatayda, zayıf)' : ''));
      if (dvR.v > 0 && green) fire('rsi_dip_yesil', 1, 'Dip uyumsuzluğu yeşil mumla teyit edildi');
      if (dvR.v < 0) ctx.tepeUyumsuz = true;
    }
    // RSI trend çizgisi kırılımı
    const rp = this.rsiPiv.filter(p => i - p.j <= 60);
    if (rp.length >= 2) {
      const [R1, R2] = rp.slice(-2);
      if (R2.val < R1.val && R2.j > R1.j) {
        const lineAt = k => R1.val + (R2.val - R1.val) * (k - R1.j) / (R2.j - R1.j);
        let br = false; for (let q = 0; q < 3; q++) if (I.rsi[i - q] > lineAt(i - q) && I.rsi[i - q - 1] <= lineAt(i - q - 1)) br = true;
        if (br) fire('rsi_trend', C < (lastHigh ? lastHigh.price : Infinity) ? 1 : 0.5, 'RSI düşen trend çizgisini kırdı (fiyattan önce)');
      }
    }
    const mc = at(I.macd), ms = at(I.macdSig), mh = at(I.macdHist);
    if (isF(ms)) {
      ctx.macdBull = mc > ms;
      fire('macd_sinyal', mc > ms ? 1 : -1, `MACD ${mc > ms ? '>' : '<'} sinyal`);
      fire('macd_sifir', mc > 0 ? 1 : -1, `MACD ${mc > 0 ? 'sıfır üstü' : 'sıfır altı'}`);
      if (crossUp(I.macd, I.macdSig, 3) && mc > 0) fire('macd_0_kesis', 1, 'Sıfır üstünde yukarı kesişim');
      else if (crossUp(I.macd, I.macdSig, 3)) fire('macd_0_kesis', 0.3, 'Sıfır altında kesişim (zayıf)');
      else if (crossDn(I.macd, I.macdSig, 3)) fire('macd_0_kesis', -1, 'Aşağı kesişim');
      const hw = Math.abs(mh) > Math.abs(I.macdHist[i - 1]) && Math.abs(I.macdHist[i - 1]) > Math.abs(I.macdHist[i - 2]);
      if (hw) fire('macd_aci', Math.sign(mh), 'Histogram 3 mumdur büyüyor');
      const dvMa = this.divergence(I.macd, i, 'MACD');
      if (dvMa) fire('macd_uyumsuz', dvMa.v * (dvMa.v > 0 && mc < 0 ? 0.5 : 1), dvMa.note + (dvMa.v > 0 && mc < 0 ? ' (0 altında, riskli)' : ''));
    }
    const sm = at(I.smi), ss = at(I.smiSig);
    if (isF(ss)) {
      let minS = Infinity, maxS = -Infinity; for (let q = 0; q < 5; q++) { minS = Math.min(minS, I.smi[i - q]); maxS = Math.max(maxS, I.smi[i - q]); }
      if (crossUp(I.smi, I.smiSig, 3) && minS < -0.5) fire('smi_giris', 1, `SMI ${minS.toFixed(2)}'den döndü`);
      if (crossDn(I.smi, I.smiSig, 3) && maxS > 0.5) fire('smi_tepe', -1, `SMI ${maxS.toFixed(2)}'den döndü`);
    }
    if (isF(at(I.fisher))) {
      if (crossUp(I.fisher, I.fisherTrig, 2) && at(I.fisher) < 0) fire('fisher', 1, 'Fisher sıfır altında yukarı kesti');
      else if (crossDn(I.fisher, I.fisherTrig, 2) && at(I.fisher) > 0) fire('fisher', -1, 'Fisher sıfır üstünde aşağı kesti');
    }
    if (isF(at(I.wt2))) {
      if (crossUp(I.wt1, I.wt2, 3) && Math.min(I.wt1[i], I.wt1[i - 1], I.wt1[i - 2]) < -53) fire('wt', 1, 'WT −53 altında yukarı kesişim');
      else if (crossDn(I.wt1, I.wt2, 3) && Math.max(I.wt1[i], I.wt1[i - 1], I.wt1[i - 2]) > 53) fire('wt', -1, 'WT +53 üstünde aşağı kesişim');
    }
    const vpI = at(I.viP), vmI = at(I.viM);
    if (isF(vpI)) {
      fire('vortex', vpI > vmI ? 1 : -1, `VI+ ${vpI.toFixed(2)} / VI− ${vmI.toFixed(2)}`);
      const gap = vpI - vmI, gap3 = I.viP[i - 3] - I.viM[i - 3];
      if (crossUp(I.viP, I.viM, 3)) fire('vortex_agiz', 1, 'VI+ VI−\'yi yukarı kesti');
      else if (crossDn(I.viP, I.viM, 3)) fire('vortex_agiz', -1, 'VI− VI+\'yı yukarı kesti');
      else if (Math.abs(gap) > Math.abs(gap3) + 0.05) fire('vortex_agiz', Math.sign(gap) * 0.7, 'Vortex ağzı açılıyor');
    }

    // ═════════ ZAMAN DİLİMİ ═════════
    if (this.wkCloses.length >= 8) {
      const wk = this.wkCloses.slice(-8), w9 = (wk.reduce((s, x) => s + x, 0) + C) / 9;
      ctx.weekMa9 = w9;
      fire('hafta_ma9', C > w9 ? 1 : -1, `Haftalık MA9 ${fmt(w9)} ${C > w9 ? 'üstünde' : 'altında'}`);
    }
    if (tf4 && tf4.I && tf4.i > 210) {
      const J = tf4.I, k = tf4.i, c4 = tf4.d.c[k];
      const up4 = J.ema5[k] > J.ema10[k];
      fire('tf4_ema', up4 === ctx.emaUp ? (up4 ? 1 : -1) : (up4 ? 0.3 : -0.6), `4s EMA5/10 ${up4 ? 'yukarı' : 'aşağı'}, günlük ${ctx.emaUp ? 'yukarı' : 'aşağı'}`);
      const below4 = c4 < J.sma9[k] && c4 < J.sma20[k] && c4 < J.sma50[k];
      if (below4 && ctx.emaUp) fire('tf4_bozulma', -1, '4s fiyat MA9/20/50 altına indi, günlük henüz yukarı');
      const above4 = [J.sma9[k], J.sma20[k], J.sma50[k], J.sma100[k], J.sma200[k]].every(m => c4 > m);
      if (above4 && has200 && C < s200) fire('tf4_erken', 1, '4s tüm ortalamaların üstünde, günlük MA200 altında');
      ctx.tf4 = { emaUp: up4, aboveAll: above4, belowFast: below4 };
    }

    return this.score(out, ctx, i);
  };

  Walker.prototype.divergence = function (osc, i, name) {
    const { d } = this;
    const piv = this.zones; // onaylı fraktallar
    const look = (type) => piv.filter(p => p.type === type && i - p.j <= 45).slice(-2);
    const oscAt = (j, fn) => { let x = fn === 'max' ? -Infinity : Infinity; for (let q = j - 2; q <= j + 2; q++) { const y = osc[q]; if (isF(y)) x = fn === 'max' ? Math.max(x, y) : Math.min(x, y); } return x; };
    const H = look('H');
    if (H.length === 2 && i - H[1].j <= 12 && H[1].j - H[0].j >= 5 && H[1].j - H[0].j <= 40) {
      const a = oscAt(H[0].j, 'max'), b = oscAt(H[1].j, 'max');
      if (H[1].price > H[0].price && b < a - (name === 'MACD' ? Math.abs(a) * 0.1 : 2)) return { v: -1, note: `${name} tepe uyumsuzluğu: fiyat yeni tepe, ${name} alçak tepe` };
    }
    const L = look('L');
    if (L.length === 2 && i - L[1].j <= 12 && L[1].j - L[0].j >= 5 && L[1].j - L[0].j <= 40) {
      const a = oscAt(L[0].j, 'min'), b = oscAt(L[1].j, 'min');
      if (L[1].price < L[0].price && b > a + (name === 'MACD' ? Math.abs(a) * 0.1 : 2)) return { v: 1, note: `${name} dip uyumsuzluğu: fiyat yeni dip, ${name} yükselen dip` };
    }
    return null;
  };

  // ───────────────────────── Skorlama ─────────────────────────
  const MAXABS = {};
  for (const m in MODULES) MAXABS[m] = { K: 0, S: 0 };
  for (const r of RULES) MAXABS[r.mod][r.tier] += r.w;

  Walker.prototype.score = function (fired, ctx, i) {
    const opts = this.opts, ws = opts.sezgiselW ?? 0.6, useGates = opts.gates !== false;
    const ruleW = opts.ruleWeights || {}; // kural bazında çarpan (geri testten)
    // MACD vetosu (S): MACD boğa ise negatif momentum puanları yarıya iner
    const veto = ctx.macdBull === true;
    const pts = fired.map(f => {
      const R = RULE[f.id]; let p = f.v * R.w * (ruleW[f.id] ?? 1);
      if (veto && R.mod === 'mom' && p < 0 && f.id !== 'macd_sinyal') p *= 0.5;
      return { ...f, tier: R.tier, mod: R.mod, p };
    });
    const off = new Set(ctx.tf4 ? [] : ['tf4_ema', 'tf4_bozulma', 'tf4_erken']);
    const modScore = (mod, tiers, wS) => {
      let raw = 0, cap = 0;
      for (const R of RULES) if (R.mod === mod && tiers.includes(R.tier) && !off.has(R.id)) cap += R.w * (R.tier === 'S' ? wS : 1);
      for (const x of pts) if (x.mod === mod && tiers.includes(x.tier)) raw += x.p * (x.tier === 'S' ? wS : 1);
      if (cap === 0) return 50;
      return clamp(50 + 50 * raw / (0.45 * cap), 0, 100);
    };
    const comp = (tiers, wS) => {
      let s = 0, wt = 0; const mods = {};
      for (const m in MODULES) { const v = modScore(m, tiers, wS); mods[m] = v; s += v * MODULES[m].w; wt += MODULES[m].w; }
      return { total: s / wt, mods };
    };
    const kes = comp(['K'], 1), sez = comp(['S'], 1), all = comp(['K', 'S'], ws);
    const gates = [];
    const C = this.d.c[i];
    if (isF(this.I.sma200[i]) && C < this.I.sma200[i]) gates.push('g_ma200');
    if (ctx.emaUp === false) gates.push('g_ema');
    if (this.I.rsi[i] < 50) gates.push('g_rsi');
    let cap = 100; if (useGates) for (const g of gates) cap = Math.min(cap, GATES.find(x => x.id === g).cap);
    const final = Math.min(all.total, cap);
    const badges = [];
    if (ctx.dip && ctx.dip.stage === 3) badges.push({ k: 'akum', t: 'Dip sıkışmasından çıkış' });
    else if (ctx.dip && ctx.dip.stage === 2) badges.push({ k: 'akum', t: 'Sıkışma · kırılım eşiğinde' });
    else if (ctx.dip && ctx.dip.stage === 1) badges.push({ k: 'sik', t: 'Maliyetlenme sürüyor' });
    if (ctx.tepeUyumsuz) badges.push({ k: 'kar', t: 'Tepe uyumsuzluğu · kâr al' });
    if (pts.some(x => (x.id === 'kirilim_hacmi' || x.id === 'william_gecis') && x.v < 0.5)) badges.push({ k: 'fake', t: 'Fake-out riski' });
    if (pts.some(x => x.id === 'fib_1114_red')) badges.push({ k: 'red', t: '1.114 reddi' });
    if (pts.some(x => x.id === 'mfi_10')) badges.push({ k: 'mfi10', t: 'MFI 10 teması' });
    if (pts.some(x => x.id === 'trend_kirilim' && x.v <= -1)) badges.push({ k: 'kirilim', t: 'Trend kırıldı' });
    return { i, t: this.d.t ? this.d.t[i] : i, close: C, score: final, raw: all.total, cap: useGates ? cap : 100,
      kesin: Math.min(kes.total, useGates ? cap : 100), sezgisel: Math.min(sez.total, useGates ? cap : 100),
      kesinRaw: kes.total, sezgiselRaw: sez.total,
      mods: all.mods, modsK: kes.mods, modsS: sez.mods, gates, veto, rules: pts, badges, label: label(final), ctx,
      dip: ctx.dip && ctx.dip.stage !== 0 ? ctx.dip.score : 0, dipStage: ctx.dip ? ctx.dip.stage : 0 };
  };

  function label(s) {
    if (s >= 75) return { k: 'gp', t: 'Güçlü Pozitif' };
    if (s >= 60) return { k: 'p', t: 'Pozitif' };
    if (s >= 45) return { k: 'n', t: 'Nötr' };
    if (s >= 30) return { k: 'z', t: 'Zayıf' };
    return { k: 'k', t: 'Kaçın' };
  }

  function fmt(x) {
    if (!isF(x)) return '—';
    const a = Math.abs(x);
    const dg = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 3 : a >= 0.01 ? 4 : 6;
    return x.toLocaleString('tr-TR', { minimumFractionDigits: dg, maximumFractionDigits: dg });
  }

  // ───────────────────────── Üst seviye API ─────────────────────────
  function analyze(d, opts, d4) {
    opts = opts || {};
    const I = indicators(d), w = new Walker(d, I, opts);
    const i = opts.useOpen ? d.c.length - 1 : d.c.length - 2; // varsayılan: son KAPANMIŞ mum
    if (i < 210) return null;
    let tf4 = null;
    if (d4 && d4.c.length > 220) {
      const J = indicators(d4); const tEnd = d.t[i] + 864e5; // günlük mumun kapanışına kadar
      let k = d4.c.length - 2; while (k > 0 && d4.t[k] + 4 * 36e5 > tEnd) k--;
      if (opts.useOpen) k = d4.c.length - 1;
      tf4 = { I: J, d: d4, i: k };
    }
    const res = w.evaluate(i, tf4);
    res.I = I; return res;
  }

  // Geri test: her mumda değerlendir, ileri getirileri topla
  function backtest(seriesList, opts) {
    opts = opts || {};
    const H = opts.horizons || [3, 7, 14];
    const recs = [];
    for (const s of seriesList) collect(s, opts, recs);
    return summarize(recs, H);
  }
  // Tek parite için gözlemleri toplar (sayfada parça parça çalıştırmak için)
  function collect(s, opts, recs) {
    opts = opts || {}; recs = recs || [];
    const H = opts.horizons || [3, 7, 14];
    {
      const d = s.d; if (d.c.length < 260) return recs;
      const I = indicators(d), w = new Walker(d, I, opts);
      const maxH = Math.max(...H), n = d.c.length, stages = [], startK = recs.length;
      for (let i = 210; i < n - 1 - maxH; i++) {
        const r = w.evaluate(i, null);
        const fwd = {}; for (const h of H) fwd[h] = d.c[i + h] / d.c[i] - 1;
        const fired = {}; for (const x of r.rules) fired[x.id] = x.v;
        stages[i] = r.dipStage;
        recs.push({ sym: s.sym, i, score: r.score, kesin: r.kesin, sezgisel: r.sezgisel, raw: r.raw, gates: r.gates, fired, fwd,
          dipStage: r.dipStage, f30: i + 30 < n ? d.c[i + 30] / d.c[i] - 1 : N, f60: i + 60 < n ? d.c[i + 60] / d.c[i] - 1 : N });
      }
      // Dip sıkışması olay testi: aşamaya ilk giriş günleri (40 gün soğuma)
      recs.events = recs.events || [];
      const last = { 1: -999, 2: -999, 3: -999 };
      for (let i = 211; i < stages.length; i++) {
        for (const sg of [1, 2, 3]) {
          if (stages[i] === sg && stages[i - 1] !== sg && i - last[sg] > 40 && i + 60 < n) {
            last[sg] = i;
            let mx = -Infinity, mn = Infinity; for (let q = i + 1; q <= i + 60; q++) { mx = Math.max(mx, d.h[q]); mn = Math.min(mn, d.l[q]); }
            recs.events.push({ sym: s.sym, stage: sg, i, t: d.t ? d.t[i] : i, f14: d.c[i + 14] / d.c[i] - 1, f30: d.c[i + 30] / d.c[i] - 1, f60: d.c[i + 60] / d.c[i] - 1, mfe: mx / d.c[i] - 1, mae: mn / d.c[i] - 1 });
          }
        }
      }
    }
    return recs;
  }

  function meanSd(a) { const n = a.length; if (!n) return { m: N, sd: N, n: 0 }; const m = a.reduce((s, x) => s + x, 0) / n; const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, n - 1)); return { m, sd, n }; }

  function summarize(recs, H) {
    const hMain = H.includes(7) ? 7 : H[0];
    const base = {}; for (const h of H) base[h] = meanSd(recs.map(r => r.fwd[h]));
    const baseWin = recs.filter(r => r.fwd[hMain] > 0).length / Math.max(1, recs.length);
    // Kurallar: olumlu ateşleme (v>0) ve olumsuz ateşleme (v<0) ayrı ölçülür
    const rules = [];
    for (const R of RULES) {
      for (const side of [1, -1]) {
        const sel = recs.filter(r => r.fired[R.id] != null && Math.sign(r.fired[R.id]) === side);
        if (sel.length < 15) continue;
        const st = {}; for (const h of H) st[h] = meanSd(sel.map(r => r.fwd[h]));
        const edge = st[hMain].m - base[hMain].m;
        // Örtüşen getiriler nedeniyle etkin örneklem ≈ n / h; t buna göre düzeltilir
        const nEff = Math.max(2, sel.length / hMain);
        const t = edge / (st[hMain].sd / Math.sqrt(nEff));
        const win = sel.filter(r => r.fwd[hMain] > 0).length / sel.length;
        const dirT = t * side; // beklenen yönde ise pozitif
        const verdict = dirT > 2 ? 'destek' : dirT > 0.5 ? 'zayif' : dirT < -2 ? 'ters' : 'yok';
        rules.push({ id: R.id, label: R.label, mod: R.mod, tier: R.tier, p: R.p, side, n: sel.length, mean: st, edge, t, dirT, win, verdict });
      }
    }
    // Skor kovaları
    const buckets = [[0, 30], [30, 45], [45, 60], [60, 75], [75, 101]];
    const bucketStats = key => buckets.map(([a, b]) => { const sel = recs.filter(r => r[key] >= a && r[key] < b); const st = {}; for (const h of H) st[h] = meanSd(sel.map(r => r.fwd[h])); return { a, b, n: sel.length, mean: st, win: sel.filter(r => r.fwd[hMain] > 0).length / Math.max(1, sel.length) }; });
    // Spearman benzeri: skor ile ileri getiri arasındaki sıra korelasyonu
    const rankCorr = key => { const n = recs.length; if (n < 30) return N; const rk = a => { const idx = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = new Array(n); idx.forEach(([, i], k) => r[i] = k); return r; }; const a = rk(recs.map(r => r[key])), b = rk(recs.map(r => r.fwd[hMain])); const ma = (n - 1) / 2; let s = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - ma); sa += (a[i] - ma) ** 2; sb += (b[i] - ma) ** 2; } return s / Math.sqrt(sa * sb); };
    // Kapılar
    const gateStats = GATES.map(g => { const sel = recs.filter(r => r.gates.includes(g.id)), rest = recs.filter(r => !r.gates.includes(g.id)); return { id: g.id, label: g.label, n: sel.length, mean: meanSd(sel.map(r => r.fwd[hMain])).m, restMean: meanSd(rest.map(r => r.fwd[hMain])).m }; });
    // Önerilen ağırlık çarpanları: kanıta göre 0.25–1.75
    const sugg = {};
    for (const R of RULES) {
      const rs = rules.filter(x => x.id === R.id); if (!rs.length) continue;
      const avg = rs.reduce((s, x) => s + clamp(x.dirT, -4, 4) * x.n, 0) / rs.reduce((s, x) => s + x.n, 0);
      sugg[R.id] = +clamp(1 + avg / 4, 0.25, 1.75).toFixed(2);
    }
    // Dip sıkışması: olay testi ve aşama içi getiriler (30/60 gün)
    const fin = a => a.filter(isF);
    const base30 = meanSd(fin(recs.map(r => r.f30))).m, base60 = meanSd(fin(recs.map(r => r.f60))).m;
    const ev = recs.events || [];
    const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : N; };
    const dipStages = [1, 2, 3].map(sg => {
      const E = ev.filter(e => e.stage === sg), inS = recs.filter(r => r.dipStage === sg);
      const f30 = E.map(e => e.f30);
      return { stage: sg, events: E.length, f14: meanSd(E.map(e => e.f14)).m, f30: meanSd(f30).m, f30med: med(f30), f60: meanSd(E.map(e => e.f60)).m,
        win30: E.filter(e => e.f30 > 0).length / Math.max(1, E.length), mfe: meanSd(E.map(e => e.mfe)).m, mae: meanSd(E.map(e => e.mae)).m,
        daysIn: inS.length, in30: meanSd(fin(inS.map(r => r.f30))).m, list: E.slice(-40) };
    });
    const brk = recs.filter(r => r.dipStage === -1);
    const dip = { base30, base60, base30win: fin(recs.map(r => r.f30)).filter(x => x > 0).length / Math.max(1, fin(recs.map(r => r.f30)).length), stages: dipStages,
      breakdown: { days: brk.length, in30: meanSd(fin(brk.map(r => r.f30))).m } };
    return { n: recs.length, symbols: [...new Set(recs.map(r => r.sym))], horizons: H, hMain, base, baseWin, rules, dip,
      buckets: { score: bucketStats('score'), kesin: bucketStats('kesin'), sezgisel: bucketStats('sezgisel') },
      corr: { score: rankCorr('score'), kesin: rankCorr('kesin'), sezgisel: rankCorr('sezgisel'), raw: rankCorr('raw') },
      gates: gateStats, suggestedWeights: sugg, generated: Date.now() };
  }

  const api = { MODULES, RULES, RULE, GATES, FIB, indicators, Walker, analyze, backtest, collect, summarize, label, fmt, version: '1.0.0' };
  root.CoinRadar = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
