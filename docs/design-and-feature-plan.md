# PoliticAI — Tasarım ve özellik planı

15 Ekim 2026. İlk teslim, geliştirme ortamına özel etkileşimli prototiplerdir. Gerçek API/veritabanı entegrasyonu tasarım seçimi sonrasında yapılır.

## Önizlemeyi açmak

`npm run dev -- --host 127.0.0.1` ardından `/design-preview`.

- A: `/design-preview?layout=a&screen=workspace` — Editör masası: kaynak listesi ve sekmeli taslak incelemesi.
- B: `/design-preview?layout=b&screen=workspace` — Karşılaştırma alanı: yatay haber seçimi, üç taslak yan yana.
- Üst çubuk alternatifleri ve boş/yükleniyor/bağlantı hatası/üretim hatası durumlarını değiştirir.
- A yönünün diğer ekranları: `screen=overview`, `screen=persona`, `screen=history`, `screen=login`.
- Haber seç → Taslak üret → üslup seç → Düzenle → metni kaydet → Taslağı onayla.
- Arama ve filtreler URL'de; düzenlemeler ve onaylar yalnızca bellektedir. Sayfa yenilenince örnek veriye dönülür. Kaydedilmemiş metin ve profil değişiklikleri için uyarı vardır.
- Tüm haberler, kişiler ve yayın kayıtları örnektir. Tarih senaryosu 15 Ekim 2026 / Europe/Istanbul olarak sabittir. Üretim, durum adımlarından oluşan yerel simülasyondur. X yayını kapalıdır.

## Tasarım sistemi

Kâğıt #F7F8FA, yüzey #FFFFFF, mürekkep #202936, ikincil metin #566273, çizgi #DCE2E9, vurgu #315D88. Source Serif 4 başlık; Source Sans 3 arayüz ve metin. Fontlar ve OFL lisansları `src/design-preview/fonts` içinde yereldir. Ekran görüntüsü ve metin uzunluğu için Türkçe içerik kullanılır. Semantik durumlar renk yanında metin/ikon taşır.

Masaüstünde A kaynak ve taslağı ayırır; B üç taslağı yan yana gösterir. Dar ekranlarda içerik sırayla akar. 640 px altında menü açılır, haberler dikey listelenir. Azaltılmış hareket tercihi, skip link, klavye odakları ve ok tuşlarıyla taslak sekmesi seçimi desteklenir.


### A yönü — sıcak palet revizyonu

Kullanıcı tercihiyle A Editör masası ısıtıldı: kâğıt #F7F3EC, yüzey #FFFDF9, mürekkep #352E28, ikincil metin #6E6256, çizgi #DED5C8, kiremit vurgu #9A4F35. Yan menü, haber seçimi, formlar, giriş, diyaloglar ve bildirimler aynı sıcak aileyi kullanır. Ana metin/zemin ve buton yazısında kontrast kontrolü yapıldı; seçili haber üzerindeki ikincil metin 4.73:1, beyaz buton yazısı 5.93:1.

## Skill taraması

Mac'teki `.agents/skills`, `.claude/skills`, `.codex/skills`, proje `.claude/skills` ve plugin cache içindeki ilgili tasarım skill dosyaları tarandı.

- Yerel frontend-design: konuya uygun tipografi, tek belirgin tasarım fikri, gerçekçi Türkçe metinler.
- redesign-existing-projects / yerel redesign-skill: mevcut akışın denetimi, tipografi, boşluk ve durum kapsamı.
- emil-design-eng: sık kullanılan etkileşimlerde hareketi azaltma ve geri bildirimi görünür kılma.
- accessibility-review: klavye, kontrast, form etiketleri, hata ve durum bildirimleri.
- Projedeki ui-ux-pro-max yalnızca wrapper. Plugin kopyasının SKILL.md dosyası bulundu, ancak belirtilen scripts/search.py ve veri dosyaları bulunamadı. Otomatik tasarım araması çalışmadı; kurallar doğrudan uygulandı. Ek paket kurulmadı.

## Özellik 1 — Haber arama ve filtreleme

**Öncelik:** P1, tasarım aktarımının ilk adımı. **Değer:** İlgili habere daha hızlı ulaşmak.

