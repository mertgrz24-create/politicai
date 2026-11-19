> 15 Ekim 2026 güncellemesi: Bu belgedeki n8n uçları ve VITE_ hesap/yayın ayarları tarihsel bilgidir. Güncel uygulama `/api` uçları ve HttpOnly oturum kullanır; X yayını backend’de 501 ile kapalıdır. Bkz. `vercel-deployment.md`.

# Sıcak A tasarımı — uygulamaya aktarım

15 Ekim 2026. Seçilen Editör masası tasarımı gerçek uygulama ekranlarına aktarıldı.

## Ekranlar

- `/login`: sıcak, iki bölümlü giriş ekranı; gerçek oturum açma işlemi ve hata bildirimi.
- `/`: mevcut haber/taslak API'lerinden günlük özet. Veri alınamazsa sayı yerine `—` ve tekrar deneme görünür.
- `/news`: solda arama/filtreli haber akışı, sağda kaynak ve taslak inceleme. Aynı `job_id` içindeki taslaklar klavyeyle gezilebilen üslup sekmelerinde açılır. Eski üretimler açılır listeden ayrı ayrı seçilir.
- `/queue`: toplu seçim ve onay, taslak listesi, düzenleme/önizleme, reddetme ve yeniden üretim. Toplu onay yayın yapmaz.
- `/settings/persona`: kimlik/hitap, temalar/sınırlar, ses örnekleri ve gelişmiş yönergeler. Mevcut alanlar ve API gövdesi korunur. Profil yüklenemezse kaydetme engellenir.
- `/history`: dönem filtreleri, kaynak haber ve yayın durumu. `twitter_post_id` olmayan kayıtlar X'te yayınlanmış gibi gösterilmez; bağlı olmayan etkileşim verileri sıfırmış gibi sunulmaz.
- Bilinmeyen yollar için geri dönüş bağlantılı 404 ekranı eklendi.

## Ortak arayüz

`src/styles/application.css` içindeki sıcak renk değişkenleri bütün ekranlarda kullanılır. Source Sans 3 ve Source Serif 4 dosyaları/lisansları `src/assets/fonts` altında yereldir; Google Fonts isteği kaldırıldı. Gezinti, formlar, uyarılar, yükleme/boş/hata durumları, odak halkaları ve bildirimler aynı bileşenleri kullanır.

Mobilde menü açılır ve kaynak listesi ekran sınırları içinde dikey kaydırılır. 390, 768 ve 1440 px kontrolleri yapıldı. Azaltılmış hareket tercihi desteklenir. Düzenlenmiş metin ve profil, sayfa değişimi/tarayıcı geri tuşu/yenilemede korunma uyarısı verir. Route engelleme için mevcut React Router'ın data router yüzeyi kullanılır; paket sürümleri değiştirilmedi. Workspace context'i, geliştirme sırasında hot reload ile kimliğini kaybetmemesi için sunum bileşenlerinden ayrıldı.

## Yayın ve bağlantı

Yeni opsiyonel `VITE_X_PUBLISH_ENABLED=false` ayarı, gerçek X yayın entegrasyonu tamamlanana kadar yayın kontrolünü kapalı tutar. Bu ayar bir istemci görünürlük kontrolüdür; sunucu yetkilendirmesinin yerini almaz. Yalnızca n8n akışı gerçek X çağrısı yapacak şekilde tamamlandığında etkinleştirilmeli. Onay, düzenleme ve yayın ayrı işlemlerdir.

n8n endpoint'leri ve veritabanı şeması değiştirilmedi. Bağlantı eksikliği ve ağ/JSON hataları Türkçe bildirilir. Üretim polling zamanlayıcıları sayfadan ayrılırken temizlenir; eski cevaplar yeni işe uygulanmaz. Kesintide durum sorgulama aralığı kademeli uzar. İşin sayfa yenilemesinden sonra kalıcı devamı, özellik yol haritasındaki sonraki iştir.

## Doğrulama

- Proje kaynaklarının temiz, yerel bağımlılıklara sahip kopyasında `npm run build` (TypeScript + Vite) başarılı.
- Ana klasördeki iCloud yer tutucuları derleme erişimini beklettiği için kaynaklarla eşleşen `/tmp/politicai-app-validation` çalışma kopyası kullanıldı. Secret veya kullanıcı parolası kopyalanmadı; testler yalnızca yerel örnek API'ye bağlandı.
- Giriş hatası/başarısı, üretim ilerlemesi, üç varyant, düzenleme, kayıp uyarısı, kayıt, tekli/toplu onay, profil kaydı ve yeniden yüklemede kalıcılık denendi.
- Boş ve 281 karakterlik metinde kaydetme engellendi. Üslup sekmeleri ok tuşlarıyla denendi. Tarayıcı geri tuşunda profil koruması doğrulandı.
- Mobil kuyrukta bulunan yatay taşma giderildi. Yeni sekmede uygulama konsolunda hata görülmedi.
- Test API istek kaydında üretim/düzenleme/onay/profil işlemleri doğrulandı; `/webhook/publish` çağrısı yapılmadı. Sayfa değişiminden sonra ek job-status isteği gelmedi.
- Kontrast kontrolü: normal metin ve vurgu butonları AA eşiğini geçiyor. Seçili menü metni daha koyu kiremit tonu kullanır.
- HawkScan önkoşulları denendi; `hawk` kurulu olmadığı için DAST taraması yapılamadı. Güvenlik taramasından geçtiği iddia edilmiyor.

Canlı n8n/Neon/X ortamına migration, import veya yayın yapılmadı. Önceki manuel backend işleri ve gerçek X entegrasyonu ayrıca tamamlanmalıdır.

Son derleme public bağlantı ayarlarıyla alındı ve `dist/` çıktısına aktarıldı. Production paketinde tasarım önizlemesi, test API adresi veya test giriş bilgisi bulunmadığı kontrol edildi. Test API kapatıldı; yerel uygulama 5173 portunda mevcut public bağlantı ayarlarıyla açıldı. Canlı oturum açma/üretim/yayın bu turda denenmedi.
