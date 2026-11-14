// Seçilen coin için paylaşım kartını (Coin Radarı "Paylaş" kartı) üretir ve X'te paylaşır.
// Kullanım: node paylas.mjs BTC [tr|en] [gonder|dene] ["ek metin"]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { TwitterApi } from 'twitter-api-v2';

const [coinArg = 'BTC', lang = 'tr', mod = 'gonder', ...ek] = process.argv.slice(2);
const sym = coinArg.toUpperCase().replace(/USDT$/, '') + 'USDT', extra = ek.join(' ').trim();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
const srv = createServer((q, s) => { const p = join(process.cwd(), q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]); if (!existsSync(p)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); s.end(readFileSync(p)); }).listen(8137);

const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem('cr_top', '300'); } catch {} });
const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('sayfa hatası:', e.message));
await pg.goto('http://localhost:8137/index.html');
await pg.waitForFunction(s => window.__CR && window.__CR.S.coins.some(x => x.sym === s), sym, { timeout: 480000 }).catch(() => { throw new Error(sym + ' bulunamadı (Binance\'te yok ya da 212 günden genç).'); });
const out = await pg.evaluate(async ([s, lg]) => {
  const { S, shareCard } = window.__CR, x = S.coins.find(c => c.sym === s), r = x.res, o = await shareCard(x, '1d', lg); if (!o) return null;
  const buf = new Uint8Array(await o.blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
  return { png: btoa(bin), score: Math.round(r.score), label: r.label.t || r.label.k, name: o.name };
}, [sym, lang]);
await b.close(); srv.close();
if (!out) throw new Error('Kart üretilemedi');
const png = Buffer.from(out.png, 'base64'); writeFileSync('kart.png', png);
const tag = sym.replace(/USDT$/, '');
const text = (extra ? extra + '\n\n' : '') + (lang === 'en'
  ? `$${tag} · daily radar score ${out.score}/100\n\nPersonal project, not investment advice.\nhatofinancial.netlify.app/kripto.html`
  : `$${tag} · günlük radar puanı ${out.score}/100\n\nKişisel proje, yatırım tavsiyesi değildir.\nhatofinancial.netlify.app/kripto.html`);
console.log('Kart hazır:', out.name, '\n--- metin ---\n' + text);
if (mod !== 'gonder') { console.log('DENEME: X\'e gönderilmedi (kart.png artifact olarak yüklenir).'); process.exit(0); }
const k = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'].map(n => process.env[n]);
if (k.some(v => !v)) throw new Error('X anahtarları (Secrets) eksik: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET');
const cl = new TwitterApi({ appKey: k[0], appSecret: k[1], accessToken: k[2], accessSecret: k[3] });
const mid = await cl.v1.uploadMedia(png, { mimeType: 'image/png' });
const t = await cl.v2.tweet({ text, media: { media_ids: [mid] } });
console.log('Paylaşıldı: https://x.com/i/web/status/' + t.data.id);
