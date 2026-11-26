# Göstergeler: yön bilgisi

**Soru:** "toparlanıyor / zayıflıyor / dönüyor" etiketleri nasıl çalışıyor?
**Son güncelleme:** 2026-11-27 · **Kaynak:** kullanıcı isteği (MFI/CMF/RSI mantığı), `page.html` `indRows`/`slopeOf`

- Fikir (kullanıcıdan): MFI/CMF/RSI 50/0 altında ama yukarı ivmeliyse "güvensiz ama dipten toplanma var" diye ayrı gösterilir; yukarıdayken düşüyorsa "zayıflıyor".
- `slopeOf(seri, i, eşik)`: son 5 mum eğimi, 20 mum aralığına göre.
- Uygulanan: RSI, MFI, CMF (eşik 3 / 5 / 0,04), MACD (histogram, aralığın %25'i), SMI (0,08), Fisher (0,4), WT (4), Demand Index (aralığın %30'u), Vortex (VI farkı daralıyor).
- Aşırı alım/satım uyarılarına dokunulmaz. Yalnızca gösterim, puan değişmez.
- Eşikleri ben (Claude) seçtim; gerçek veride çok sık/az çıkarsa ayarlanacak.
- Grafiklerde sınır çizgileri: önemli seviye kırmızı düz (RSI/MFI 50, CMF/MACD/SMI/Fisher/WT/DI 0, Vortex 1, hacim 1,5), diğerleri soluk kesik; çizgi ucunda güncel değer kutusu (tek çizgili grafiklerde).

**Bağlantılar:** [puanlama-ve-kapilar](puanlama-ve-kapilar.md)
