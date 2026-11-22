/* ---------- SAR Radar grafiği: mumlar + SAR noktaları + üst dilim SAR Ort. + LRC kanal ve kesişme ---------- */
// sar_engine.mjs içindeki fonksiyonları kullanır (build_sar.mjs sayfaya gömer).
const CH = { view: 120, key: null, daily: null, tf: 'G', on: Object.assign({ med: true, sar: true, ort: true, lrc: true, kes: true, uyari: true }, LS.get('ch_on', {})), pick: null };
const SCOL = { psar: '#2962FF', lin: '#22c55e', luc: '#b821f3', slow: '#8b1a1a', mod: '#16a34a', fast: '#ef4444', ort: '#f97316' };
const OCOL = { G: '#a855f7', H: '#64748b', A: '#0d9488', '3A': '#06b6d4', '6A': '#f59e0b', '12A': '#dc2626' };
const NBAR = { '15m': 200, '4S': 180, G: 180, H: 160, A: 120 };
const INTRA = { '15m': '15m', '4S': '4h' };
const TZ = () => (M === 'borsa' ? 3 : 0);

async function intraData(k, tf) {
  const key = 'i:' + k + ':' + tf; CH.ic = CH.ic || {}; if (CH.ic[key] && Date.now() - CH.ic[key].at < 60e3) return CH.ic[key].d;
  for (const h of ['https://data-api.binance.vision', 'https://api.binance.com']) {
    try { const r = await fetch(`${h}/api/v3/klines?symbol=${k}USDT&interval=${INTRA[tf]}&limit=1000`); if (!r.ok) continue; const a = await r.json();
      const o = { t: [], o: [], h: [], l: [], c: [], v: [] }; for (const x of a) { o.t.push(x[0]); o.o.push(+x[1]); o.h.push(+x[2]); o.l.push(+x[3]); o.c.push(+x[4]); o.v.push(+x[7]); }
      if (o.c.length) { CH.ic[key] = { d: o, at: Date.now() }; return o; } } catch (e) {}
  }
  throw new Error('Binance ' + INTRA[tf]);
}
async function chartData(k) {
  const key = M + ':' + k; if (CH.key === key && CH.daily) return CH.daily;
  let d = null;
  if (M === 'makro') {
    const row = rows().find(z => z.k === k); if (!row || !row.def) throw new Error('tanım yok');
    const syms = makroSyms(row.def), r = await fetch('/.netlify/functions/yahoo?r=max&s=' + syms.map(encodeURIComponent).join(',')); if (!r.ok) throw new Error('Yahoo ' + r.status);
    d = makroBuild(row.def, await r.json());
  } else if (M === 'borsa') {
    const sym = k + '.IS';
    const r = await fetch('/.netlify/functions/yahoo?r=max&s=' + encodeURIComponent(sym)); if (!r.ok) throw new Error('Yahoo ' + r.status);
    d = (await r.json())[sym]; if (d && d.c) d = adjustSplits(d);
  } else {
    const sym = k + 'USDT', hosts = ['https://data-api.binance.vision', 'https://api.binance.com'];
    for (const h of hosts) {
      try {
        const o = { t: [], o: [], h: [], l: [], c: [], v: [] }; let st = 0;
        for (let p = 0; p < 8; p++) {
          const r = await fetch(`${h}/api/v3/klines?symbol=${sym}&interval=1d&limit=1000&startTime=${st}`); if (!r.ok) throw new Error(r.status);
          const a = await r.json(); if (!a.length) break;
          for (const x of a) { o.t.push(x[0]); o.o.push(+x[1]); o.h.push(+x[2]); o.l.push(+x[3]); o.c.push(+x[4]); o.v.push(+x[7]); }
          if (a.length < 1000) break; st = a[a.length - 1][0] + 1;
        }
        if (o.c.length) { d = o; break; }
      } catch (e) {}
    }
  }
  if (!d || !d.c || d.c.length < 30) throw new Error('veri yok');
  CH.key = key; CH.daily = d; return d;
}

function pkey(t, tf, tz) {
  const x = new Date(t + tz * 3600e3), y = x.getUTCFullYear(), m = x.getUTCMonth();
  if (tf === 'G') return Math.floor((t + tz * 3600e3) / 864e5);
  if (tf === 'H') { const day = (x.getUTCDay() + 6) % 7; return Math.floor((Date.UTC(y, m, x.getUTCDate()) - day * 864e5) / 864e5); }
  if (tf === 'A') return y * 12 + m; if (tf === '3A') return y * 4 + Math.floor(m / 3); if (tf === '6A') return y * 2 + Math.floor(m / 6); return y;
}

