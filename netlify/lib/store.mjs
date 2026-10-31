// Kullanıcı kayıtları: Netlify Blobs (testte bellek içi)
import { getStore } from '@netlify/blobs';
export function users() {
  if (globalThis.__TEST_KV) { const m = globalThis.__TEST_KV; return { get: async k => m.has(k) ? JSON.parse(m.get(k)) : null, set: async (k, v) => { m.set(k, JSON.stringify(v)); }, del: async k => { m.delete(k); }, keys: async () => [...m.keys()] }; }
  const s = getStore({ name: 'users', consistency: 'strong' });
  return { get: k => s.get(k, { type: 'json' }), set: (k, v) => s.setJSON(k, v), del: k => s.delete(k), keys: async () => (await s.list()).blobs.map(b => b.key) };
}
