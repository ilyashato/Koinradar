// Coin Radarı — komut satırı: tarama + geri test
// Kullanım (Node 18+):
//   node radar.mjs                 → Binance'teki tüm USDT paritelerini tarar, radar.json yazar (--top 50: hacme göre ilk 50)
//   node radar.mjs --backtest      → ayrıca geri test yapar, backtest.json + backtest.md yazar
//   node radar.mjs --export        → candles.json yazar (sayfaya yükleyince her şey sayfada hesaplanır)
//   node radar.mjs --top 80 --symbols BTCUSDT,ETHUSDT --sezgisel 0.6
// Sayfaya yüklemek için: radar.json ve backtest.json dosyalarını "Dosya yükle" ile seçin.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const CR = require('./engine.js');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const TOP = +opt('top', 0), WS = +opt('sezgisel', 0.6), DO_BT = !!opt('backtest', false), DO_EXP = !!opt('export', false);
const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];
const STABLE = /^(USDC|FDUSD|TUSD|DAI|USDP|BUSD|EUR|AEUR|EURI|USDE|PAXG|XUSD|USD1|BFUSD|RLUSD|TRY|BRL|GBP|JPY)$/;

async function get(path) {
  let last;
  for (const h of HOSTS) {
    try { const r = await fetch(h + path); if (r.ok) return await r.json(); last = new Error(h + ' ' + r.status); }
    catch (e) { last = e; }
  }
  throw last;
}
const toSeries = rows => ({ t: rows.map(r => r[0]), o: rows.map(r => +r[1]), h: rows.map(r => +r[2]), l: rows.map(r => +r[3]), c: rows.map(r => +r[4]), v: rows.map(r => +r[5]) });

async function universe() {
  const custom = opt('symbols', '');
  if (custom) return String(custom).split(',').map(s => s.trim().toUpperCase());
  const t = await get('/api/v3/ticker/24hr');
  const now = Date.now();
  const list = t.filter(x => x.symbol.endsWith('USDT') && !/(UP|DOWN|BULL|BEAR)USDT$/.test(x.symbol) && !STABLE.test(x.symbol.replace(/USDT$/, ''))
      && +x.quoteVolume > 0 && +x.lastPrice > 0 && x.closeTime > now - 2 * 864e5)
    .sort((a, b) => +b.quoteVolume - +a.quoteVolume);
  return (TOP > 0 ? list.slice(0, TOP) : list).map(x => x.symbol);
}

async function pool(items, n, fn) { const out = []; let k = 0; await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const i = k++; try { out[i] = await fn(items[i], i); } catch (e) { out[i] = { error: String(e.message || e) }; } } })); return out; }

const syms = await universe();
console.log(`${syms.length} parite taranıyor…`);
const data = await pool(syms, 8, async sym => {
  const [d1, d4] = await Promise.all([get(`/api/v3/klines?symbol=${sym}&interval=1d&limit=1000`), get(`/api/v3/klines?symbol=${sym}&interval=4h&limit=1000`)]);
  return { sym, d: toSeries(d1), d4: toSeries(d4) };
});

