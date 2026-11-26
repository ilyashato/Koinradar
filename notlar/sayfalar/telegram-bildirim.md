# Telegram bildirimi

**Soru:** Bildirim nasıl çalışıyor, neleri gönderiyor?
**Son güncelleme:** 2026-11-27 · **Kaynak:** `bildir.mjs`, `bildir.yml`, `bildirim.json`, kullanıcı seçimleri (23 Kas)

- Seçimler (kullanıcı): Kripto + Borsa, yeni sinyaller, **saatlik**, ayarlar Claude'a söylenerek `bildirim.json`'a işlenir.
- Çalışma: her saat Playwright ile sayfayı tarar, `data/bildirim_durum.json` ile karşılaştırır, yalnızca YENİ sinyalleri tek mesajda gönderir (en fazla 40 satır).
- Şu anki sinyaller: refD, refT, divB, divT, ma920, kirilim, ma200, sar:kes_teyitli, sar:aylik_tepki, sar:igneli. Zaman: günlük + haftalık (SAR sinyalleri tek, "SAR Radar").
- Ayar değişince bir kez "ayarlar güncellendi" mesajı gelir, sonra yalnız yeniler.
- Gizli anahtarlar GitHub Secrets'ta: `TG_TOKEN`, `TG_CHAT`. Token bir ekran görüntüsünde göründü; kullanıcıya BotFather `/revoke` ile yenilemesi önerildi — **yapılıp yapılmadığı bilinmiyor**.
- Borsa taraması Yahoo verisini canlı siteden alır (giriş koruması açılırsa çalışmaz).
**Bağlantılar:** [sar-gruplari](sar-gruplari.md), [veri-kaynaklari](veri-kaynaklari.md)
