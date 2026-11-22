/* ---------- SAR Radar grafiği: mumlar + SAR noktaları + üst dilim SAR Ort. + LRC kanal ve kesişme ---------- */
// sar_engine.mjs içindeki fonksiyonları kullanır (build_sar.mjs sayfaya gömer).
const CH = { key: null, daily: null, tf: 'G', on: LS.get('ch_on', { sar: true, ort: true, lrc: true, kes: true }), pick: null };
const SCOL = { psar: '#2962FF', lin: '#22c55e', luc: '#b821f3', slow: '#8b1a1a', mod: '#16a34a', fast: '#ef4444', ort: '#f97316' };
const OCOL = { H: '#64748b', A: '#0d9488', '3A': '#06b6d4', '6A': '#f59e0b', '12A': '#dc2626' };
const NBAR = { G: 180, H: 160, A: 120 };
const TZ = () => (M === 'borsa' ? 3 : 0);

async function chartData(k) {
  const key = M + ':' + k; if (CH.key === key && CH.daily) return CH.daily;
  let d = null;
  if (M === 'borsa') {
    const sym = k + '.IS';
    const r = await fetch('/.netlify/functions/yahoo?r=max&s=' + encodeURIComponent(sym)); if (!r.ok) throw new Error('Yahoo ' + r.status);
    d = (await r.json())[sym];
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

function chartModel(daily, tf) {
  const tz = TZ(), b = resample(daily, tf, tz), n = b.c.length, N = Math.min(NBAR[tf], n), from = n - N;
  const S = sarSet(b), cfg = MK[M];
  const sars = [...cfg.aktif, 'ort'].map(k => ({ k, v: S[k].s.slice(from) }));
  // üst zaman dilimi SAR Ort. (Pine: request.security, lookahead kapalı → o dönemin canlı değeri)
  const order = ['G', 'H', 'A', '3A', '6A', '12A'], up = order.slice(order.indexOf(tf) + 1).filter(x => (M === 'borsa' || x !== '12A'));
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
  const bar = k => b[k].slice(from);
  return { tf, t: bar('t'), o: bar('o'), h: bar('h'), l: bar('l'), c: bar('c'), sars, orts, lrc: lrcL, need: n < 302 ? 302 - n : 0 };
}

function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }
function drawChart(m) {
  const cv = $('#sarcv'); if (!cv || !m) return;
  const W = cv.parentElement.clientWidth, H = 360, dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const N = m.c.length, padR = 54, padT = 8, padB = 18, cw = (W - padR) / N;
  let lo = Math.min(...m.l), hi = Math.max(...m.h); const sp = hi - lo; lo -= sp * 0.12; hi += sp * 0.12;
  const y = v => padT + (hi - v) / (hi - lo) * (H - padT - padB), x = i => i * cw + cw / 2;
  const ink = css('--ink'), mute = css('--mute'), line = css('--line2'), good = css('--good'), bad = css('--bad');
  // ızgara
  g.font = '10px ' + css('--f-num'); g.fillStyle = mute; g.strokeStyle = line; g.lineWidth = 1;
  for (let k = 0; k <= 5; k++) { const v = lo + (hi - lo) * k / 5, yy = y(v); g.beginPath(); g.moveTo(0, yy); g.lineTo(W - padR, yy); g.stroke(); g.fillText(fmt(v), W - padR + 4, yy + 3); }
  // tarih etiketleri
  const step = Math.max(1, Math.round(N / 5));
  for (let i = 0; i < N; i += step) { const d = new Date(m.t[i] + TZ() * 3600e3); g.fillText(m.tf === 'G' ? d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }), x(i) - 14, H - 4); }
  g.save(); g.beginPath(); g.rect(0, 0, W - padR, H - padB); g.clip();
  // LRC
  if (CH.on.lrc && m.lrc) {
    const ln = (arr, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); let st = false; arr.forEach((v, i) => { if (v == null) { st = false; return; } st ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); st = true; }); g.stroke(); g.setLineDash([]); };
    ln(m.lrc.up, good + 'aa', 1.5); ln(m.lrc.lo, bad + 'aa', 1.5); ln(m.lrc.mh, '#2563eb', 2); ln(m.lrc.ml, '#dc2626', 2, [4, 3]);
  }
  // üst dilim SAR Ort.
  if (CH.on.ort) for (const o of m.orts) { g.fillStyle = OCOL[o.tf]; o.v.forEach((v, i) => { if (v == null) return; g.beginPath(); g.arc(x(i), y(v), Math.max(1.6, Math.min(3, cw * 0.35)), 0, 7); g.fill(); }); }
  // mumlar
  for (let i = 0; i < N; i++) { const up = m.c[i] >= m.o[i], col = up ? good : bad; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x(i), y(m.h[i])); g.lineTo(x(i), y(m.l[i])); g.stroke();
    const bw = Math.max(1, cw * 0.62), y1 = y(Math.max(m.o[i], m.c[i])), y2 = y(Math.min(m.o[i], m.c[i])); g.fillRect(x(i) - bw / 2, y1, bw, Math.max(1, y2 - y1)); }
  // aktif SAR'lar (+), yana atanlar kalın çizgi (Pine line.new)
  if (CH.on.sar) for (const s of m.sars) {
    const col = SCOL[s.k], r = Math.max(1.8, Math.min(3.2, cw * 0.3));
    s.v.forEach((v, i) => { if (v == null) return; const xx = x(i), yy = y(v);
      if (s.k === 'lin') g.strokeStyle = g.fillStyle = m.c[i] >= v ? '#22c55e' : '#ef4444'; else g.strokeStyle = g.fillStyle = col;
      if (i > 0 && s.v[i - 1] != null && Math.abs(s.v[i - 1] - v) <= Math.abs(v) * 1e-9) { g.globalAlpha = 0.45; g.lineWidth = 4; g.beginPath(); g.moveTo(x(i - 1), yy); g.lineTo(xx, yy); g.stroke(); g.globalAlpha = 1; }
      g.lineWidth = 1.3; g.beginPath(); g.moveTo(xx - r, yy); g.lineTo(xx + r, yy); g.moveTo(xx, yy - r); g.lineTo(xx, yy + r); g.stroke(); });
  }
  g.restore();
  // kesişme etiketleri
  if (CH.on.kes && m.lrc) for (const k of m.lrc.kes) { const xx = x(k.i), yy = Math.min(y(m.l[k.i]) + 14, H - padB - 14);
    g.fillStyle = k.tip === 'yesil' ? '#16a34a' : '#ea8a0c'; g.beginPath(); g.moveTo(xx, yy - 6); g.lineTo(xx - 5, yy); g.lineTo(xx + 5, yy); g.fill();
    g.fillRect(xx - 26, yy, 52, 13); g.fillStyle = '#fff'; g.font = 'bold 9px ' + css('--f-body'); g.fillText('KESİŞME', xx - 21, yy + 10); }
  // son fiyat
  const lc = m.c[N - 1], ly = y(lc); g.fillStyle = css('--accent'); g.fillRect(W - padR, ly - 8, padR, 16); g.fillStyle = '#fff'; g.font = 'bold 10px ' + css('--f-num'); g.fillText(fmt(lc), W - padR + 3, ly + 4);
  // seçili bar
  if (CH.pick != null && CH.pick < N) { g.strokeStyle = mute; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x(CH.pick), padT); g.lineTo(x(CH.pick), H - padB); g.stroke(); g.setLineDash([]); }
  CH.geo = { cw, padR, N };
}

