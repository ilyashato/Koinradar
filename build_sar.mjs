// sar.html içine motoru (sar_engine.mjs) ve grafiği (sar_chart.js) gömer: node build_sar.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const eng = readFileSync('sar_engine.mjs', 'utf8').replace(/^export /gm, '');
const chart = readFileSync('sar_chart.js', 'utf8');
let html = readFileSync('sar.html', 'utf8');
const A = '/*SAR-GOMULU-BASLA*/', B = '/*SAR-GOMULU-BITIR*/';
const block = `${A}\n${eng}\n${chart}\n${B}`;
if (html.includes(A)) html = html.slice(0, html.indexOf(A)) + block + html.slice(html.indexOf(B) + B.length);
else { const k = html.lastIndexOf('</script>'); html = html.slice(0, k) + block + '\n' + html.slice(k); }
writeFileSync('sar.html', html); console.log('ok', html.length);
