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
- İki ölçek: **kısa trend** (en yakın iki pin) ve **uzun trend** (dönemin en yüksek tepesinden/en düşük dibinden başlar, sonraki pinlere değer).
- Tam ekranda zaman dilimi seçilir (4S / 1G / 1H); her zaman diliminde trend ve fib o zaman diliminin mumlarıyla ayrı çizilir. Fib kaynağı (uzun/kısa trend) değiştirilebilir.
- Skor hesabı günlük kısa trendi kullanır; uzun trend ve diğer zaman dilimleri grafik ve açıklama içindir.

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

## Borsa Temel (temel.html)
Üç bölüm: Kripto, Borsa Teknik, Borsa Temel. Temel sayfa bilanço ve çarpan verisinden kendi 0-100 kart puanını üretir, dönem senaryosuna (enflasyon, kur şoku, sıkı para vb.) göre yeniden puanlar ve dayanıklılık filtreleri sunar.

- Veri: `temel.mjs` mali tabloları İş Yatırım'dan, fiyatı Yahoo'dan çeker ve `data/temel.json` yazar. Bankalar ilk sürümde yok.
- Çalıştırma: GitHub → Actions → **Temel veri** → Run workflow. Hafta içi her gün 15:40 UTC'de de çalışır.
- İlk kurulumda `debug` alanına `THYAO` yazıp çalıştırın; ham kalemleri ve eşlenen değerleri gösterir. Alan eşlemesi canlı doğrulanmadı, gerekirse `temel.mjs` içindeki kalem adları düzeltilir.
- Piyasa değeri fiyat × ödenmiş sermaye olarak yaklaşık hesaplanır. Sektör ve döviz işaretleri genel bilgiye dayanan başlangıç listesidir.
- Yerelde: `node temel.mjs --only THYAO,ASELS`

## SAR Radar (sar.html)
@emrah_ulu_dag (ULUDAĞ) SAR sisteminin kuralları: ULUDAĞ SAR, Linear TSI ve BIST LRC Kesişme Tarama Pine kodlarının birebir JS karşılığı (`sar_engine.mjs`).
- İki ayrı bölüm, birbirine karışmaz: **Borsa** (Lucid, Parabolic, Triple Fast, Triple Moderate; alttaki SAR'lar; 3/6 aylık; SAR döngüsü seçici; dolar bazlı kesişme) ve **Kripto** (Triple Slow + Linear; üstteki SAR'lar; USDT, BTC/ETH paritesinde kesişme teyidi).
- Zaman dilimleri: günlük, haftalık, aylık, 3/6/12 aylık (TradingView gibi takvim dönemleri; değer dönem içinde canlı). 4 saatlik veri yok.
- Sinyaller: alttan/üstten yana atan SAR, TEK SAR, birleşme, iğne, temas (iptal), 3A+6A çakışması, 6 aylık SAR yakın, aylık SAR tepki adayı (aylık SAR'lar + 21 EMA), LRC alt bant/2 katı, yeşil/turuncu/ideal/riskli kesişme, Linear TSI.
- Her satır için otomatik yorum (kural metinleri sabit kalıptan, rakamlar hesaptan). Medyan/denge/gerçek değer sistem sahibi paylaşmadığı için yok.
- Veri: `sar.mjs` → GitHub → Actions → **SAR veri** → Run workflow. Her gün otomatik çalışır. `data/sar_log.json` sinyal günlüğüdür; 10/30 günlük sonuçlar sayfada "Sinyal geçmişi" olarak görünür.
- Yerelde: `node sar.mjs --only borsa --list THYAO,ASELS` · `node sar.mjs --only kripto --top 50`
- Kartta grafik: günlük/haftalık/aylık mumlar, aktif SAR'lar (yana atan = kalın yatay çizgi), üst dilim SAR Ort. katmanları (Hafta/1A/3A/6A/12A), LRC 300 orta üst/alt ve kanal, KESİŞME etiketleri. Veri tarayıcıda çekilir (BIST: `/.netlify/functions/yahoo?r=max`, kripto: Binance) ve `sar_engine.mjs` ile aynı hesapla çizilir. `sar_engine.mjs` ya da `sar_chart.js` değişirse: `node build_sar.mjs`.
- Vade profili (Kısa / Orta / Uzun): filtreler, durum puanı, SAR merdiveni, yorumdaki "ilk SAR" zaman dilimi ve grafiğin açılış zaman dilimi seçilen vadeye göre (sayfada `PROF`). Kripto kısa vadede 15 dk/4 saatlik grafik ve "15 dk yana atan SAR" canlı taraması (Binance'te en çok yükselen 5 coin).
- Borsa Teknik ve Kripto genel puanına SAR Radar puanı katılır: genel = teknik × (1 − w) + SAR × w, varsayılan w = 0,5 (Gelişmiş ayarlar → "SAR Radar puanının ağırlığı"). SAR puanı = 50 + olumlu sinyaller − olumsuz sinyaller (5–95). `data/sar_*.json` yoksa ya da hisse listede değilse teknik puan aynen kalır. Geri test SAR puanını içermez.
