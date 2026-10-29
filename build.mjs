import { readFileSync, writeFileSync } from 'node:fs';
const eng = readFileSync('engine.js', 'utf8'), page = readFileSync('page.html', 'utf8');
const body = page.replace('/*ENGINE*/', () => eng);
const wrap = b => '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style></head><body>' + b + '</body></html>';
if (process.env.ARTIFACT) writeFileSync('artifact.html', body);
writeFileSync('index.html', wrap(body));
// Borsa sürümü: aynı motor, Yahoo verisi, ayrı favori/ayar kayıtları
const SWAP = [
  ['<title>Coin Radarı</title>', '<title>Borsa Radarı</title>'], ['<h1>Coin Radarı</h1>', '<h1>Borsa Radarı</h1>'],
  ["const MODE = /*MODE*/'kripto';", "const MODE = 'borsa';"], ["localStorage.getItem('cr_'", "localStorage.getItem('br_'"], ["localStorage.setItem('cr_'", "localStorage.setItem('br_'"],
  ['placeholder="Coin ara (ör. SOL)" aria-label="Coin ara"', 'placeholder="Hisse ara (ör. THYAO)" aria-label="Hisse ara"'],
  ['Tüm coinler, en yüksek', 'Tüm hisseler, en yüksek'], ['Puanı 60 ve üstü olan coinler.', 'Puanı 60 ve üstü olan hisseler.'],
  ['Yıldızladığın coinler. Yıldız işareti coin satırında ve coin sayfasında.', 'Yıldızladığın hisseler. Yıldız işareti hisse satırında ve hisse sayfasında.'],
  ['dipten dönüş için hazırlanan coinler', 'dipten dönüş için hazırlanan hisseler'], ['Aramaya uyan coin yok.', 'Aramaya uyan hisse yok.'], ['Coin satırındaki', 'Hisse satırındaki'],
  ['yeni coin listede yok', 'yeni hisse listede yok'], ['${n} coin ·', '${n} hisse ·'], ['gerçek coin değil', 'gerçek hisse değil'], ['${bt.symbols.length} coin ·', '${bt.symbols.length} hisse ·'],
  ['Bitcoin uzun vadeli', 'BIST 100 endeksi uzun vadeli'], ['${above}/${n.length} coin uzun', '${above}/${n.length} hisse uzun'],
  ['Bu sayfa Binance\'ten veri çeker.', 'Bu sayfa Yahoo Finance\'ten BIST verisi çeker.'],
  ['</style>', '.row:has(#topSeg){display:none}</style>'],
];
let b2 = body; for (const [a, c] of SWAP) { if (!b2.includes(a)) console.warn('eksik:', a.slice(0, 50)); b2 = b2.split(a).join(c); }
writeFileSync('borsa.html', wrap(b2));
console.log('ok', body.length);