Başlık ve açıklamada Türkçe büyük/küçük harfe duyarsız arama; kaynak, tarih ve işlenme durumu filtreleri. `q`, `source`, `period`, `processed` URL parametreleri birlikte çalışır. Yalnızca mevcut API'nin döndürdüğü veri aranır; kapsam kullanıcıya açıklanır. Tarihler Europe/Istanbul'a göre yorumlanır.

**Bağımlılık:** Frontend liste görünümü, mevcut news-list endpoint'i; yeni DB alanı yok.

**Kabul:** Filtreler birlikte uygulanır, yenileme/geri gezinmede korunur, sıfır sonuçta temizleme yönlendirmesi vardır; hatalı parametreler güvenli varsayılanlara döner.

## Özellik 2 — Aynı üretimin taslaklarını karşılaştırma

**Öncelik:** P1, haber filtrelerinden sonra. **Değer:** Üç anlatım arasında bilinçli seçim.

`GET /webhook/drafts` yanıtına mevcut DB alanı `job_id: string | null` eklenir; ortak DraftItem tipi kullanılır. Gruplama önce job_id ile yapılır. job_id olmayan eski taslaklar haber altında ayrı kayıtlar olarak görünür; aynı üretime aitmiş gibi birleştirilmez. Her taslak kendi düzenleme ve onay durumunu korur. Tek taslağı onaylamak diğerlerini otomatik reddetmez veya onaylamaz.

**Bağımlılık:** n8n drafts SELECT ve frontend tipi; mevcut draft_jobs/drafts ilişkisi, DB migration gerekmiyor.

**Kabul:** Aynı haberin iki ayrı üretimi karışmaz; eksik varyant veya kaynak haberi silinmiş taslaklar görünür kalır; mobilde aynı inceleme sırası korunur.

## Özellik 3 — Düzenleme ve yayın önizlemesi

**Öncelik:** P1, karşılaştırma ile birlikte. **Değer:** Kaydetmeden önce nihai metni incelemek.

Metin, karakter sayacı ve mevcut moderasyon bayrakları aynı panelde gösterilir. Boş/limit üstü içerik engellenir. Kaydetme, mevcut `POST /webhook/draft/update` action=edit çağrısıdır; onay ayrı işlemdir. Düzenleme onayı geçersiz kılar ve edited durumuna döner. Panel/haber değişiminde ve sayfadan ayrılırken kayıp uyarısı verilir. Önizleme prototipinde Unicode kod noktası sayımı kullanılır; gerçek X entegrasyonunda ağırlıklı karakter sayımı ve URL davranışı X kurallarıyla aynı hale getirilmelidir.

**Bağımlılık:** Mevcut düzenleme API'si, istemci metin validasyonu. Sunucu validasyonu son karar mercii olmalı; moderasyon bayraklarının üretimden kaldığı açıkça belirtilmeli, yeni metin için yeniden kontrol son entegrasyonda yapılmalı.

**Kabul:** Boş, 280 üstü, emoji ve çok satırlı metinler denenir; ağ hatasında yazı kaybolmaz; kaydetme tek başına onay veya yayın oluşturmaz; yayınlanmış kayıt düzenlenmez.

## Özellik 4 — Yarım kalan üretime geri dönme

**Öncelik:** P2, temel düzenleme akışı sonrasında. **Değer:** Yenileme ve ağ kesintilerinde devamlılık.

Aktif job_id, kullanıcı ID + client_id anahtarı altında localStorage'a yazılır; token veya içerik saklanmaz. Mount sırasında mevcut job-status endpoint'i sorgulanır. saved/failed, 401/403/404 ve çıkışta kayıt temizlenir. Ağ hatasında durum açıklaması, tekrar deneme ve izlemeyi durdurma seçeneği sunulur; izlemeyi durdurmak sunucudaki işi iptal etmiş gibi gösterilmez. Başka üretim başlatmadan önce aktif iş kontrol edilir. Timer'lar unmount ve oturum değişiminde kapanır; eski cevaplar yeni işe uygulanmaz.

**Bağımlılık:** useJobPoller, AuthContext, mevcut job-status endpoint'i; kullanıcı/client sahipliği sunucuda doğrulanmalı.

**Kabul:** Yenilemede aynı işe dönülür; diğer kullanıcıya geçince eski iş görünmez; bağlantı geri geldiğinde sonuç alınır; terminal durumda sorgular durur. Prototipte üretim simülasyonudur; kalıcı job devamı bu sonraki uygulama adımına aittir.

