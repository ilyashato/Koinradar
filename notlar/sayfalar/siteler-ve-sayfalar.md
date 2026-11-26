# Siteler ve sayfalar

**Soru:** Hangi sayfalar var, adresleri ne, nereden üretiliyor?
**Son güncelleme:** 2026-11-27 · **Kaynak:** repo dosyaları, kullanıcı kararları

- Site adı **hatofinancial** (hatofinancial.netlify.app). Netlify, GitHub `main` dalından otomatik yayınlar.
- Ana adres (`/`) → Borsa Radarı (`_redirects`: `/ /borsa.html 200!`).
- **Borsa Radarı** `borsa.html` — BIST hisseleri (Yahoo, `netlify/functions/yahoo`). **Kripto** `kripto.html` (aynı içerik `index.html`) — Binance USDT.
- **SAR Radar** `sar.html` (kaynak: `sar_engine.mjs`, `sar_chart.js`, `build_sar.mjs`; veri `data/sar_*.json`, `sar.yml` ile güncellenir).
- **Borsa Temel** `temel.html` (veri `data/temel.json`, `temel.yml`).
- `index.html`, `kripto.html`, `borsa.html` `page.html` + `engine.js`'ten `node build.mjs` ile üretilir; üretilen dosyalar commit'lenir. Doğrudan elle düzenlenmez.
- Netlify `/index.html` adresini `/`'e yönlendirebildiği için Kripto sekmesi `kripto.html`'e gider.

**Bilinmeyen:** Giriş koruması (`login.html`, `AUTH_SECRET`) şu an kapalı; tekrar açılırsa Borsa taraması (Telegram) ve X betiği Yahoo fonksiyonuna erişemez.
**Bağlantılar:** [veri-kaynaklari](veri-kaynaklari.md), [telegram-bildirim](telegram-bildirim.md)