function chartModel(daily, tf, intra) {
  const tz = TZ(), b = intra || resample(daily, tf, tz), n = b.c.length, N = Math.min(NBAR[tf], n), from = n - N;
  const S = sarSet(b), cfg = MK[M];
  const sars = [...cfg.aktif, 'ort'].map(k => ({ k, v: S[k].s.slice(from) }));
  // üst zaman dilimi SAR Ort. (Pine: request.security, lookahead kapalı → o dönemin canlı değeri)
  const order = ['15m', '4S', 'G', 'H', 'A', '3A', '6A', '12A'], up = order.slice(order.indexOf(tf) + 1).filter(x => !INTRA[x]).filter(x => !intra || ['G', 'H', 'A'].includes(x)).filter(x => (M === 'borsa' || x !== '12A'));
  const orts = up.map(ht => {
    const hb = resample(daily, ht, tz), hs = sarSet(hb).ort.s, mp = new Map(); hb.t.forEach((t, i) => mp.set(pkey(t, ht, tz), hs[i]));
    return { tf: ht, v: b.t.slice(from).map(t => mp.get(pkey(t, ht, tz)) ?? null) };
  });
  // LRC 300 (yüksek/düşük regresyonu + ortalama mutlak sapma)
  let lrcL = null;
  if (n >= 302) {
    lrcL = { mh: [], ml: [], up: [], lo: [] };
    for (let i = from - 1; i < n; i++) { const a = linregAt(b.h, 300, i), c = linregAt(b.l, 300, i);
      lrcL.mh.push(a); lrcL.ml.push(c); lrcL.up.push(a == null ? null : a + devAt(b.h, 300, i)); lrcL.lo.push(c == null ? null : c - devAt(b.l, 300, i)); }
    lrcL.kes = [];
    for (let j = 1; j < lrcL.mh.length; j++) { const a0 = lrcL.mh[j - 1], b0 = lrcL.ml[j - 1], a1 = lrcL.mh[j], b1 = lrcL.ml[j];
      if (a0 == null || b0 == null) continue; if (a0 >= b0 && a1 < b1) lrcL.kes.push({ i: j - 1, tip: 'yesil' }); else if (a0 <= b0 && a1 > b1) lrcL.kes.push({ i: j - 1, tip: 'turuncu' }); }
    for (const k of ['mh', 'ml', 'up', 'lo']) lrcL[k] = lrcL[k].slice(1);
  }
  const medS = [], medW = [];
  for (let i = from; i < n; i++) medS.push(medAt(b.c, i));
  if (!intra && tf === 'G') { const hb = resample(daily, 'H', tz), mp = new Map(); hb.t.forEach((t, i) => mp.set(pkey(t, 'H', tz), medAt(hb.c, i))); b.t.slice(from).forEach(t => medW.push(mp.get(pkey(t, 'H', tz)) ?? null)); }
  const bar = k => b[k].slice(from);
  // ilk SAR'ın dönüş noktaları (temas → taraf değişimi) ve TEK SAR
  const ik = M === 'borsa' ? 'fast' : 'lin', iv = S[ik].s, flips = [];
  for (let i = Math.max(from, 2); i < n; i++) { if (iv[i] == null || iv[i - 1] == null) continue;
    const a = iv[i - 1] < b.c[i - 1], c2 = iv[i] < b.c[i];
    if (a !== c2) flips.push({ i: i - from, yon: c2 ? 'up' : 'down', v: iv[i] }); }
  const li = n - 1, alt = cfg.aktif.filter(k => S[k].s[li] != null && S[k].s[li] < b.c[li]).length;
  const yon = alt === cfg.aktif.length ? 'up' : alt === 0 ? 'down' : 'mix';
  const tsi = linTsi(b);
  return { medS, medW, ik, flips, yon, tsi, tf, t: bar('t'), o: bar('o'), h: bar('h'), l: bar('l'), c: bar('c'), sars, orts, lrc: lrcL, need: n < 302 ? 302 - n : 0 };
}