## Özellik 5 — İşlem yapılabilir günlük özet

**Öncelik:** P2, devamlılık özelliği sonrasında. **Değer:** Güne başlarken sıradaki işi göstermek.

Bekleyen taslaklar, yeni haberler ve başarısız işler ilgili filtreli listeyi açar. Onaylı taslak sayısı ayrıca gösterilebilir. Like/RT/görüntülenme verisi bulunmuyorsa sıfırmış gibi gösterilmez.

Yeni salt okunur `GET /webhook/summary?client_id=…` yanıtı: `{ pending_drafts: number, new_news: number, failed_jobs: number, as_of: string }`. JWT kimliği müşteriyle eşleştirilir. pending_drafts: pending+edited; new_news: İstanbul gün başlangıcından beri fetched_at ve processed=false; failed_jobs: aynı gün updated_at ve status=failed. Başarısız işler bağlantısı için salt okunur filtreli job listesi gerekir: `GET /webhook/jobs?client_id=…&status=failed&date=YYYY-MM-DD` → `{ jobs: [{ id, news_id, status, error_message, updated_at }] }`. Her iki sorgu müşteriye göre sınırlandırılır; haber havuzu mevcut v1 ortak havuzunu kullanır.

**Bağımlılık:** İki n8n okuma workflow'u ve frontend özet/hata listesi. Yeni tablo gerekmez.

**Kabul:** Sayılar listelerle aynı sınırları kullanır; boş gün 0 gösterir; veri alınamazsa 0 yerine hata/tekrar deneme görünür; örnek rakamlar canlı veri olarak sunulmaz.

## Uygulama sırası ve sınırlar

1. İki prototipi karşılaştırıp yön seç.
2. Seçilen bileşenleri mevcut uygulamaya aktar; arama, karşılaştırma ve düzenlemeyi bağla.
3. Üretime geri dönmeyi ekle; ardından günlük özeti gerçek sorgulara bağla.
4. Mevcut n8n migration/key/import bekleyenlerini tamamla; canlı uçtan uca kabulü gerçekleştir.
5. Gerçek X OAuth/yayın aşamasında karakter sayımı, yayın durumları ve rate limit davranışını güncel X şartlarıyla doğrula. Sabit eski plan/fiyat varsayımlarını ürün kuralına dönüştürme.

Takvim, otomatik yayın, ekip rolleri ve çoklu müşteri yönetimi bu teslimin dışında. İnsan onayı her zaman gerekli. Bu önizleme üretimde route veya font asset'i içermemeli.

## Doğrulama kaydı

- TypeScript ve Vite production build başarılı.
- Tarayıcıda 1440 px B ve 390 px A/B için document scrollWidth/clientWidth eşitliği kontrol edildi; yatay taşma görülmedi.
- Üretim ilerlemesi, düzenleme, kayıp uyarısı, kaydetme ve onay akışı denendi. Onay X yayını oluşturmuyor.
- Türkçe büyük harfle arama, kaynakla birleşik sıfır sonuç ve bağlantı hatası görünümü denendi.
- HawkScan önkoşul kontrolü: `hawk version`, `hawk config --help`, `hawk skills status` → komut bulunamadı. DAST taraması yapılamadı; güvenlik taramasından geçtiği iddia edilmiyor.
- Son kontrolde A masaüstü için de 1440 px taşma ölçümü yapıldı; mobil günlük özet/profil/geçmiş/giriş ekranlarında 390 px taşma görülmedi. Boş ve 281 karakterlik metinde kaydetme engellendi; ok tuşuyla üslup seçimi ve moderasyon uyarısı denendi.
- iCloud'un dosyaları yer tutucuya çevirmesi canlı Vite sunucusunu kesintiye uğrattı. İnceleme için yalnızca prototip kaynakları ve fontları `/tmp/politicai-design-local` altında bağımsız yerel sunucuda açıldı; `.env`, token veya gerçek uygulama bağlantıları kopyalanmadı. Kalıcı uygulama kodu repodaki `/design-preview` geliştirme route'udur.
- Production çıktı kontrolü başarılı: önizleme route'u, CSS'i ve Source fontları dist paketine dahil değil. Prototipte fetch/apiGet/apiPost/webhook kullanımı bulunmuyor.
