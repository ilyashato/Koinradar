import { readFileSync, writeFileSync } from 'node:fs';
const eng = readFileSync('engine.js', 'utf8'), page = readFileSync('page.html', 'utf8');
const body = page.replace('/*ENGINE*/', () => eng);
if (process.env.ARTIFACT) writeFileSync('artifact.html', body);
writeFileSync('index.html', '<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style></head><body>' + body + '</body></html>');
console.log('ok', body.length);
