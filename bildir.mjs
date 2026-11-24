// Saatlik tarama: seçilen sinyallerden YENİ çıkanları Telegram'a gönderir.
// Kullanım: node bildir.mjs [kripto|borsa] [--kuru]   (--kuru: Telegram'a göndermez, ekrana yazar)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const piyasa = process.argv[2] === 'borsa' ? 'borsa' : 'kripto', kuru = process.argv.includes('--kuru');
const cfg = JSON.parse(readFileSync('bildirim.json', 'utf8'));
if (!(cfg.piyasalar || []).includes(piyasa)) { console.log(piyasa + ' kapalı (bildirim.json).'); process.exit(0); }
const TFN = { sar: 'SAR Radar', '1d': 'Günlük', '1w': 'Haftalık', '1m': 'Aylık', '4h': '4 saatlik' }, SITE = 'https://hatofinancial.netlify.app/';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
const srv = createServer((q, s) => { const p = join(process.cwd(), decodeURIComponent(q.url.split('?')[0])); if (!existsSync(p) || p.endsWith('/')) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); s.end(readFileSync(p)); }).listen(8139);

const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
await ctx.addInitScript(n => { try { localStorage.setItem('cr_top', String(n)); } catch {} }, (cfg.kripto && cfg.kripto.ilk_n) || 300);
const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('sayfa hatası:', e.message));
if (piyasa === 'borsa') await pg.route('**/.netlify/functions/yahoo*', async r => { const u = new URL(r.request().url()); try { await r.fulfill({ response: await r.fetch({ url: SITE + '.netlify/functions/yahoo' + u.search }) }); } catch (e) { await r.abort(); } });
await pg.goto(`http://localhost:8139/${piyasa === 'borsa' ? 'borsa' : 'kripto'}.html`);
await pg.waitForFunction(() => window.__CR && window.__CR.S.coins.length > 0, null, { timeout: 120000 });
await pg.waitForFunction(() => /^Canlı/.test((document.querySelector('#status') || {}).textContent || ''), null, { timeout: 600000 }).catch(() => console.log('Tarama süresi doldu, eldeki veriyle devam.'));
const liste = (cfg[piyasa] && cfg[piyasa].liste) || 'hepsi', izin = Array.isArray(liste) ? liste.map(s => s.toUpperCase()) : null;
const aktif = await pg.evaluate(([tfs, keys, izin]) => {
  const { S, SIGS, sigOk } = window.__CR, out = [];
  for (const x of S.coins) { const ad = x.sym.replace(/USDT$/, ''); if (izin && !izin.includes(ad)) continue;
    for (const k of keys) { if (!SIGS[k]) continue; for (const tf of (k.startsWith('sar:') ? ['sar'] : tfs)) { let ok = false; try { ok = sigOk(x, k, tf === 'sar' ? '1d' : tf); } catch (e) {} if (ok) out.push({ id: `${x.sym}|${tf}|${k}`, ad, tf, k, ks: SIGS[k][0], puan: x.res ? Math.round(x.res.score) : null }); } } }
  return out;
}, [cfg.zaman || ['1d'], cfg.sinyaller || [], izin]);
await b.close(); srv.close();

mkdirSync('data', { recursive: true });
const SF = 'data/bildirim_durum.json', st = existsSync(SF) ? JSON.parse(readFileSync(SF, 'utf8')) : {};
const imza = JSON.stringify([cfg.sinyaller, cfg.zaman, liste]), imzaDegisti = st[piyasa + '_ayar'] !== imza;
const onceki = st[piyasa] && !imzaDegisti ? new Set(st[piyasa]) : null, yeni = onceki ? aktif.filter(a => !onceki.has(a.id)) : [];
console.log(`${piyasa}: ${aktif.length} aktif, ${yeni.length} yeni${onceki ? '' : ' (ilk çalışma ya da ayar değişti, referans alındı)'}`);

const baslik = piyasa === 'borsa' ? 'Borsa Radarı' : 'Coin Radarı';
let msg = null;
if (!onceki) msg = `✅ ${baslik} bildirimi ${st[piyasa] ? 'ayarları güncellendi' : 'kuruldu'}.\nŞu an ${aktif.length} aktif sinyal izleniyor; bundan sonra sadece YENİ çıkanlar gelecek.\nSeçili sinyaller: ${(cfg.sinyaller || []).join(', ')}`;
else if (yeni.length) {
  const gr = {}; for (const a of yeni) (gr[`${a.ks} · ${TFN[a.tf] || a.tf}`] = gr[`${a.ks} · ${TFN[a.tf] || a.tf}`] || []).push(a);
  const max = cfg.max_satir || 40; let n = 0, fazla = 0, body = '';
  for (const [g, arr] of Object.entries(gr)) { let satir = ''; for (const a of arr) { if (n >= max) { fazla++; continue; } n++; satir += `  • ${a.ad}${a.puan != null ? ' (' + a.puan + ')' : ''}\n`; } if (satir) body += `\n${g}\n${satir}`; }
  msg = `🔔 ${baslik} · ${yeni.length} yeni sinyal\n${body}${fazla ? `\n… ve ${fazla} tane daha` : ''}\n${SITE}${piyasa === 'borsa' ? 'borsa.html' : 'kripto.html'}\nKişisel proje, yatırım tavsiyesi değildir.`;
}
if (msg) {
  const tok = process.env.TG_TOKEN, chat = process.env.TG_CHAT;
  if (kuru || !tok || !chat) console.log('--- (gönderilmedi) ---\n' + msg);
  else for (let i = 0; i < msg.length; i += 3900) { const r = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: msg.slice(i, i + 3900), disable_web_page_preview: true }) }); if (!r.ok) throw new Error('Telegram hatası: ' + r.status + ' ' + (await r.text())); }
}
if (!kuru) { st[piyasa] = aktif.map(a => a.id); st[piyasa + '_ayar'] = imza; writeFileSync(SF, JSON.stringify(st)); }
