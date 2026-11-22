// Medyan kalibrasyonu: ULUDAĞ'ın paylaştığı medyan değerlerine en yakın hesabı (zaman dilimi × kaynak × uzunluk) arar.
// node kalibre.mjs  → GitHub Actions'ta çalışır (Yahoo + Binance erişimi gerekir)
import { resample } from './sar_engine.mjs';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
async function yahoo(sym) { const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=946684800&period2=${Math.floor(Date.now() / 1000)}&interval=1d`, { headers: UA }); const q = (await r.json()).chart.result[0], z = q.indicators.quote[0], d = { t: [], o: [], h: [], l: [], c: [] };
  q.timestamp.forEach((t, k) => { if ([z.open[k], z.high[k], z.low[k], z.close[k]].some(v => v == null)) return; d.t.push(t * 1000); d.o.push(z.open[k]); d.h.push(z.high[k]); d.l.push(z.low[k]); d.c.push(z.close[k]); }); return d; }
async function bin(sym) { const d = { t: [], o: [], h: [], l: [], c: [] }; let st = 0; for (let p = 0; p < 6; p++) { const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${sym}&interval=1d&limit=1000&startTime=${st}`, { headers: UA }); const a = await r.json(); if (!a.length) break; for (const x of a) { d.t.push(x[0]); d.o.push(+x[1]); d.h.push(+x[2]); d.l.push(+x[3]); d.c.push(+x[4]); } if (a.length < 1000) break; st = a.at(-1)[0] + 1; } return d; }
// [kaynak, sembol, tarih (o gün itibarıyla), paylaşılan medyan, not]
const PTS = [
  ['b', 'ETHUSDT', '2024-11-07', 2850, 'ETH 7.11.2024'], ['b', 'ETHUSDT', '2024-12-06', 3620, 'ETH 6.12.2024'], ['b', 'ETHUSDT', '2024-12-10', 3620, 'ETH 10.12.2024'],
  ['b', 'ETHUSDT', '2024-12-25', 3225, 'ETH haftalık 25.12.2024'], ['b', 'ETHUSDT', '2025-01-13', 3225, 'ETH 13.01.2025'],
  ['b', 'BTCUSDT', '2024-12-10', 94000, 'BTC 10.12.2024'], ['b', 'BTCUSDT', '2024-12-25', 95600, 'BTC 25.12.2024'],
  ['y', 'XU100.IS', '2025-02-05', 9600, 'BIST 5.02.2025 alt medyan'], ['y', 'XU100.IS', '2026-07-19', 14069, 'BIST 19.07.2026 üst medyan'], ['y', 'XU100.IS', '2026-07-29', 12954, 'BIST 29.07.2026 alt medyan'],
  ['y', 'SI=F', '2026-11-22', 55, 'Gümüş haftalık 22.11.2026'],
];
const SRC = { close: (b, i) => b.c[i], hl2: (b, i) => (b.h[i] + b.l[i]) / 2, hlc3: (b, i) => (b.h[i] + b.l[i] + b.c[i]) / 3 };
const med = a => { a = a.slice().sort((x, y) => x - y); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const cache = {}, res = {};
for (const [src, sym, day, val, note] of PTS) {
  const d = cache[sym] ||= await (src === 'b' ? bin(sym) : yahoo(sym)); const tEnd = Date.parse(day) + 864e5;
  const cut = { t: [], o: [], h: [], l: [], c: [] }; d.t.forEach((t, i) => { if (t < tEnd) for (const k of ['t', 'o', 'h', 'l', 'c']) cut[k].push(d[k][i]); });
  for (const tf of ['G', 'H', 'A']) { const b = resample(cut, tf, 0), n = b.c.length;
    for (const [sn, f] of Object.entries(SRC)) for (const mode of ['son', 'kapali']) for (let N = 3; N <= 300; N++) {
      const e = mode === 'son' ? n : n - 1; if (e - N < 0) break; const a = []; for (let i = e - N; i < e; i++) a.push(f(b, i));
      const k = `${tf}|${sn}|${mode}|${N}`, err = Math.abs(med(a) / val - 1) * 100; (res[k] ||= []).push([note, err, med(a)]); } }
}
const rows = Object.entries(res).filter(([, v]) => v.length === PTS.length).map(([k, v]) => [k, v.reduce((s, x) => s + x[1], 0) / v.length, v]).sort((a, b) => a[1] - b[1]);
console.log('EN İYİ 15 (tüm noktalar ortak hesap):'); for (const [k, e] of rows.slice(0, 15)) console.log(k.padEnd(22), 'ort. hata %' + e.toFixed(2));
console.log('\nEn iyinin nokta nokta sonucu:'); for (const [n, e, m] of rows[0][2]) console.log(n.padEnd(28), 'hesap', m.toFixed(1), 'hata %' + e.toFixed(1));
// nokta bazında en iyi
console.log('\nHer nokta için en yakın 3 hesap:');
for (let p = 0; p < PTS.length; p++) { const L = Object.entries(res).filter(([, v]) => v[p]).map(([k, v]) => [k, v[p][1], v[p][2]]).sort((a, b) => a[1] - b[1]).slice(0, 3); console.log(PTS[p][4].padEnd(28), L.map(x => `${x[0]} (${x[2].toFixed(1)}, %${x[1].toFixed(2)})`).join(' · ')); }