const rows = [];
for (const x of data) {
  if (!x || x.error) { console.warn('atlandı', x && x.error); continue; }
  const r = CR.analyze(x.d, { sezgiselW: WS }, x.d4);
  if (!r) { console.warn(x.sym, 'yetersiz geçmiş (<210 gün)'); continue; }
  delete r.I;
  rows.push({ sym: x.sym, ...r, chg24: x.d.c[x.d.c.length - 1] / x.d.c[x.d.c.length - 2] - 1, spark: x.d.c.slice(-60) });
}
rows.sort((a, b) => b.score - a.score);
if (DO_EXP) {
  const cut = (s, n) => Object.fromEntries(Object.entries(s).map(([k, a]) => [k, a.slice(-n)]));
  writeFileSync('candles.json', JSON.stringify({ kind: 'coin-radar-candles', generated: Date.now(), coins: data.filter(x => x && !x.error).map(x => ({ sym: x.sym, d: x.d, d4: cut(x.d4, 400) })) }));
  console.log('candles.json yazıldı');
}
writeFileSync('radar.json', JSON.stringify({ kind: 'coin-radar-scan', generated: Date.now(), sezgiselW: WS, rows }));
console.log('radar.json yazıldı');
const dipRows = rows.filter(r => r.dipStage >= 1 && r.dipStage <= 3).sort((a, b) => b.dip - a.dip);
if (dipRows.length) { console.log('\nDip sıkışması:'); for (const r of dipRows) console.log(r.sym.padEnd(12), ({ 1: 'Maliyetlenme', 2: 'Eşikte', 3: 'Kırılım' })[r.dipStage].padEnd(13), r.dip.toFixed(0).padStart(4), r.ctx.dip.stageText); console.log(''); }
for (const r of rows.slice(0, 15)) console.log(r.sym.padEnd(12), r.score.toFixed(0).padStart(4), r.label.t.padEnd(14), 'K', r.kesin.toFixed(0), 'S', r.sezgisel.toFixed(0), r.badges.map(b => b.t).join(', '));

if (DO_BT) {
  console.log('Geri test çalışıyor…');
  const bt = CR.backtest(data.filter(x => x && !x.error).map(x => ({ sym: x.sym, d: x.d })), { sezgiselW: WS });
  writeFileSync('backtest.json', JSON.stringify({ kind: 'coin-radar-backtest', ...bt }));
  const pc = x => Number.isFinite(x) ? (x * 100).toFixed(2) + '%' : '—';
  const V = { destek: '✅ Destekleniyor', zayif: '◐ Zayıf', yok: '○ Etkisiz', ters: '❌ Ters' };
  let md = `# Coin Radarı geri test\n\n${bt.symbols.length} parite · ${bt.n} gözlem · ufuk ${bt.hMain} gün · taban getiri ${pc(bt.base[bt.hMain].m)}\n\n`;
  md += `Sıra korelasyonu (skor ↔ ${bt.hMain} gün getiri): birleşik ${bt.corr.score.toFixed(3)} · kesin ${bt.corr.kesin.toFixed(3)} · sezgisel ${bt.corr.sezgisel.toFixed(3)}\n\n## Skor kovaları\n\n| Skor | n | ${bt.hMain}g ort. | kazanma |\n|---|---|---|---|\n`;
  for (const b of bt.buckets.score) md += `| ${b.a}–${Math.min(b.b, 100)} | ${b.n} | ${pc(b.mean[bt.hMain].m)} | ${pc(b.win)} |\n`;
  const ST = { 1: 'Maliyetlenme', 2: 'Eşikte', 3: 'Kırılım' };
  md += `\n## Dip sıkışması olay testi\n\nTaban: 30g ${pc(bt.dip.base30)} · 60g ${pc(bt.dip.base60)}\n\n| Aşama | Olay | 14g | 30g | 30g medyan | 60g | 30g kazanma | En iyi 60g | En kötü 60g |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const x of bt.dip.stages) md += `| ${ST[x.stage]} | ${x.events} | ${pc(x.f14)} | ${pc(x.f30)} | ${pc(x.f30med)} | ${pc(x.f60)} | ${pc(x.win30)} | ${pc(x.mfe)} | ${pc(x.mae)} |\n`;
  md += `\n## Kurallar\n\n| Kural | Kademe | Yön | n | fark | t | Karar |\n|---|---|---|---|---|---|---|\n`;
  for (const r of [...bt.rules].sort((a, b) => b.dirT - a.dirT)) md += `| ${r.label} | ${r.tier === 'K' ? 'Kesin' : 'Sezgisel'} | ${r.side > 0 ? '+' : '−'} | ${r.n} | ${pc(r.edge)} | ${r.t.toFixed(1)} | ${V[r.verdict]} |\n`;
  md += `\nNot: Getiriler örtüşen pencerelerden hesaplanır; t değeri etkin örneklem (n/ufuk) ile düzeltilmiştir. Geçmiş sonuç geleceği garanti etmez.\n`;
  writeFileSync('backtest.md', md);
  console.log('backtest.json ve backtest.md yazıldı');
}
