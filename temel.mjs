// Borsa Temel veri çekici: İş Yatırım mali tabloları + Yahoo fiyatı → data/temel.json
// Kullanım (Node 18+):
//   node temel.mjs                       → listedeki tüm hisseler → data/temel.json
//   node temel.mjs --only THYAO,FROTO    → yalnız bu hisseler (deneme)
//   node temel.mjs --debug THYAO         → İş Yatırım'ın ham kalem listesini yazdırır (alan eşleştirmesini kontrol etmek için)
// Not: bankalar ve sigortalar (farklı tablo yapısı) bu sürümde yok. Piyasa değeri = fiyat × ödenmiş sermaye (pay nominali 1 TL varsayımı).
import { writeFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };

// Sektörler genel bilgiye dayanır (veri kaynağı sektör vermiyor). Yanlış olanı buradan düzeltin.
const SEKTOR = {
  'Havacılık ve ulaştırma': 'THYAO PGSUS TAVHL DOCO CLEBI',
  'Otomotiv': 'FROTO TOASO DOAS OTKAR TTRAK KARSN BRISA KORDS JANTS PARSN TMSN',
  'Savunma': 'ASELS SDTTR',
  'Demir çelik': 'EREGL KRDMD ISDMR CEMTS BRSAN IZMDC',
  'Madencilik ve metal': 'KOZAL KOZAA',
  'Enerji ve elektrik': 'AKSEN ENJSA ODAS ZOREN AYDEM GWIND ALFAS ASTOR EUPWR SMRTG CWENE YEOTK AYGAZ CANTE ENERY MAGEN GESAN KONTR',
  'Petrol ve rafineri': 'TUPRS',
  'Kimya': 'PETKM SASA AKSA GUBRF HEKTS ALKIM KMPUR',
  'Cam ve çimento': 'SISE CIMSA AKCNS OYAKC NUHCM BTCIM BUCIM',
  'Perakende ve gıda': 'BIMAS MGROS SOKM ULKER AEFES CCOLA TATGD TUKAS PNSUT KERVT MAVI VAKKO EBEBK',
  'Dayanıklı tüketim': 'ARCLK VESTL',
  'Telekom': 'TCELL TTKOM',
  'Holding': 'KCHOL SAHOL DOHOL AGHOL ALARK TKFEN',
  'İnşaat ve gayrimenkul': 'ENKAI EKGYO ISGYO RYGYO TRGYO PSGYO SNGYO ALGYO KLGYO HLGYO',
  'Sağlık': 'MPARK ECILC DEVA SELEC',
  'Teknoloji': 'LOGO ARDYZ INDES NETAS',
};
const UNI = Object.entries(SEKTOR).flatMap(([sek, s]) => s.split(' ').map(kod => ({ kod, sek })));

const H = { 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36', 'X-Requested-With': 'XMLHttpRequest' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(url, tries = 3) {
  let last;
  for (let k = 0; k < tries; k++) {
    try {
      const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(25000) });
      if (r.ok) return await r.json();
      last = new Error(r.status + ' ' + url.slice(0, 90));
      if (r.status === 429) await sleep(3000 * (k + 1));
    } catch (e) { last = e; }
    await sleep(800 * (k + 1));
  }
  throw last;
}

const IS = 'https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/MaliTablo';
async function mali(code, periods, group = 'XI_29') {
  const q = new URLSearchParams({ companyCode: code, exchange: 'TRY', financialGroup: group });
  periods.forEach(([y, p], i) => { q.set('year' + (i + 1), String(y)); q.set('period' + (i + 1), String(p)); });
  const j = await getJson(IS + '?' + q);
  return j && j.ok !== false && Array.isArray(j.value) ? j.value : null;
}

const nrm = s => String(s || '').replace(/\(-\)|\(\+\)/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
const num = v => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return Number(s);
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return isFinite(n) ? n : null;
};
const mn = v => (v == null ? null : Math.round(v / 1e6 * 10) / 10);

