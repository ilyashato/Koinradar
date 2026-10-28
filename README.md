# Coin Radarı

"Eğitim Notları – İnvestorcoin" PDF'indeki kuralların mekanik karşılığıyla çalışan coin tarayıcı ve geri test aracı.

## Yayınlama (GitHub Pages)
Settings → Pages → Source: "Deploy from a branch", Branch: `main` / root. Sayfa Binance'teki tüm USDT paritelerini canlı tarar (Gelişmiş ayarlar'dan ilk 100/50'ye indirilebilir). En az 7 aylık geçmişi olmayan yeni coinler MA200 hesaplanamadığı için listelenmez. Canlı veri alınamazsa `data/candles.json` varsa onu kullanır.

## Dosyalar
- `index.html` — tek dosyalık sayfa. Kendi sitenize (Netlify, GitHub Pages) koyduğunuzda Binance'ten canlı veri çeker.
- `engine.js` — skor motoru (sayfanın içine de gömülü). Sayfa ile geri test aynı kodu kullanır.
- `radar.mjs` — komut satırı (Node 18+).
- `page.html` + `build.mjs` — sayfanın kaynağı; `node build.mjs` motoru gömerek `index.html` üretir.
- `.github/workflows/veri.yml` — elle tetiklenen tarama + geri test; sonuçları `data/` klasörüne yazar.

## Komut satırı
```
node radar.mjs                  # tüm USDT paritelerini tarar → radar.json (--top 50: ilk 50)
node radar.mjs --backtest       # + geri test → backtest.json, backtest.md
node radar.mjs --export         # candles.json → sayfada "Dosya yükle" ile açılır
node radar.mjs --top 80 --sezgisel 0.4 --symbols BTCUSDT,ETHUSDT
```
Not: Binance ABD IP'lerini engeller; GitHub Actions'ın varsayılan sunucularında hata alırsanız komutu Türkiye'den (kendi bilgisayarınızda) çalıştırın.

## Skor
- 83 kural (25 kesin, 58 sezgisel) + 3 kapı, 6 modül: Dip sıkışması %15, Trend & Ortalamalar %22, Yapı (Pin · William · Fib · Dirgen) %20, Para akışı & Hacim %18, Momentum %17, Zaman dilimi uyumu %8.
- **Kesin (K):** tanımı net, standart teknik analiz kuralı.
- **Sezgisel (S):** kursa özgü iddia ya da yoruma açık çizim kuralı. Skora girer; ağırlığı 0–1 arası ayarlanır (varsayılan 0.6).
- Üç skor üretilir: Birleşik, yalnız Kesin, yalnız Sezgisel.
- Kapılar (PDF kuralları): MA200 altı → tavan 40; günlük EMA5/10 aşağı → tavan 55; RSI 50 altı → tavan 50.
- MACD vetosu: MACD boğa ise negatif momentum puanları yarıya iner.
- Değerlendirme her zaman son **kapanmış** günlük mumda yapılır.

## Trend çizgisi ve fib (s.2, 9–12, 57, 68–69)
- Trend çizgisi en yakın iki dip (yükselen) ya da tepe (düşen) pininden çizilir; aradaki mumların gövdesine değmez.
- Kırılım: çizginin ötesinde kapanış. Ortalama hacmin 1.5 katı yoksa "sahte olabilir" diye işaretlenir.
- Fib yalnızca trend kırıldıktan sonra çekilir: kırılan trendin başlangıç pininden uç noktasına. Trend kırılmadıysa fib kuralları çalışmaz.
- Grafikte trend çizgileri, kırılım noktası ve fib seviyeleri çizilir.

## Dip sıkışması (s.27–30, 18, 23)
Sert düşüşten sonra 20/50/100/200 ortalamaların iç içe geçtiği maliyetlenme dönemleri ayrı bir dedektörle izlenir.
- Koşullar: önceki 400 günlük zirveden en az %30 aşağıda, 20/50/100/200 bandı fiyatın %12'sinden dar, en az 20 gün.
- Kalite skoru (0–100): düşüş derinliği 20, bant darlığı 25, süre 20, MA200'ün yataylaşması 10, kutu darlığı 10, tetik 15.
- Aşamalar: Maliyetlenme → Eşikte (fiyat tüm ortalamaların üstünde) → Kırılım (kutu tavanının %3 üstüne, iki kapanış ya da hacimli) → Gecikmiş (%25+ uzak ya da 30+ gün). Aşağı kırılım ayrıca işaretlenir.
- MA200 kapısı nedeniyle bu coinler birleşik skorda düşük görünebilir; sayfada "Dip sıkışması" sıralaması ve aşama filtresiyle ayrı listelenir.
- Geri testte her aşamaya ilk giriş günü olay sayılır; 14/30/60 günlük getiri, kazanma oranı ve 60 gün içindeki en iyi/en kötü fiyat raporlanır.

## Geri test
Her gün, o güne kadarki veriyle skorlanır (ileriye bakılmaz); 3/7/14 günlük getiriye bakılır. Her kural için ateşlendiği günlerin ortalama getirisi tabanla karşılaştırılır; t değeri örtüşen pencereler için düzeltilir. Sonuçlara göre kural çarpanı önerilir (0.25–1.75), sayfada "Geri test ağırlıkları" ile uygulanır.

Yatırım tavsiyesi değildir.