function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }
// son `n` barı keser (yakınlaştırma)
function sliceModel(m, n) {
  const N = m.c.length; if (!n || n >= N) return m; const f = N - n, s = a => a.slice(f);
  return { ...m, t: s(m.t), o: s(m.o), h: s(m.h), l: s(m.l), c: s(m.c), medS: s(m.medS), medW: m.medW.length ? s(m.medW) : [],
    sars: m.sars.map(z => ({ ...z, v: s(z.v) })), orts: m.orts.map(z => ({ ...z, v: s(z.v) })), flips: m.flips.filter(z => z.i >= f).map(z => ({ ...z, i: z.i - f })),
    lrc: m.lrc ? { mh: s(m.lrc.mh), ml: s(m.lrc.ml), up: s(m.lrc.up), lo: s(m.lrc.lo), kes: m.lrc.kes.filter(z => z.i >= f).map(z => ({ ...z, i: z.i - f })) } : null };
}
function drawChart(m0, O = {}) {
  const cv = O.cv || $('#sarcv'); if (!cv || !m0) return;
  const m = sliceModel(m0, O.n || CH.view), K = O.big ? 1.7 : 1.25;
  const W = cv.parentElement.clientWidth, H = O.H || 380, dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const N = m.c.length, padR = 54, padT = 8, padB = 18, cw = (W - padR) / N;
  let lo = Math.min(...m.l), hi = Math.max(...m.h); const P0 = m.c[N - 1];
  if (CH.on.uyari && CH.lv) for (const L of CH.lv) if (Math.abs(L.v / P0 - 1) <= 0.3) { lo = Math.min(lo, L.v); hi = Math.max(hi, L.v); }
  const sp = hi - lo; lo -= sp * 0.08; hi += sp * 0.08;
  const y = v => padT + (hi - v) / (hi - lo) * (H - padT - padB), x = i => i * cw + cw / 2;
  const ink = css('--ink'), mute = css('--mute'), line = css('--line2'), good = css('--good'), bad = css('--bad');
  // ızgara
  g.font = '10px ' + css('--f-num'); g.fillStyle = mute; g.strokeStyle = line; g.lineWidth = 1;
  for (let k = 0; k <= 5; k++) { const v = lo + (hi - lo) * k / 5, yy = y(v); g.beginPath(); g.moveTo(0, yy); g.lineTo(W - padR, yy); g.stroke(); g.fillText(fmt(v), W - padR + 4, yy + 3); }
  // tarih etiketleri
  const step = Math.max(1, Math.round(N / 5));
  for (let i = 0; i < N; i += step) { const d = new Date(m.t[i] + TZ() * 3600e3); g.fillText(INTRA[m.tf] ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : m.tf === 'G' ? d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }), x(i) - 14, H - 4); }
  g.save(); g.beginPath(); g.rect(0, 0, W - padR, H - padB); g.clip();
  // LRC
  if (CH.on.lrc && m.lrc) {
    const ln = (arr, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); let st = false; arr.forEach((v, i) => { if (v == null) { st = false; return; } st ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); st = true; }); g.stroke(); g.setLineDash([]); };
    ln(m.lrc.up, good + '88', 1.3 * K); ln(m.lrc.lo, bad + '88', 1.3 * K); ln(m.lrc.mh, '#2563eb', 2 * K); ln(m.lrc.ml, '#dc2626', 2 * K, [5 * K, 4 * K]);
  }
  // medyan (mor)
  if (CH.on.med) { const ml = (arr, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); let st = false; arr.forEach((v, i) => { if (v == null) { st = false; return; } st ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); st = true; }); g.stroke(); g.setLineDash([]); };
    ml(m.medS, '#9333ea', 2.2 * K); if (m.medW.length) ml(m.medW, '#c084fc', 2.2 * K, [6 * K, 4 * K]); }
  // üst dilim SAR Ort.
  if (CH.on.ort) for (const o of m.orts) { g.fillStyle = OCOL[o.tf]; o.v.forEach((v, i) => { if (v == null) return; g.beginPath(); g.arc(x(i), y(v), Math.max(2 * K, Math.min(3.4 * K, cw * 0.4)), 0, 7); g.fill(); }); }
  // mumlar
  for (let i = 0; i < N; i++) { const up = m.c[i] >= m.o[i], col = up ? good : bad; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1, K * 0.9);
    g.beginPath(); g.moveTo(x(i), y(m.h[i])); g.lineTo(x(i), y(m.l[i])); g.stroke();
    const bw = Math.max(1.5, cw * 0.7), y1 = y(Math.max(m.o[i], m.c[i])), y2 = y(Math.min(m.o[i], m.c[i])); g.fillRect(x(i) - bw / 2, y1, bw, Math.max(1, y2 - y1)); }
  // aktif SAR'lar (+), yana atanlar kalın çizgi (Pine line.new)
  if (CH.on.sar) for (const s of m.sars) {
    const col = SCOL[s.k], r = Math.max(2.2 * K, Math.min(4 * K, cw * 0.42));
    s.v.forEach((v, i) => { if (v == null) return; const xx = x(i), yy = y(v);
      if (s.k === 'lin') g.strokeStyle = g.fillStyle = m.c[i] >= v ? '#22c55e' : '#ef4444'; else g.strokeStyle = g.fillStyle = col;
      if (i > 0 && s.v[i - 1] != null && Math.abs(s.v[i - 1] - v) <= Math.abs(v) * 1e-9) { g.globalAlpha = 0.5; g.lineWidth = 4.5 * K; g.beginPath(); g.moveTo(x(i - 1), yy); g.lineTo(xx, yy); g.stroke(); g.globalAlpha = 1; }
      g.lineWidth = 1.6 * K; g.beginPath(); g.moveTo(xx - r, yy); g.lineTo(xx + r, yy); g.moveTo(xx, yy - r); g.lineTo(xx, yy + r); g.stroke(); });
  }
  // dönüş okları (ilk SAR'a temas)
  if (CH.on.uyari) for (const f of m.flips) { const xx = x(f.i), up = f.yon === 'up', yy = up ? y(m.l[f.i]) + 10 : y(m.h[f.i]) - 10;
    g.fillStyle = up ? good : bad; g.beginPath(); if (up) { g.moveTo(xx, yy - 5); g.lineTo(xx - 5, yy + 4); g.lineTo(xx + 5, yy + 4); } else { g.moveTo(xx, yy + 5); g.lineTo(xx - 5, yy - 4); g.lineTo(xx + 5, yy - 4); } g.fill(); }
  g.restore();
  // destek / direnç / yana atan / düzeltme hedefi çizgileri (ekran dışındakiler üstteki şeritte listelenir)
  CH.off = [];
  if (CH.on.uyari && CH.lv) {
    const top = padT + 12, bot = H - padB - 2, used = [];
    for (const L of [...CH.lv].sort((p, q) => q.v - p.v)) {
      const yy = y(L.v); if (yy < top || yy > bot) { CH.off.push(L); continue; }
      g.strokeStyle = L.col; g.lineWidth = 1.6 * K; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(0, yy); g.lineTo(W - padR, yy); g.stroke(); g.setLineDash([]);
      let ly = yy - 4; while (used.some(u => Math.abs(u - ly) < 12)) ly += 12; used.push(ly);
      const txt = L.ad; g.font = 'bold 10px ' + css('--f-body'); const tw = Math.min(g.measureText(txt).width, W - padR - 16), lx = W - padR - tw - 8;
      g.fillStyle = css('--panel'); g.globalAlpha = 0.85; g.fillRect(lx - 3, ly - 9, tw + 8, 12); g.globalAlpha = 1; g.fillStyle = L.col; g.fillText(txt, lx + 1, ly, tw);
      g.fillRect(W - padR, yy - 7, padR, 14); g.fillStyle = '#fff'; g.font = 'bold 9.5px ' + css('--f-num'); g.fillText(fmt(L.v), W - padR + 3, yy + 3);
    }
  }
  chartStrip(m);
  // kesişme etiketleri
  if (CH.on.kes && m.lrc) for (const k of m.lrc.kes) { const xx = x(k.i), yy = Math.min(y(m.l[k.i]) + 14, H - padB - 14);
    g.fillStyle = k.tip === 'yesil' ? '#16a34a' : '#ea8a0c'; g.beginPath(); g.moveTo(xx, yy - 6); g.lineTo(xx - 5, yy); g.lineTo(xx + 5, yy); g.fill();
    g.fillRect(xx - 26, yy, 52, 13); g.fillStyle = '#fff'; g.font = 'bold 9px ' + css('--f-body'); g.fillText('KESİŞME', xx - 21, yy + 10); }
  // son fiyat
  const lc = m.c[N - 1], ly = y(lc); g.fillStyle = css('--accent'); g.fillRect(W - padR, ly - 8, padR, 16); g.fillStyle = '#fff'; g.font = 'bold 10px ' + css('--f-num'); g.fillText(fmt(lc), W - padR + 3, ly + 4);
  // seçili bar
  const pk = CH.pick == null ? null : CH.pick - (m0.c.length - N);
  if (pk != null && pk >= 0 && pk < N) { g.strokeStyle = mute; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x(pk), padT); g.lineTo(x(pk), H - padB); g.stroke(); g.setLineDash([]); }
  if (!O.cv) CH.geo = { cw, padR, N, off: m0.c.length - N }; else CH.fgeo = { cw, padR, N, off: m0.c.length - N };
}

