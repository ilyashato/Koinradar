// Ortak: imzalı oturum çerezi + parola özeti (Web Crypto; hem Node hem Deno'da çalışır)
const enc = new TextEncoder(), dec = new TextDecoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const hkey = s => crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
export async function sign(payload, secret) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  return body + '.' + b64u(await crypto.subtle.sign('HMAC', await hkey(secret), enc.encode(body)));
}
export function same(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
export async function verify(token, secret) {
  if (!token || !secret) return null;
  const [body, sig] = token.split('.'); if (!body || !sig) return null;
  const exp = b64u(await crypto.subtle.sign('HMAC', await hkey(secret), enc.encode(body)));
  if (!same(exp, sig)) return null;
  try { const p = JSON.parse(dec.decode(unb64u(body))); return p.exp > Date.now() ? p : null; } catch { return null; }
}
export function cookieOf(header, name) {
  for (const part of (header || '').split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim()); }
  return '';
}
export async function hashPw(pw, salt) {
  salt = salt || b64u(crypto.getRandomValues(new Uint8Array(16)));
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, k, 256);
  return { salt, hash: b64u(bits) };
}
export const rand = n => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(n)); return Array.from(r, v => a[v % a.length]).join(''); };
export const today = () => new Date(Date.now() + 108e5).toISOString().slice(0, 10); // Türkiye günü
export const SESSION_MS = 8 * 36e5;
