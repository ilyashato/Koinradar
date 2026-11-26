# Puanlama ve kapılar

**Soru:** Skor nasıl hesaplanıyor, hangi değişiklik puana etki eder?
**Son güncelleme:** 2026-11-27 · **Kaynak:** `README.md`, `engine.js`, kullanıcı kararları

- 83 kural (25 kesin, 58 sezgisel) + 3 kapı, 6 modül; kaynak: "Eğitim Notları – İnvestorcoin".
- Kapılar: MA200 altı → tavan 40; günlük EMA5/10 aşağı → tavan 55; RSI 50 altı → tavan 50. MACD vetosu momentum puanlarını yarıya indirir.
- Değerlendirme son **kapanmış** mumda yapılır.
- **Puana dokunulmayanlar (yalnızca gösterim/filtre):** gösterge yön etiketleri, Referans mumu, sınır çizgileri, bant yazıları, SAR grupları. (SAR Radar'ın kendi puanı `SAR_POS`/`SAR_NEG` ayrıdır.)
- Fib oranları gizli: `SHOW_FIB=false` (istenince açılır).
- BIST 100 endeksi de skorlanıyor (Borsa piyasa kutusu).

**Açık karar:** Yön bilgisini düşük ağırlıkla puana katma ("50 altında işlem yok" kuralıyla çelişir) — kullanıcı henüz cevaplamadı.
**Bağlantılar:** [gostergeler-yon-bilgisi](gostergeler-yon-bilgisi.md), [acik-konular](acik-konular.md)