function readout(m, i) {
  if (!m || i == null) return '';
  const P = m.c[i], d = new Date(m.t[i] + TZ() * 3600e3).toLocaleString('tr-TR', INTRA[m.tf] ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' });
  const ch = i > 0 ? (P / m.c[i - 1] - 1) * 100 : null;
  const row = (sw, ad, v) => { if (v == null) return ''; const dd = (v / P - 1) * 100, alt = v < P;
    return `<div class="ro-r"><span class="ro-sw">${sw}</span><span class="ro-n">${ad}</span><span class="ro-v num">${fmt(v)}</span><span class="ro-d ${alt ? 'pos' : 'neg'}">${alt ? '▼' : '▲'} ${fmt(Math.abs(dd), 1)}%</span></div>`; };
  const plus = c => `<i style="color:${c}">+</i>`, dot = c => `<i class="ro-dot" style="background:${c}"></i>`, ln = (c, dash) => `<i class="ro-ln" style="border-top:2px ${dash ? 'dotted' : 'solid'} ${c}"></i>`;
  const sars = m.sars.map(z => row(plus(z.k === 'lin' ? (m.c[i] >= z.v[i] ? '#22c55e' : '#ef4444') : SCOL[z.k]), SN[z.k], z.v[i])).join('');
  const orts = m.orts.map(z => row(dot(OCOL[z.tf]), TFN[z.tf] + ' Ort.', z.v[i])).join('');
  const L = m.lrc && m.lrc.mh[i] != null ? [row(ln('#16a34a'), 'Kanal üst', m.lrc.up[i]), row(ln('#2563eb'), 'Orta üst', m.lrc.mh[i]), row(ln('#dc2626', 1), 'Orta alt', m.lrc.ml[i]), row(ln('#dc2626'), 'Kanal alt', m.lrc.lo[i])].join('') : '';
  const MED = [row(ln('#9333ea'), TFN[m.tf] + ' medyan', m.medS[i]), m.medW.length ? row(ln('#c084fc', 1), 'Haftalık medyan', m.medW[i]) : ''].join('');
  const sec = (t, h) => h ? `<div class="ro-s"><div class="ro-h">${t}</div>${h}</div>` : '';
  return `<div class="ro-top"><div><div class="ro-dt">${d}${CH.pick == null ? ' · son bar' : ''}</div><div class="ro-ohlc">A <b>${fmt(m.o[i])}</b> Y <b>${fmt(m.h[i])}</b> D <b>${fmt(m.l[i])}</b></div></div>
    <div style="text-align:right"><div class="ro-px num">${fmt(P)}</div>${ch == null ? '' : `<div class="ro-ch ${sgn(ch)}">${pct(ch)}</div>`}</div></div>
    <div class="ro-g">${sec(TFN[m.tf] + ' SAR\'lar', sars)}${sec('Üst dilim SAR Ort.', orts)}${sec('Medyan (50)', MED)}${sec('LRC 300', L)}</div>
    <p class="ro-hint">▼ fiyatın altında (destek) · ▲ fiyatın üstünde (direnç) · başka bir güne bakmak için grafikte o mumun üstüne dokun</p>`;
}

function chartPanel() {
  return `<div class="panel" id="chpanel"><p class="ph">Grafik · <b>SAR ve LRC</b></p>
    <div class="chips" id="chtf">${(M === 'kripto' ? ['15m', '4S', 'G', 'H', 'A'] : ['G', 'H', 'A']).map(t => `<button class="chip" data-tf="${t}" aria-pressed="${CH.tf === t}">${TFN[t]}</button>`).join('')}</div>
    <div class="chips" id="chon" style="margin-top:6px">${[['uyari', 'Uyarılar'], ['med', 'Medyan'], ['sar', 'SAR\'lar'], ['ort', 'Üst dilim SAR Ort.'], ['lrc', 'LRC kanal'], ['kes', 'Kesişme']].map(([k, t]) => `<button class="chip" data-on="${k}" aria-pressed="${!!CH.on[k]}">${t}</button>`).join('')}</div>
    <div class="sigs" id="chstrip" style="margin-top:10px"></div>
    <div style="position:relative;margin-top:8px"><button class="btn small" id="chbig" style="position:absolute;left:6px;bottom:24px;z-index:2;opacity:.9">⤢ Büyüt</button><canvas id="sarcv" style="display:block;width:100%;touch-action:pan-y"></canvas><div id="chmsg" class="note" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">Grafik yükleniyor…</div></div>
    <div id="chread" class="ro"></div>
    <details class="ro-leg"><summary>Grafik nasıl okunur?</summary><div class="note" id="chleg"></div></details></div>`;
}
function legend(m) {
  const a = m.sars.map(z => `<span style="color:${SCOL[z.k]};font-weight:800">+</span> ${SN[z.k]}`);
  const b = m.orts.map(z => `<span style="color:${OCOL[z.tf]}">●</span> ${TFN[z.tf]} Ort.`);
  const md = ['<span style="color:#9333ea">━</span> medyan', ...(m.medW.length ? ['<span style="color:#c084fc">┅</span> haftalık medyan'] : [])];
  const c = m.lrc ? ['<span style="color:#2563eb">━</span> LRC orta üst', '<span style="color:#dc2626">┅</span> orta alt', '<span style="color:var(--good)">━</span>/<span style="color:var(--bad)">━</span> kanal üst/alt'] : [`LRC için ${m.need} bar daha gerekli`];
  return '<div class="ro-chips">' + [...a, ...b, ...md, ...c].map(x => `<span>${x}</span>`).join('') + '</div>' + 'Kalın yatay çizgi = yana atan SAR. ▲/▼ = ilk SAR\'a temas edip yön değiştirdiği bar. Kesikli çizgiler: destek (yeşil), direnç (kırmızı), yana atan (sarı), düzeltme hedefi (mavi); ekran dışındakiler grafiğin üstünde ↑/↓ ile listelenir. Dokunduğun barın değerleri yukarıda.';
}
function chartStrip(m) {
  const el = $('#chstrip'); if (!el) return; if (!CH.on.uyari) { el.innerHTML = ''; return; }
  const yt = { up: ['▲ Yön yukarı', 'pos'], down: ['▼ Yön aşağı', 'neg'], mix: ['◆ Yön kararsız', ''] }[m.yon];
  const it = [`<span class="sg ${yt[1]}">${yt[0]} · ${TFN[m.tf].toLowerCase()} SAR'lar</span>`];
  if (m.tsi) it.push(`<span class="sg ${m.tsi.renk === 'yesil' ? 'pos' : 'neg'}">TSI ${m.tsi.renk === 'yesil' ? 'yeşil · momentum artıyor' : 'kırmızı · momentum zayıflıyor'}</span>`);
  if (CH.ck) it.push(`<span class="sg" style="color:#7c3aed;border-color:#7c3aed">🧲 Çekim ${CH.ck.kuvvet}: ${esc(lvName(CH.ck))} ${fmt(CH.ck.v)} (${pct(CH.ck.dist)})${CH.ck.eta != null ? ' · ≈' + CH.ck.eta + ' bar' : ''}</span>`);
  for (const u of CH.uy || []) it.push(`<span class="sg" style="color:${u[1]};border-color:${u[1]}">${esc(u[0])}</span>`);
  for (const L of CH.off || []) it.push(`<span class="sg" style="color:${L.col};border-color:${L.col}">${L.v > m.c[m.c.length - 1] ? '↑' : '↓'} ${esc(L.ad)} ${fmt(L.v)} (${pct((L.v / m.c[m.c.length - 1] - 1) * 100)})</span>`);
  el.innerHTML = it.join('');
}
function prepWarn(r) {
  CH.lv = []; CH.uy = []; CH.ck = null; if (!r) return;
  const ck = cekim(r); if (ck && ck.kuvvet !== 'zayıf') { CH.ck = ck; CH.lv.push({ v: ck.v, ad: '🧲 Çekim · ' + lvName(ck), col: '#7c3aed' }); }
  const P = r.price, sup = nearest(r, 'alt', {}), res = nearest(r, 'ust', {});
  if (sup) CH.lv.push({ v: sup.v, ad: (sup.flatRecent ? 'Destek · değmemeli · ' : 'Destek · altı kapanış olumsuz · ') + lvName(sup), col: '#16a34a' });
  if (res) CH.lv.push({ v: res.v, ad: (res.flatRecent ? 'Direnç · değmeden dönerse düşüş · ' : 'Direnç · üstü olumlu · ') + lvName(res), col: '#dc2626' });
  const cfg = MK[M], ya = levels(r, { noOrt: true }).filter(x => cfg.ana.includes(x.tf) && x.flatRecent);
  const yA = ya.filter(x => x.side === 'alt').sort((a, b) => b.v - a.v)[0], yU = ya.filter(x => x.side === 'ust').sort((a, b) => a.v - b.v)[0];
  if (yA && (!sup || Math.abs(yA.v - sup.v) > sup.v * 0.004)) CH.lv.push({ v: yA.v, ad: 'Yana atan (destek) · ' + lvName(yA), col: '#a16207' });
  if (yU && (!res || Math.abs(yU.v - res.v) > res.v * 0.004)) CH.lv.push({ v: yU.v, ad: 'Yana atan (direnç) · ' + lvName(yU), col: '#a16207' });
  const nt = notOf(r); if (nt) { for (const v of nt.d) CH.lv.push({ v, ad: 'Hoca desteği ' + fmt(v), col: '#b8860b' }); for (const v of nt.r) CH.lv.push({ v, ad: 'Hoca eşiği ' + fmt(v), col: '#b8860b' }); }
  const LH = r.lrc && r.lrc.H; if (LH && !LH.yok && LH.alt < P) CH.lv.push({ v: LH.alt, ad: 'Düzeltme hedefi · haftalık LRC alt', col: '#2563eb' });
  const W = { destek_kayip: 'Destek SAR\'ı kaybedildi', ust_yana: 'Üstten yana atan SAR: direnç', trend_bozuk: 'Fiyat günlük SAR\'ların altında', kes_risk: 'Riskli kesişme', lrc_pahali: 'LRC 2 katı: pahalı bölge',
    igne: 'SAR\'a iğne: yana atma bekleniyor', lrc_alt: 'LRC alt bandın altında: tepki bölgesi', alt_yana: 'Alttan yana atan SAR: destek', tek: 'TEK SAR: yükseliş işareti', direnc_asildi: 'Direnç SAR\'ı aşıldı', kes_ideal: 'İdeal kesişme', aylik_tepki: 'Aylık SAR tepki adayı' };
  const neg = ['destek_kayip', 'ust_yana', 'trend_bozuk', 'kes_risk', 'lrc_pahali'], pos = ['alt_yana', 'tek', 'direnc_asildi', 'kes_ideal', 'aylik_tepki'];
  for (const k of [...neg, 'igne', 'lrc_alt', ...pos]) if ((r.sig || []).includes(k) && CH.uy.length < 4) CH.uy.push([(neg.includes(k) ? '⚠ ' : pos.includes(k) ? '✓ ' : '• ') + W[k], neg.includes(k) ? '#dc2626' : pos.includes(k) ? '#16a34a' : '#a16207']);
}
async function renderChart(k) {
  const msg = $('#chmsg'); CH.pick = null;
  try {
    const d = await chartData(k); if (!$('#sarcv')) return;
    if (INTRA[CH.tf] && M !== 'kripto') CH.tf = 'G';
    const m = chartModel(d, CH.tf, INTRA[CH.tf] ? await intraData(k, CH.tf) : null); CH.model = m; msg.style.display = 'none';
    const age = (Date.now() - d.t[d.t.length - 1]) / 864e5;
    if (age > 5) CH.uy = [['⚠ Veri ' + new Date(d.t[d.t.length - 1]).toLocaleDateString('tr-TR') + ' tarihinde bitiyor: işlem görmüyor olabilir', '#dc2626'], ...(CH.uy || []).filter(u => !u[0].startsWith('⚠ Veri'))];
    drawChart(m); $('#chleg').innerHTML = legend(m); $('#chread').innerHTML = readout(m, m.c.length - 1);
  } catch (e) { if (msg) msg.textContent = 'Grafik verisi alınamadı (' + e.message + ').'; }
}
function bindChart(k, r) {
  prepWarn(r);
  $('#chtf').onclick = e => { const b = e.target.closest('[data-tf]'); if (!b) return; CH.tf = b.dataset.tf; $('#chtf').querySelectorAll('[data-tf]').forEach(x => x.setAttribute('aria-pressed', x.dataset.tf === CH.tf)); renderChart(k); };
  $('#chon').onclick = e => { const b = e.target.closest('[data-on]'); if (!b) return; CH.on[b.dataset.on] = !CH.on[b.dataset.on]; LS.set('ch_on', CH.on); b.setAttribute('aria-pressed', CH.on[b.dataset.on]); drawChart(CH.model); };
  $('#sarcv').onclick = () => openFS();
  $('#chbig').onclick = () => openFS();
  renderChart(k);
}
window.addEventListener('resize', () => { if (CH.model && $('#sarcv')) drawChart(CH.model); });

/* ---------- kısa vade: 15 dk yana atan SAR taraması (canlı, Binance) ---------- */
async function scalpScan() {
  const out = $('#scalp-out'); out.innerHTML = '<p class="note">Taranıyor…</p>';
  try {
    let t = null;
    for (const h of ['https://data-api.binance.vision', 'https://api.binance.com']) { try { const r = await fetch(h + '/api/v3/ticker/24hr'); if (r.ok) { t = await r.json(); break; } } catch (e) {} }
    if (!t) throw new Error('Binance erişilemedi');
    const bad = /^(USDC|FDUSD|TUSD|BUSD|DAI|USDP|EUR|TRY|USDE|XUSD|USD1|RLUSD|PAXG|WBTC)USDT$|(UP|DOWN|BULL|BEAR)USDT$/;
    const top = t.filter(x => x.symbol.endsWith('USDT') && !bad.test(x.symbol) && +x.quoteVolume > 5e6).sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 5);
    const res = await Promise.all(top.map(async x => {
      const k = x.symbol.replace(/USDT$/, ''), b = await intraData(k, '15m'), S = sarSet(b), n = b.c.length;
      const st = ['psar', ...MK.kripto.aktif].map(key => ({ key, ...sarState(S[key].s, b, S[key].next, S[key]) })).filter(z => z.v != null);
      const yA = st.filter(z => z.flatRecent && z.side === 'alt'), yU = st.filter(z => z.flatRecent && z.side === 'ust');
      return { k, chg: +x.priceChangePercent, px: b.c[n - 1], st, yA, yU };
    }));
    out.innerHTML = res.map(r => {
      const v = r.yA.length ? ['pos', `Alttan yana atıyor → yükseliş beklenir. Stop: ${SN[r.yA[0].key]} ${fmt(r.yA[0].v)} (${pct(r.yA[0].dist)})`] :
        r.yU.length ? ['neg', `Üstten yana atıyor → düşüş beklenir. Stop: ${SN[r.yU[0].key]} ${fmt(r.yU[0].v)} (${pct(r.yU[0].dist)})`] : ['', 'Şu an yana atan SAR yok, bekle.'];
      return `<div class="krow" data-sk="${esc(r.k)}"><div class="t"><b>${esc(r.k)}</b><em><span class="num">${fmt(r.px)}</span> <span class="pos">${pct(r.chg)}</span></em></div>
        <p class="note ${v[0]}" style="margin:4px 0 0;font-weight:600">${v[1]}</p>
        <p class="note" style="margin:2px 0 0">${r.st.map(z => `${SN[z.key]} ${fmt(z.v)} ${z.side === 'alt' ? '↓' : '↑'}${z.flatRecent ? ' yana' : ''}`).join(' · ')}</p></div>`; }).join('') +
      `<p class="note">Kural: SAR yana attıktan 1–2 mum (15–30 dk) sonra pozisyon kapatılır, stop SAR noktasına konur. Tarama ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} itibarıyla; kaldıraç yüksek risk taşır.</p>`;
  } catch (e) { out.innerHTML = `<p class="err">15 dk taraması yapılamadı: ${esc(e.message)}</p>`; }
}