function readout(m, i) {
  if (!m || i == null) return '';
  const d = new Date(m.t[i] + TZ() * 3600e3).toLocaleDateString('tr-TR');
  const s = m.sars.filter(z => z.v[i] != null).map(z => `<span style="color:${SCOL[z.k]}">■</span> ${SN[z.k]} <b class="num">${fmt(z.v[i])}</b>`).join(' · ');
  const o = m.orts.filter(z => z.v[i] != null).map(z => `<span style="color:${OCOL[z.tf]}">●</span> ${TFN[z.tf]} Ort. <b class="num">${fmt(z.v[i])}</b>`).join(' · ');
  const L = m.lrc && m.lrc.mh[i] != null ? ` · LRC orta <b class="num">${fmt(m.lrc.mh[i])} / ${fmt(m.lrc.ml[i])}</b>, kanal <b class="num">${fmt(m.lrc.up[i])} / ${fmt(m.lrc.lo[i])}</b>` : '';
  return `<b>${d}</b> · A ${fmt(m.o[i])} Y ${fmt(m.h[i])} D ${fmt(m.l[i])} K <b class="num">${fmt(m.c[i])}</b><br>${s}${o ? '<br>' + o : ''}${L}`;
}

function chartPanel() {
  return `<div class="panel" id="chpanel"><p class="ph">Grafik · <b>SAR ve LRC</b></p>
    <div class="chips" id="chtf">${['G', 'H', 'A'].map(t => `<button class="chip" data-tf="${t}" aria-pressed="${CH.tf === t}">${TFN[t]}</button>`).join('')}</div>
    <div class="chips" id="chon" style="margin-top:6px">${[['sar', 'SAR\'lar'], ['ort', 'Üst dilim SAR Ort.'], ['lrc', 'LRC kanal'], ['kes', 'Kesişme']].map(([k, t]) => `<button class="chip" data-on="${k}" aria-pressed="${!!CH.on[k]}">${t}</button>`).join('')}</div>
    <div style="position:relative;margin-top:10px"><canvas id="sarcv" style="display:block;width:100%;touch-action:pan-y"></canvas><div id="chmsg" class="note" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">Grafik yükleniyor…</div></div>
    <div class="note" id="chread" style="min-height:1.5em"></div>
    <div class="note" id="chleg"></div></div>`;
}
function legend(m) {
  const a = m.sars.map(z => `<span style="color:${SCOL[z.k]};font-weight:800">+</span> ${SN[z.k]}`);
  const b = m.orts.map(z => `<span style="color:${OCOL[z.tf]}">●</span> ${TFN[z.tf]} Ort.`);
  const c = m.lrc ? ['<span style="color:#2563eb">━</span> LRC orta üst', '<span style="color:#dc2626">┅</span> orta alt', '<span style="color:var(--good)">━</span>/<span style="color:var(--bad)">━</span> kanal üst/alt'] : [`LRC için ${m.need} bar daha gerekli`];
  return [...a, ...b, ...c].join(' &nbsp; ') + '<br>Kalın yatay çizgi = yana atan SAR (değer önceki barla aynı). Dokunduğun barın değerleri yukarıda görünür.';
}
async function renderChart(k) {
  const msg = $('#chmsg'); CH.pick = null;
  try {
    const d = await chartData(k); if (!$('#sarcv')) return;
    const m = chartModel(d, CH.tf); CH.model = m; msg.style.display = 'none';
    drawChart(m); $('#chleg').innerHTML = legend(m); $('#chread').innerHTML = readout(m, m.c.length - 1);
  } catch (e) { if (msg) msg.textContent = 'Grafik verisi alınamadı (' + e.message + ').'; }
}
function bindChart(k) {
  $('#chtf').onclick = e => { const b = e.target.closest('[data-tf]'); if (!b) return; CH.tf = b.dataset.tf; $('#chtf').querySelectorAll('[data-tf]').forEach(x => x.setAttribute('aria-pressed', x.dataset.tf === CH.tf)); renderChart(k); };
  $('#chon').onclick = e => { const b = e.target.closest('[data-on]'); if (!b) return; CH.on[b.dataset.on] = !CH.on[b.dataset.on]; LS.set('ch_on', CH.on); b.setAttribute('aria-pressed', CH.on[b.dataset.on]); drawChart(CH.model); };
  $('#sarcv').onclick = e => { if (!CH.model || !CH.geo) return; const r = e.target.getBoundingClientRect(), i = Math.floor((e.clientX - r.left) / CH.geo.cw); if (i < 0 || i >= CH.geo.N) return; CH.pick = i; drawChart(CH.model); $('#chread').innerHTML = readout(CH.model, i); };
  renderChart(k);
}
window.addEventListener('resize', () => { if (CH.model && $('#sarcv')) drawChart(CH.model); });