// İş Yatırım satırlarından, verilen sütun (value1..4) için sade alanları çıkarır. Tutarlar milyon TL.
export function extract(items, col) {
  const rows = items.map(it => ({ code: String(it.itemCode || ''), d: nrm(it.itemDescTr), v: num(it['value' + (col + 1)]) }));
  const bal = rows.filter(r => /^[12]/.test(r.code)), inc = rows.filter(r => /^3/.test(r.code)), cf = rows.filter(r => /^4/.test(r.code));
  const at = (arr, names, from = 0, to = arr.length) => {
    for (const n of [].concat(names)) { for (let i = from; i < to; i++) if (arr[i].d === n) return i; }
    for (const n of [].concat(names)) { for (let i = from; i < to; i++) if (arr[i].d.startsWith(n)) return i; }
    return -1;
  };
  const val = (arr, names, from, to) => { const i = at(arr, names, from, to); return i < 0 ? null : arr[i].v; };
  const iKv = at(bal, 'kısa vadeli yükümlülükler'), iUv = at(bal, 'uzun vadeli yükümlülükler'), iEq = at(bal, 'özkaynaklar');
  const o = {};
  o.ca = val(bal, 'dönen varlıklar');
  o.cash = val(bal, 'nakit ve nakit benzerleri');
  const iNca = at(bal, 'duran varlıklar');
  o.fin_inv = val(bal, 'finansal yatırımlar', 0, iNca > 0 ? iNca : bal.length);
  o.recv = val(bal, 'ticari alacaklar');
  o.inv = val(bal, 'stoklar');
  o.nca = val(bal, 'duran varlıklar');
  o.ta = val(bal, ['toplam varlıklar', 'varlıklar toplamı']);
  o.kvy = val(bal, 'kısa vadeli yükümlülükler');
  o.kvfb = iKv < 0 ? null : val(bal, 'finansal borçlar', iKv, iUv < 0 ? bal.length : iUv);
  o.pay = iKv < 0 ? null : val(bal, 'ticari borçlar', iKv, iUv < 0 ? bal.length : iUv);
  o.uvy = val(bal, 'uzun vadeli yükümlülükler');
  o.uvfb = iUv < 0 ? null : val(bal, 'finansal borçlar', iUv, iEq < 0 ? bal.length : iEq);
  o.eqt = val(bal, 'özkaynaklar');
  o.eq = iEq < 0 ? null : val(bal, ['ana ortaklığa ait özkaynaklar', 'ana ortaklığa ait özkaynak'], iEq);
  if (o.eq == null) o.eq = o.eqt;
  o.pc = iEq < 0 ? null : val(bal, 'ödenmiş sermaye', iEq);
  o.sales = val(inc, ['satış gelirleri', 'hasılat']);
  o.gp = val(inc, 'brüt kar (zarar)') ?? val(inc, 'brüt kar');
  o.ebit = val(inc, ['esas faaliyet karı (zararı)', 'esas faaliyet karı']);
  const iAnaPay = at(inc, 'ana ortaklık payları');
  o.ni = (iAnaPay >= 0 ? inc[iAnaPay].v : null) ?? val(inc, ['net dönem karı (zararı)', 'dönem karı (zararı)', 'net dönem karı']);
  o.cfo = val(cf, ['işletme faaliyetlerinden nakit akışları', 'işletme faaliyetlerinden sağlanan nakit akışları']);
  const iDep = cf.findIndex(r => r.d.includes('amortisman'));
  o.dep = iDep < 0 ? null : cf[iDep].v;
  const cap = cf.filter(r => r.d.includes('duran varlık alım') && r.v != null);
  o.capex = cap.length ? cap.reduce((t, r) => t + Math.abs(r.v), 0) : null;
  const out = {};
  for (const [k, v] of Object.entries(o)) out[k] = mn(v);
  return out;
}

// Bugünden geriye doğru kapanmış (açıklanmış olması muhtemel) dönem adayları: [yıl, ay]
function candidates() {
  const lim = Date.now() - 20 * 864e5, out = [];
  for (let y = new Date().getUTCFullYear(); y >= 2020 && out.length < 6; y--)
    for (const m of [12, 9, 6, 3]) { if (Date.UTC(y, m, 0) < lim) out.push([y, m]); }
  return out.slice(0, 6);
}

