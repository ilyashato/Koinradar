// Tüm sayfaları oturum çerezi olmayana kapatır (giriş sayfası ve yönetici sayfası hariç).
import { verify, cookieOf } from '../lib/session.mjs';
export default async (req, context) => {
  const secret = Netlify.env.get('AUTH_SECRET');
  if (!secret) return context.next(); // yapılandırma yapılana kadar site açık kalır
  if (await verify(cookieOf(req.headers.get('cookie'), 'rs'), secret)) return context.next();
  const url = new URL(req.url);
  if (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'))
    return Response.redirect(new URL('/login.html?next=' + encodeURIComponent(url.pathname), url), 302);
  return new Response('Giriş gerekli', { status: 401 });
};
export const config = { path: '/*', excludedPath: ['/login.html', '/admin.html', '/api/*', '/favicon.ico'] };
