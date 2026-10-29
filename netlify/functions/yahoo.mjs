// Yahoo Finance günlük mumlarını (BIST) toplu çeker; tarayıcıdaki CORS engelini aşmak için aracı.
// Kullanım: /.netlify/functions/yahoo?s=THYAO.IS,GARAN.IS,XU100.IS
const ok = /^[A-Z0-9]{2,12}\.IS$/;
async function one(s) {
  for (const host of ['query1', 'query2']) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${s}?range=5y&interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BorsaRadari/1.0)', Accept: 'application/json' } });
      if (!r.ok) continue;
      const j = await r.json(), q = j.chart && j.chart.result && j.chart.result[0];
      if (!q || !q.timestamp) return null;
      const z = q.indicators.quote[0], d = { t: [], o: [], h: [], l: [], c: [], v: [] }, seen = new Set();
      for (let k = 0; k < q.timestamp.length; k++) {
        const o = z.open[k], h = z.high[k], l = z.low[k], c = z.close[k];
        if ([o, h, l, c].some(v => v == null || !isFinite(v))) continue;
        const t = q.timestamp[k] * 1000, dk = Math.floor((t + 108e5) / 864e5);
        if (seen.has(dk) && d.t.length) for (const a of ['t', 'o', 'h', 'l', 'c', 'v']) d[a].pop();
        seen.add(dk);
        const f = v => +v.toFixed(4);
        d.t.push(t); d.o.push(f(o)); d.h.push(f(h)); d.l.push(f(l)); d.c.push(f(c)); d.v.push(Math.round(z.volume[k] || 0));
      }
      return d;
    } catch (e) {}
  }
  return null;
}
export default async (req) => {
  const list = (new URL(req.url).searchParams.get('s') || '').split(',').filter(s => ok.test(s)).slice(0, 12);
  if (!list.length) return new Response('{}', { status: 400, headers: { 'content-type': 'application/json' } });
  const out = {};
  await Promise.all(list.map(async s => { out[s] = await one(s); }));
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=900', 'access-control-allow-origin': '*' } });
};
