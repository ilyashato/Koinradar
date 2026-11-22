// SAR Radar veri üreticisi: BIST (Yahoo) ve Kripto (Binance) günlük mumlarını çeker, sar_engine ile analiz eder,
// data/sar_borsa.json, data/sar_kripto.json ve sinyal günlüğü data/sar_log.json yazar.
// Kullanım (Node 18+):
//   node sar.mjs                 → ikisi
//   node sar.mjs --only borsa    → yalnız BIST   (--only kripto)
//   node sar.mjs --list THYAO,ASELS   → deneme (borsa) / --list BTCUSDT,ETHUSDT (kripto)
//   node sar.mjs --top 150       → kriptoda hacme göre ilk N parite (varsayılan 200)
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { analyze, resample, lrc } from './sar_engine.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36', Accept: 'application/json' };

// BIST evreni: ULUDAĞ "BIST LRC KESISME TARAMA" listesindeki hisseler
const BIST = `A1CAP ACSEL ADEL ADESE ADGYO AEFES AFYON AGESA AGHOL AGROT AGYO AHGAZ AHSGY AKBNK AKCNS AKENR AKFGY AKFIS AKFYE AKGRT AKMGY AKSA AKSEN AKSGY AKSUE AKYHO ALARK ALBRK ALCAR ALCTL ALFAS ALGYO ALKA ALKIM ALKLC ALMAD ALTIN ALTKST ALTNY ALTSPT ALTTHV ALVES ANELE ANGEN ANHYT ANSGR ARASE ARCLK ARDYZ ARENA ARMGD ARSAN ARTMS ARZUM ASELS ASGYO ASTOR ASUZU ATAGY ATAKP ATATP ATEKS ATKMP ATLAS ATSYH AVGYO AVHOL AVOD AVPGY AVTUR AYCES AYDEM AYEN AYES AYGAZ AZTEK BAGFS BAHKM BAKAB BALAT BALSU BANVT BARMA BASCM BASGZ BAYRK BEGYO BERA BEYAZ BFREN BIENY BIGCH BIGEN BIMAS BINBN BINHO BIOEN BIZIM BJKAS BLCYT BMSCH BMSTL BNTAS BOBET BORLS BORSK BOSSA BRISA BRKO BRKSN BRKVY BRLSM BRMEN BRSAN BRYAT BSOKE BTCIM BUCIM BULGS BURCE BURVA BVSAN BYDNR CANTE CASA CATES CCOLA CELHA CEMAS CEMTS CEMZY CEOEM CGCAM CIMSA CLEBI CMBTN CMENT CONSE COSMO CRDFA CRFSA CUSAN CVKMD CWENE DAGHL DAGI DAPGM DARDL DENGE DERHL DERIM DESA DESPC DEVA DGATE DGGYO DGNMO DIRIT DITAS DJIST DMRGD DMSAS DNISI DOAS DOBUR DOCO DOFER DOGUB DOHOL DOKTA DSTKF DURDO DURKN DYOBY DZGYO EBEBK ECILC ECZYT EDATA EDIP EFORC EGEEN EGEGY EGEPO EGGUB EGPRO EGSER EKGYO EKIZ EKOS EKSUN ELITE EMKEL EMNIS ENDAE ENERY ENJSA ENKAI ENSRI ENTRA EPLAS ERBOS ERCB EREGL ERSU ESCAR ESCOM ESEN ETILR ETYAT EUHOL EUKYO EUPWR EUREN EUYO EYGYO FADE FENER FLAP FMIZP FONET FORMT FORTE FRIGO FROTO FZLGY GARAN GARFA GEDIK GEDZA GENIL GENTS GEREL GESAN GIPTA GLBMD GLCVY GLRMK GLRYH GLYHO GMSSPT GMTAS GOKNR GOLTS GOODY GOZDE GRNYO GRSEL GRTHO GRTRK GSDDE GSDHO GSRAY GUBRF GUNDG GWIND GZNMI HALKB HATEK HATSN HDFGS HEDEF HEKTS HKTM HLGYO HOROZ HRKET HTTBT HUBVC HUNER HURGZ ICBCT ICUGS IDGYO IEYHO IHAAS IHEVA IHGZT IHLAS IHLGM IHYAY IMASM INDES INFO INGRM INTEK INTEM INVEO INVES IPEKE ISATR ISBIR ISBTR ISCTR ISDMR ISFIN ISGSY ISGYO ISKPL ISKUR ISMEN ISSEN ISYAT IZENR IZFAS IZINV IZMDC JANTS KAPLM KAREL KARSN KARTN KARYE KATMR KAYSE KBORU KCAER KCHOL KENT KERVN KERVT KFEIN KGYO KIMMR KLGYO KLKIM KLMSN KLNMA KLRHO KLSER KLSYN KLYPV KMPUR KNFRT KOCMT KONKA KONTR KONYA KOPOL KORDS KOTON KOZAA KOZAL KRDMA KRDMB KRDMD KRGYO KRONT KRPLS KRSTL KRTEK KRVGD KSTUR KTLEV KTSKR KUTPO KUVVA KUYAS KZBGY KZGYO LIDER LIDFA LILAK LINK LKMNH LMKDC LOGO LRSHO LUKSK LYDHO LYDYE MAALT MACKO MAGEN MAKIM MAKTK MANAS MARBL MARKA MARTI MAVI MEDTR MEGAP MEGMT MEKAG MEPET MERCN MERIT MERKO METRO METUR MGROS MHRGY MIATK MIPAZ MMCAS MNDRS MNDTR MOBTL MOGAN MOPAS MPARK MRGYO MRSHL MSGYO MTRKS MTRYO MZHLD NATEN NETAS NIBAS NTGAZ NTHOL NUGYO NUHCM OBAMS OBASE ODAS ODINE OFSYM ONCSM ONRYT ORCAY ORGE ORMA OSMEN OSTIM OTKAR OTTO OYAKC OYAYO OYLUM OYYAT OZATD OZGYO OZKGY OZRDN OZSUB OZYSR PAGYO PAMEL PAPIL PARSN PASEU PATEK PCILT PEGYO PEHOL PEKGY PENGD PENTA PETKM PETUN PGSUS PINSU PKART PKENT PLDSPT PLTSPT PLTUR PNLSN PNSUT POLHO POLTK PRDGS PRKAB PRKME PRZMA PSDTC PSGYO QNBFK QNBTR QUAGR RALYH RAYSG REEDR RGYAS RNPOL RODRG ROYAL RTALB RUBNS RYGYO RYSAS SAFKR SAHOL SAMAT SANEL SANFM SANKO SARKY SASA SAYAS SDTTR SEGMN SEGYO SEKFK SEKUR SELEC SELGD SELVA SERNT SEYKM SILVR SISE SKBNK SKTAS SKYLP SKYMD SMART SMRTG SMRVA SNGYO SNICA SNKRN SNPAM SODSN SOKE SOKM SONME SRVGY SUMAS SUNTK SURGY SUWEN TABGD TARKM TATEN TATGD TAVHL TBORG TCELL TCKRC TDGYO TEKTU TERA TETMT TEZOL TGSAS THYAO TKFEN TKNSA TLMAN TMPOL TMSN TNZTP TOASO TRCAS TRGYO TRILC TSGYO TSKB TSPOR TTKOM TTRAK TUCLK TUKAS TUPRS TUREX TURGG TURSG UFUK ULAS ULKER ULUFA ULUSE ULUUN UMPAS UNLU USAK UZERB VAKBN VAKFN VAKKO VANGD VBTYZ VERTU VERUS VESBE VESTL VKFYO VKGYO VKING VRGYO VSNMD YAPRK YATAS YAYLA YBTAS YEOTK YESIL YGGYO YGYO YIGIT YKBNK YKSLN YONGA YUNSA YYAPI YYLGD ZEDUR ZOREN ZRGYO`.split(' ').filter(Boolean);
const ENDEKS = ['XU100', 'XU030', 'XBANK'];