/* ---------- tam ekran grafik ---------- */
function fsH() { return Math.max(320, window.innerHeight - 250); }
function openFS() {
  if (!CH.model) return; let el = $('#chfs');
  if (!el) { el = document.createElement('div'); el.id = 'chfs'; document.body.appendChild(el); }
  el.innerHTML = `<div class="fs-head"><b>${esc(curKod || '')}</b> <span class="mut">${TFN[CH.tf]}</span><span style="flex:1"></span>
    <button class="btn small" data-z="-">−</button><button class="btn small" data-z="+">+</button><button class="iconbtn" id="fsx" aria-label="Kapat">✕</button></div>
    <div class="chips" id="fstf">${$('#chtf').innerHTML}</div><div class="chips" id="fson" style="margin-top:4px">${$('#chon').innerHTML}</div>
    <details style="margin-top:6px"><summary class="small" style="font-weight:700;color:var(--accent);cursor:pointer">Uyarılar ve seviyeler (${$('#chstrip').children.length})</summary><div class="sigs">${$('#chstrip').innerHTML}</div></details>
    <div style="position:relative;margin-top:6px"><canvas id="fscv" style="display:block;width:100%;touch-action:pan-y"></canvas></div>
    <div id="fsread" class="ro" style="margin-top:8px"></div>`;
  el.hidden = false; document.body.style.overflow = 'hidden';
  const draw = () => { drawChart(CH.model, { cv: $('#fscv'), H: fsH(), big: true, n: CH.fview }); };
  CH.fview = CH.fview || 90; draw(); $('#fsread').innerHTML = readout(CH.model, CH.pick ?? CH.model.c.length - 1);
  $('#fsx').onclick = () => { el.hidden = true; document.body.style.overflow = ''; drawChart(CH.model); };
  el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { CH.fview = Math.max(30, Math.min(CH.model.c.length, Math.round(CH.fview * (b.dataset.z === '+' ? 0.7 : 1.4)))); draw(); });
  $('#fscv').onclick = e => { const G = CH.fgeo; if (!G) return; const r = e.target.getBoundingClientRect(), i = Math.floor((e.clientX - r.left) / G.cw); if (i < 0 || i >= G.N) return; CH.pick = i + G.off; draw(); $('#fsread').innerHTML = readout(CH.model, CH.pick); };
  $('#fstf').onclick = async e => { const b = e.target.closest('[data-tf]'); if (!b) return; CH.tf = b.dataset.tf; CH.pick = null; $('#chtf').querySelectorAll('[data-tf]').forEach(x => x.setAttribute('aria-pressed', x.dataset.tf === CH.tf)); await renderChart(curKod); openFS(); };
  $('#fson').onclick = e => { const b = e.target.closest('[data-on]'); if (!b) return; CH.on[b.dataset.on] = !CH.on[b.dataset.on]; LS.set('ch_on', CH.on); b.setAttribute('aria-pressed', CH.on[b.dataset.on]); $('#chon').querySelector(`[data-on="${b.dataset.on}"]`)?.setAttribute('aria-pressed', CH.on[b.dataset.on]); draw(); };
}
window.addEventListener('resize', () => { const el = $('#chfs'); if (el && !el.hidden && CH.model) drawChart(CH.model, { cv: $('#fscv'), H: fsH(), big: true, n: CH.fview }); });
