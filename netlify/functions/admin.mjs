import { users } from '../lib/store.mjs';
import { hashPw, rand, same, today } from '../lib/session.mjs';
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
export default async (req) => {
  const key = process.env.ADMIN_KEY; if (!key) return json({ e: 'ADMIN_KEY tanımlı değil.' }, 503);
  if (req.method !== 'POST') return json({ e: 'Yöntem desteklenmiyor.' }, 405);
  let b; try { b = await req.json(); } catch { return json({ e: 'Geçersiz istek.' }, 400); }
  if (!same(String(req.headers.get('x-admin-key') || ''), key)) return json({ e: 'Yönetici anahtarı hatalı.' }, 401);
  const db = users(), uid = String(b.uid || '');
  const pub = u => ({ uid: u.uid, name: u.name || '', active: !!u.active, devices: (u.devices || []).length, maxDevices: u.maxDevices || 2, today: (u.logins || {})[today()] || 0, maxDaily: u.maxDaily || 5, last: u.last || 0, total: u.total || 0 });
  if (b.action === 'list') {
    const out = []; for (const k of await db.keys()) if (k.startsWith('u:')) out.push(pub(await db.get(k)));
    return json({ users: out.sort((a, c) => +a.uid - +c.uid) });
  }
  if (b.action === 'create') {
    const keys = (await db.keys()).filter(k => k.startsWith('u:')).map(k => +k.slice(2)), uid2 = String(Math.max(1000, ...keys) + 1), pw = rand(10), h = await hashPw(pw);
    const u = { uid: uid2, name: String(b.name || '').slice(0, 60), ...h, active: true, devices: [], logins: {}, maxDevices: +b.maxDevices || 2, maxDaily: +b.maxDaily || 5, created: Date.now() };
    await db.set('u:' + uid2, u); return json({ uid: uid2, pw });
  }
  const u = await db.get('u:' + uid); if (!u) return json({ e: 'Kullanıcı yok.' }, 404);
  if (b.action === 'reset-pw') { const pw = rand(10); Object.assign(u, await hashPw(pw)); u.fails = 0; u.lockUntil = 0; await db.set('u:' + uid, u); return json({ uid, pw }); }
  if (b.action === 'reset-devices') { u.devices = []; await db.set('u:' + uid, u); return json({ ok: true }); }
  if (b.action === 'toggle') { u.active = !u.active; await db.set('u:' + uid, u); return json({ active: u.active }); }
  if (b.action === 'limits') { if (+b.maxDevices > 0) u.maxDevices = +b.maxDevices; if (+b.maxDaily > 0) u.maxDaily = +b.maxDaily; await db.set('u:' + uid, u); return json({ ok: true }); }
  if (b.action === 'delete') { await db.del('u:' + uid); return json({ ok: true }); }
  return json({ e: 'Bilinmeyen işlem.' }, 400);
};
export const config = { path: '/api/admin' };
