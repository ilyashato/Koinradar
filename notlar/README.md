# Koinradar proje hafızası

Bu klasör, Koinradar / hatofinancial projesinin "ikinci beyni": kararlar, kurallar, ayarlar ve açık konular tek yerde.
**Her şeyi bilmek zorunda olmayan Claude, her oturumda önce `dizin.md`'yi okuyup buradan devam eder.**

> Kural: Buraya şifre, token, anahtar ya da banka/müşteri verisi YAZILMAZ. Depo herkese açık.

## Nasıl kullanılır
- **Not eklemek:** Claude'a düz yaz ("şunu karar verdik…", "şu fikir aklıma geldi…"). Claude doğru sayfayı seçer, günceller, `gunluk.md`'ye bir satır ekler.
- **Soru sormak:** "SAR grupları neydi?", "Telegram'da hangi sinyaller var?" Claude önce `dizin.md`'yi, sonra ilgili sayfayı okur ve cevabın hangi sayfadan geldiğini söyler.
- **Haftalık gözden geçirme (10 dk):** `gunluk.md`'deki son 7 gün, `acik-konular.md`'de bekleyenler, eskiyen sayfalar.

## Kurallar
1. Bir konu = bir sayfa. Aynı şeyi ikinci sayfaya yazma, mevcut sayfayı güncelle.
2. Her bilginin kaynağı olsun (kullanıcı kararı, kod dosyası, eğitim notu sayfası).
3. Emin değilsen sayfaya "Bilinmeyen" olarak yaz, tahmin yazma.
4. Hiçbir sayfa onay almadan silinmez ya da üzerine baştan yazılmaz.
5. Çelişen bilgi bulunursa sayfaya "⚠ Çelişki" notu düşülür.

## Klasörler
- `sayfalar/` — konu sayfaları (işlenmiş bilgi)
- `ham/` — olduğu gibi yapıştırılan notlar, ekran görüntüsü açıklamaları (kaynak; sayfalardan ayrı tutulur)
- `dizin.md` — tüm sayfaların listesi
- `gunluk.md` — değişiklik günlüğü, en yeni en üstte
