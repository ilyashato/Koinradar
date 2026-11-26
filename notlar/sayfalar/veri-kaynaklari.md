# Veri kaynakları

**Soru:** Veri nereden geliyor, nerede sorun çıkar?
**Son güncelleme:** 2026-11-27 · **Kaynak:** kod, deneyim

- Kripto: Binance (tarayıcıdan, `data-api.binance.vision` dahil). Binance ABD IP'lerini engelleyebilir (GitHub Actions riski).
- Borsa: Yahoo Finance, `netlify/functions/yahoo` aracılığıyla.
- SAR verisi: `data/sar_*.json` (Actions: `sar.yml`, günlük 18:50 TR; kripto 03:20 TR).
- Temel veri: `data/temel.json` (`temel.yml`).
- **Yabancı payı (hisse bazında):** Finemar'da ve Yahoo'da yok; İş Yatırım "Günlük Yabancı Oranları" raporu denenecekti. **Karar bekliyor** (A: İş Yatırım çekme, C: elle besleme).
- Geliştirme ortamı (Claude'un sunucusu) Yahoo ve siteye erişemez; testler sahte veriyle yapılır, gerçek doğrulamayı kullanıcı yapar.
**Bağlantılar:** [acik-konular](acik-konular.md)