/* ---------------- piyasa ayarları (Borsa ve Kripto birbirinden bağımsız) ---------------- */
export const CFG = {
  borsa: { tz: 3, tfs: ['G', 'H', 'A', '3A', '6A', '12A'], ana: ['H', 'A', '3A', '6A'], lrcTfs: ['G', 'H'], tsiTfs: ['G', 'H', 'A'],
    aktif: ['luc', 'psar', 'fast', 'mod'], derin: -70 },
  kripto: { tz: 0, tfs: ['G', 'H', 'A', '3A', '6A'], ana: ['H', 'A', '3A', '6A'], lrcTfs: ['G', 'H'], tsiTfs: ['G', 'H', 'A'],
    aktif: ['slow', 'lin'], derin: -85 },
};

/* ---------------- veri çekme ---------------- */
async function getJson(url, tries = 3) {
  let last;
  for (let k = 0; k < tries; k++) {
    try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) }); if (r.ok) return await r.json(); last = new Error(r.status + ' ' + url.slice(0, 80)); if (r.status === 429 || r.status === 418) await sleep(4000 * (k + 1)); }
    catch (e) { last = e; }
    await sleep(700 * (k + 1));
  }
  throw last;
}
async function yahoo(sym) {
  for (const host of ['query1', 'query2']) {
    try {
      const j = await getJson(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=946684800&period2=${Math.floor(Date.now() / 1000)}&interval=1d&includePrePost=false`, 2);
      const q = j.chart && j.chart.result && j.chart.result[0]; if (!q || !q.timestamp) return null;
      const z = q.indicators.quote[0], d = { t: [], o: [], h: [], l: [], c: [], v: [] }, seen = new Set();
      for (let k = 0; k < q.timestamp.length; k++) {
        const o = z.open[k], h = z.high[k], l = z.low[k], c = z.close[k];
        if ([o, h, l, c].some(v => v == null || !isFinite(v) || v <= 0)) continue;
        const t = q.timestamp[k] * 1000, dk = Math.floor((t + 108e5) / 864e5);
        if (seen.has(dk) && d.t.length) for (const a of ['t', 'o', 'h', 'l', 'c', 'v']) d[a].pop();
        seen.add(dk);
        d.t.push(t); d.o.push(o); d.h.push(Math.max(h, o, c)); d.l.push(Math.min(l, o, c)); d.c.push(c); d.v.push(z.volume[k] || 0);
      }
      if (d.t.length > 20) { const g = []; for (let k = d.t.length - 20; k < d.t.length; k++) g.push(d.t[k] - d.t[k - 1]); g.sort((a, b) => a - b); if (g[10] > 4 * 864e5) { console.warn('günlük değil:', sym); continue; } }
      return d.c.length ? d : null;
    } catch (e) {}
  }
  return null;
}
const BN = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com', 'https://api3.binance.com'];
let bnBase = null;
async function bn(path) {
  for (const b of bnBase ? [bnBase] : BN) { try { const j = await getJson(b + path, 2); bnBase = b; return j; } catch (e) {} }
  throw new Error('Binance erişilemedi: ' + path);
}
async function bnDaily(sym) {
  const d = { t: [], o: [], h: [], l: [], c: [], v: [] }; let start = 0;
  for (let p = 0; p < 8; p++) {
    const k = await bn(`/api/v3/klines?symbol=${sym}&interval=1d&limit=1000&startTime=${start}`);
    if (!Array.isArray(k) || !k.length) break;
    for (const r of k) { d.t.push(r[0]); d.o.push(+r[1]); d.h.push(+r[2]); d.l.push(+r[3]); d.c.push(+r[4]); d.v.push(+r[7]); }
    if (k.length < 1000) break; start = k[k.length - 1][0] + 1;
  }
  return d.c.length ? d : null;
}
async function pool(items, n, fn) { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = null; } } })); return out; }

// fiyatı başka bir seriye böl (BIST$ = TL / USDTRY, coin/BTC)
function ratio(d, base) {
  const m = new Map(); base.t.forEach((t, i) => m.set(Math.floor((t + 108e5) / 864e5), base.c[i]));
  const o = { t: [], o: [], h: [], l: [], c: [], v: [] };
  d.t.forEach((t, i) => { const b = m.get(Math.floor((t + 108e5) / 864e5)); if (!b) return; o.t.push(t); o.o.push(d.o[i] / b); o.h.push(d.h[i] / b); o.l.push(d.l[i] / b); o.c.push(d.c[i] / b); o.v.push(0); });
  return o;
}

/* ---------------- sinyaller ---------------- */
export const SIG = {
  alt_yana: 'Alttan yana atan SAR', ust_yana: 'Üstten yana atan SAR', tek: 'TEK SAR', birlesme: 'SAR birleşmesi', igne: 'SAR\'a iğne',
  direnc_asildi: 'Direnç SAR\'ı aşıldı', destek_kayip: 'Destek SAR\'ı kaybedildi', cakisma: '3A+6A SAR çakışması', dip6a: '6 aylık SAR yakın',
  aylik_tepki: 'Aylık SAR tepki adayı', trend_bozuk: "Günlük SAR'lar üstte", lrc_alt: 'LRC alt bandın altı', lrc_pahali: 'LRC 2 katı (pahalı)',
  kes_yesil: 'Yeşil kesişme', kes_turuncu: 'Turuncu kesişme', kes_ideal: 'İdeal kesişme', kes_risk: 'Riskli kesişme', kes_usd: 'Dolar bazlı kesişme',
  kes_btc: 'BTC paritesinde kesişme', tsi_yesil: 'Linear TSI yeşil (G+H)', derin: 'Derin düşüş',
};
const POS = ['alt_yana', 'tek', 'direnc_asildi', 'cakisma', 'dip6a', 'aylik_tepki', 'kes_ideal', 'tsi_yesil'];
const NEG = ['ust_yana', 'destek_kayip', 'trend_bozuk', 'lrc_pahali', 'kes_risk'];

function clusters(levels, price) {
  // aynı taraftaki seviyeler: %3 içinde en az 3 SAR → küme
  const out = [];
  for (const side of ['alt', 'ust']) {
    const L = levels.filter(x => x.side === side).sort((a, b) => a.v - b.v);
    for (let i = 0; i < L.length; i++) {
      let j = i; while (j + 1 < L.length && L[j + 1].v <= L[i].v * 1.03) j++;
      if (j - i + 1 >= 3) { const g = L.slice(i, j + 1); out.push({ side, lo: g[0].v, hi: g[g.length - 1].v, n: g.length, tfs: [...new Set(g.map(x => x.tf))], dist: +((g[0].v / price - 1) * 100).toFixed(2) }); i = j; }
    }
  }
  return out;
}

export function signals(a, cfg, extra = {}) {
  const s = new Set(), act = cfg.aktif, P = a.price;
  const each = (tfs, fn) => { for (const tf of tfs) { const r = a.tf[tf]; if (!r) continue; for (const k of act) { const x = r.s[k]; if (x) fn(x, tf, k, r); } } };
  each(cfg.ana, x => { if (x.flatRecent && x.side === 'alt') s.add('alt_yana'); if (x.flatRecent && x.side === 'ust') s.add('ust_yana'); if (x.igne) s.add('igne');
    if (x.flipped && x.side === 'alt') s.add('direnc_asildi'); if (x.flipped && x.side === 'ust') s.add('destek_kayip'); });
  each(cfg.tfs, x => { if (x.tek) s.add('tek'); });
  for (const tf of cfg.tfs) if (a.tf[tf] && a.tf[tf].birlesme) s.add('birlesme');
  const levels = []; each(cfg.tfs.filter(t => t !== 'G'), (x, tf, k) => levels.push({ ...x, tf, k }));
  a.kume = clusters(levels, P);
  if (a.kume.some(k => k.side === 'alt' && k.tfs.includes('3A') && k.tfs.includes('6A') && k.dist > -25)) s.add('cakisma');
  each(['6A'], x => { if (x.side === 'alt' && x.dist > -5) s.add('dip6a'); });
  // Aylık SAR tepki adayı: yukarıdan inip fiyata yaklaşmış aylık SAR'lar, en az 3'ü günlük 21 EMA'nın altında
  const m = a.tf.A; if (m) { const up = act.concat('ort').map(k => m.s[k]).filter(x => x && x.side === 'ust' && x.dist < 25); if (up.length >= 3 && up.filter(x => x.v < a.ema21g).length >= 3) s.add('aylik_tepki'); }
  const g = a.tf.G; if (g && act.every(k => g.s[k] && g.s[k].side === 'ust')) s.add('trend_bozuk');
  const L = a.lrc.G || {}, LH = a.lrc.H || {};
  if (L.konum === 'alt' || LH.konum === 'alt') s.add('lrc_alt');
  if (LH.ortaKat >= 2) s.add('lrc_pahali');
  const kes = L.kesisme || [], lastK = kes[kes.length - 1];
  if (lastK && lastK.ago <= 20) s.add(lastK.tip === 'yesil' ? 'kes_yesil' : 'kes_turuncu');
  const yor = [...(L.yorum || []), ...(LH.yorum || [])];
  if (lastK && lastK.ago <= 30 && yor.includes('ideal')) s.add('kes_ideal');
  if (lastK && lastK.ago <= 30 && yor.some(y => ['tehlikeli', 'arka_arkaya', 'coklu', 'yeni_bant', 'kacti'].includes(y))) s.add('kes_risk');
  if (extra.kesUsd) s.add('kes_usd'); if (extra.kesBtc) s.add('kes_btc');
  if (a.tsi.G && a.tsi.H && a.tsi.G.renk === 'yesil' && a.tsi.H.renk === 'yesil') s.add('tsi_yesil');
  if (L.dusus != null && L.dusus <= cfg.derin) s.add('derin');
  const sig = [...s], puan = sig.filter(x => POS.includes(x)).length - sig.filter(x => NEG.includes(x)).length;
  return { sig, durum: puan >= 2 ? 'olumlu' : puan <= -2 ? 'olumsuz' : 'notr', puan };
}

// Sayfaya giden sade satır (yalnız o piyasanın aktif SAR'ları + SAR Ort.)
function compact(a, cfg) {
  const keep = new Set([...cfg.aktif, 'ort']);
  for (const tf of Object.keys(a.tf)) {
    const r = a.tf[tf]; delete r.bars; delete r.ema5; delete r.ema21; if (!r.birlesme) delete r.birlesme;
    for (const k of Object.keys(r.s)) { if (!keep.has(k)) { delete r.s[k]; continue; } const x = r.s[k]; for (const f of Object.keys(x)) if (x[f] === false || x[f] === null || (f === 'flat' && x[f] === 0)) delete x[f]; }
  }
  return a;
}

/* ---------------- sinyal günlüğü ---------------- */
function logUpdate(log, market, rows, day) {
  const L = (log[market] ||= { e: [] }), price = new Map(rows.map(r => [r.k, r.price]));
  const recent = new Set(L.e.filter(e => day - e.d < 10).map(e => e.s + '|' + e.k));
  for (const r of rows) for (const k of r.sig) if (!recent.has(r.k + '|' + k)) L.e.push({ d: day, s: r.k, k, p: r.price });
  for (const e of L.e) { const p = price.get(e.s); if (!p) continue; const age = day - e.d;
    if (e.r10 == null && age >= 10) e.r10 = +((p / e.p - 1) * 100).toFixed(2);
    if (e.r30 == null && age >= 30) e.r30 = +((p / e.p - 1) * 100).toFixed(2); }
  L.e = L.e.filter(e => day - e.d <= 400);
  const st = {};
  for (const k of Object.keys(SIG)) { const x = L.e.filter(e => e.k === k), m10 = x.filter(e => e.r10 != null), m30 = x.filter(e => e.r30 != null);
    const f = arr => (arr.length ? { n: arr.length, ort: +(arr.reduce((s, e) => s + e.v, 0) / arr.length).toFixed(2), kaz: Math.round(arr.filter(e => e.v > 0).length / arr.length * 100) } : null);
    st[k] = { toplam: x.length, g10: f(m10.map(e => ({ v: e.r10 }))), g30: f(m30.map(e => ({ v: e.r30 }))) }; }
  return st;
}

/* ---------------- çalıştır ---------------- */
async function runBorsa() {
  const list = opt('list') ? String(opt('list')).split(',') : BIST, cfg = CFG.borsa;
  const usd = await yahoo('USDTRY=X');
  const idx = await pool(ENDEKS, 3, s => yahoo(s + '.IS'));
  const piyasa = {};
  ENDEKS.forEach((s, i) => { if (idx[i]) { const a = analyze(idx[i], cfg); piyasa[s] = { ...compact(a, cfg), ...signals(a, cfg) }; } });
  let ok = 0;
  const rows = (await pool(list, 6, async kod => {
    const d = await yahoo(kod + '.IS'); if (!d || d.c.length < 60) return null; ok++;
    const a = compact(analyze(d, cfg), cfg);
    let kesUsd = false; if (usd) { const u = lrc(ratio(d, usd)); const k = (u.kesisme || []).at(-1); kesUsd = !!(k && k.ago <= 20); a.usdKes = k || null; }
    const s = signals(a, cfg, { kesUsd });
    if (ok % 50 === 0) console.log('borsa', ok);
    return { k: kod, ...a, ...s };
  })).filter(Boolean);
  return { kind: 'sar', piyasa: 'borsa', generated: Date.now(), piyasaOzet: piyasa, rows };
}
async function runKripto() {
  const cfg = CFG.kripto; let list;
  if (opt('list')) list = String(opt('list')).split(',');
  else {
    const t = await bn('/api/v3/ticker/24hr'), bad = /^(USDC|FDUSD|TUSD|BUSD|DAI|USDP|PAX|EUR|TRY|GBP|AEUR|USDE|BFUSD|XUSD|USD1|RLUSD|PAXG|WBTC|WBETH)USDT$|(UP|DOWN|BULL|BEAR)USDT$/;
    list = t.filter(x => x.symbol.endsWith('USDT') && !bad.test(x.symbol) && +x.quoteVolume > 0 && +x.lastPrice > 0)
      .sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, +opt('top', 200)).map(x => x.symbol);
  }
  const btc = await bnDaily('BTCUSDT'), eth = await bnDaily('ETHUSDT');
  const piyasa = {}; for (const [k, d] of [['BTCUSDT', btc], ['ETHUSDT', eth]]) if (d) { const a = analyze(d, cfg); piyasa[k] = { ...compact(a, cfg), ...signals(a, cfg) }; }
  let ok = 0;
  const rows = (await pool(list, 4, async sym => {
    const d = sym === 'BTCUSDT' ? btc : sym === 'ETHUSDT' ? eth : await bnDaily(sym); if (!d || d.c.length < 60) return null; ok++;
    const a = compact(analyze(d, cfg), cfg);
    let kesBtc = false;
    if (btc && sym !== 'BTCUSDT') { const r = lrc(ratio(d, btc)); const k = (r.kesisme || []).at(-1); a.btcKes = k || null; kesBtc = !!(k && k.ago <= 20); }
    if (eth && sym !== 'ETHUSDT' && sym !== 'BTCUSDT') { const r = lrc(ratio(d, eth)); a.ethKes = (r.kesisme || []).at(-1) || null; }
    const s = signals(a, cfg, { kesBtc });
    if (ok % 50 === 0) console.log('kripto', ok);
    return { k: sym.replace(/USDT$/, ''), ...a, ...s };
  })).filter(Boolean);
  return { kind: 'sar', piyasa: 'kripto', generated: Date.now(), piyasaOzet: piyasa, rows };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync('data', { recursive: true });
  const only = opt('only'), day = Math.floor(Date.now() / 864e5);
  const log = existsSync('data/sar_log.json') ? JSON.parse(readFileSync('data/sar_log.json', 'utf8')) : {};
  for (const m of ['borsa', 'kripto']) {
    if (only && only !== m) continue;
    try {
      const j = m === 'borsa' ? await runBorsa() : await runKripto();
      if (!j.rows.length) { console.error(m + ': veri gelmedi, dosya değiştirilmedi'); continue; }
      if (!opt('list')) j.stats = logUpdate(log, m, j.rows, day);
      writeFileSync(`data/sar_${m}.json`, JSON.stringify(j));
      console.log(m, j.rows.length, 'satır');
    } catch (e) { console.error(m + ' hata:', e.message); }
  }
  if (!opt('list')) writeFileSync('data/sar_log.json', JSON.stringify(log));
}