async function yahoo(kod) {
  const j = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${kod}.IS?range=5d&interval=1d`);
  const q = j && j.chart && j.chart.result && j.chart.result[0]; if (!q || !q.meta) return null;
  const m = q.meta, p = m.regularMarketPrice, pc = m.chartPreviousClose ?? m.previousClose;
  return { price: p, chg: p && pc ? (p / pc - 1) * 100 : null, ad: m.longName || m.shortName || kod };
}

async function one(u) {
  const cand = candidates();
  let items = await mali(u.kod, cand.slice(0, 4));
  let ci = -1;
  if (items) for (let c = 0; c < 4; c++) { const x = extract(items, c); if (x.ta != null && x.ta > 0) { ci = c; break; } }
  if (ci < 0 && items) { const more = await mali(u.kod, cand.slice(2, 6)); if (more) for (let c = 0; c < 4; c++) { const x = extract(more, c); if (x.ta != null && x.ta > 0) { items = more; ci = c; cand.splice(0, 2); break; } } }
  if (ci < 0) throw new Error('mali tablo yok');
  const [Y, M] = cand[ci];
  const cur = extract(items, ci);
  const per = [[Y - 1, M], [Y - 1, 12], [Y - 2, 12]], uniq = per.filter((p, i) => per.findIndex(q => q[0] === p[0] && q[1] === p[1]) === i);
  const it2 = await mali(u.kod, uniq);
  const get = p => { const k = uniq.findIndex(q => q[0] === p[0] && q[1] === p[1]); const x = it2 && k >= 0 ? extract(it2, k) : null; return x && x.ta > 0 ? x : null; };
  const pyr = get(per[0]), fy0 = get(per[1]), fy1 = get(per[2]);
  const px = await yahoo(u.kod);
  const pcap = cur.pc; // milyon TL = milyon pay (nominal 1 TL varsayımı)
  return { kod: u.kod, ad: px && px.ad || u.kod, sek: u.sek, price: px ? px.price : null, chg: px ? px.chg : null,
    mcap: px && px.price && pcap ? Math.round(px.price * pcap * 10) / 10 : null,
    dc: Y + '/' + M, cur, pyr, fy0, fy1 };
}

async function main() {
  const dbg = opt('debug', null);
  if (dbg && dbg !== true) {
    const cand = candidates(), items = await mali(String(dbg).toUpperCase(), cand.slice(0, 4));
    console.log('adaylar', JSON.stringify(cand.slice(0, 4)));
    if (!items) { console.log('yanıt yok'); return; }
    for (const it of items) console.log(String(it.itemCode).padEnd(8), String(it.itemDescTr).slice(0, 60).padEnd(62), it.value1, it.value2);
    for (let c = 0; c < 4; c++) console.log('sütun', c, JSON.stringify(extract(items, c)));
    return;
  }
  const only = opt('only', null);
  const list = only && only !== true ? UNI.filter(u => String(only).toUpperCase().split(',').includes(u.kod)) : UNI;
  console.log(list.length + ' hisse işlenecek…');
  const rows = [], errors = []; let k = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (k < list.length) {
      const u = list[k++];
      try { const r = await one(u); rows.push(r); console.log('ok', u.kod, r.dc, r.mcap); }
      catch (e) { errors.push({ kod: u.kod, e: String(e.message || e).slice(0, 120) }); console.warn('hata', u.kod, String(e.message || e).slice(0, 120)); }
      await sleep(250);
    }
  }));
  rows.sort((a, b) => a.kod.localeCompare(b.kod));
  console.log(`${rows.length} başarılı, ${errors.length} hata`);
  if (rows.length < Math.min(10, list.length)) { console.error('çok az veri alındı, dosya yazılmadı'); process.exit(1); }
  mkdirSync('data', { recursive: true });
  writeFileSync('data/temel.json', JSON.stringify({ kind: 'temel', generated: Date.now(), rows, errors }));
  console.log('data/temel.json yazıldı');
}
if (import.meta.url === 'file://' + process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });
