import { users } from '../lib/store.mjs';
import { sign, verify, cookieOf, hashPw, same, rand, today, SESSION_MS } from '../lib/session.mjs';
const DEF = { maxDevices: 2, maxDaily: 5 };
const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const ck = (n, v, age) => `${n}=${encodeURIComponent(v)}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
export default async (req) => {
  const secret = process.env.AUTH_SECRET; if (!secret) return json({ e: 'Sistem yapılandırılmamış.' }, 503);
  const url = new URL(req.url);
  if (url.pathname.endsWith('/logout')) return new Response(null, { status: 204, headers: { 'set-cookie': ck('rs', '', 0) } });
  if (req.method !== 'POST') return json({ e: 'Yöntem desteklenmiyor.' }, 405);
  let b; try { b = await req.json(); } catch { return json({ e: 'Geçersiz istek.' }, 400); }
  const uid = String(b.uid || '').trim(), pw = String(b.pw || '');
  if (!/^\d{3,8}$/.test(uid) || !pw || pw.length > 100) return json({ e: 'Kullanıcı no ya da şifre hatalı.' }, 401);
  const db = users(), u = await db.get('u:' + uid), now = Date.now();
  if (u && u.lockUntil && u.lockUntil > now) return json({ e: 'Çok fazla hatalı deneme. Birkaç dakika sonra tekrar dene.' }, 429);
  const h = await hashPw(pw, u ? u.salt : 'x'.repeat(22));
  if (!u || !same(h.hash, u.hash)) {
    if (u) { u.fails = (u.fails || 0) + 1; if (u.fails >= 5) { u.lockUntil = now + 15 * 6e4; u.fails = 0; } await db.set('u:' + uid, u); }
    return json({ e: 'Kullanıcı no ya da şifre hatalı.' }, 401);
  }
  if (!u.active) return json({ e: 'Hesabın kapalı. Yönetici ile iletişime geç.' }, 403);
  const maxD = u.maxDevices || DEF.maxDevices, maxL = u.maxDaily || DEF.maxDaily;
  let did = cookieOf(req.headers.get('cookie'), 'did'); if (!/^[A-Za-z0-9]{16}$/.test(did)) did = rand(16);
  u.devices = u.devices || [];
  if (!u.devices.includes(did)) { if (u.devices.length >= maxD) return json({ e: `Cihaz sınırı doldu (${maxD}/${maxD}). Yeni cihaz için yönetici ile iletişime geç.` }, 403); u.devices.push(did); }
  const day = today(); u.logins = u.logins || {}; u.logins = { [day]: u.logins[day] || 0 };
  if (u.logins[day] >= maxL) return json({ e: `Günlük giriş kotası doldu (${maxL}). Yarın tekrar dene.` }, 429);
  u.logins[day]++; u.fails = 0; u.lockUntil = 0; u.last = now; u.total = (u.total || 0) + 1;
  await db.set('u:' + uid, u);
  const tok = await sign({ u: uid, d: did, exp: now + SESSION_MS }, secret);
  const h2 = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' });
  h2.append('set-cookie', ck('rs', tok, SESSION_MS / 1000)); h2.append('set-cookie', ck('did', did, 31536000));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: h2 });
};
export const config = { path: ['/api/login', '/api/logout'] };
