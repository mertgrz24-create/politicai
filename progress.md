# 15 Ekim 2026 — Gemini varsayılan sağlayıcı

- Varsayılan AI sağlayıcısı Gemini; Claude adaptörü ayarla yeniden seçilebilir durumda korundu. Production dağıtımı READY, TypeScript/build başarılı. HawkScan runtime/anahtar yok; DAST yapılamadı.
- Gemini anahtarı ve modeli kullanıcının tercihiyle sonradan eklenecek; canlı model çağrısı yapılmadı.

---

# 15 Ekim 2026 — Canlı Vercel dağıtımı

- Kişisel Vercel projesi: `mertgrz24s-projects/politicai`.
- Canlı adres: https://politicai-cyan.vercel.app
- Production build ve deployment READY. Mevcut e-posta/şifre ile oturum ve Neon veri uçları canlıda doğrulandı.
- Sunucu ayarları sensitive ortam değişkenleri olarak aktarıldı. Claude anahtarı/modeli sonradan eklenecek; üretim şu an yapılandırma bekliyor. Gerçek X yayını kapalı.
- Ayrıntılar: `docs/vercel-deployment.md`.

---

# 15 Ekim 2026 — n8n’siz Vercel web uygulaması

- Sıcak tonlu A tasarımı korunarak frontend aynı-origin `/api` uçlarına geçirildi.
- Vercel API: HttpOnly oturum, Neon sorguları, persona/haber/taslak/onay/geçmiş, Claude ve Gemini üretim adaptörleri.
- RSS elle toplama ve günlük cron, paylaşılan giriş/yazma/üretim sınırları, job hata ve zaman aşımı yönetimi.
- Mevcut Neon veritabanına ek migration uygulandı; veri silinmedi, client kaydı korundu.
- Claude anahtarı/modeli kullanıcının tercihiyle yapılandırmaya hazır bırakıldı; canlı model çağrısı yapılmadı.
- Frontend/server TypeScript ve production build geçti. Production npm audit: 0; Tailwind 3 geliştirme zincirinde 7 bildirim kaldı. HawkScan runtime/anahtar yok; DAST yapılmadı.
- X yayını uygulanmadı; 501 ile kapalı. Vercel hesabına production dağıtımı henüz yapılmadı.
- Kurulum ve sınırlar: `docs/vercel-deployment.md`. Eski n8n dosyaları arşivde.

---

# PoliticAI — İlerleme Raporu

## 15 Ekim 2026 — Sıcak A tasarımı gerçek uygulamada

- Giriş, günlük özet, haber çalışma alanı, onay kuyruğu, iletişim profili ve geçmiş yeniden tasarlandı.
- Gerçek API entegrasyonları korundu; haber/taslak arama, üslup sekmeleri ve metin önizlemesi eklendi.
- Mobil gezinme, boş/hata/yükleme durumları ve kaydedilmemiş değişiklik koruması ortaklaştırıldı.
- Günlük özet mevcut API verilerinden hesaplanır; yayın stub'ı ve doğrulanmış X yayını arayüzde ayrılır.
- `VITE_X_PUBLISH_ENABLED=false` yeni varsayılandır; X entegrasyonu tamamlanmadan açılmamalı.
- TypeScript/build ve izole API ile UI akışları doğrulandı. HawkScan CLI kurulu olmadığı için DAST yapılamadı.
- Ayrıntılar: `docs/ui-rollout.md`. Önceki n8n/Neon manuel işleri bu tasarım aktarımıyla tamamlanmış sayılmaz.

---

## 15 Ekim 2026 — Tasarım prototipleri

- Geliştirme ortamına özel `/design-preview` eklendi: A Editör masası ve B Karşılaştırma alanı.
- Ortak örnek içerikle arama/filtreleme, üretim simülasyonu, düzenleme, onay ve hata durumları etkileşimli.
- A yönünde giriş, günlük özet, iletişim profili ve geçmiş tasarımları var. Yerel Source fontları ve lisansları eklendi.
- Beş özellik için kabul ölçütleri ve backend bağımlılıkları `docs/design-and-feature-plan.md` içinde.
- Prototipler gerçek n8n/X entegrasyonu yapmaz. Aşağıdaki 4 Temmuz raporunun manuel adımları halen bekliyor.

---

> Son güncelleme: 4 Temmuz 2026. Bu doküman projenin mevcut durumunu, son oturumda
> yapılanları ve senin tarafında bekleyen manuel adımları özetler.

## Şu An Neredeyiz (hızlı hatırlatma)

Kod tarafı tamamen hazır ve doğrulanmış (tsc + build temiz). **Hiçbir şey henüz n8n'de
canlı değil** — aşağıdaki "Senin Yapman Gerekenler" listesindeki 5 adım atılmadan
persona kaydetme, generate, publish ve history akışlarının hiçbiri gerçek ortamda
çalışmaz. Bir sonraki oturumda kaldığımız yer: **adım 1'den (Neon migration) başla.**

## Faz Durumu

| Faz | Kapsam | Durum |
|---|---|---|
| Faz 1 | Altyapı (Neon DB, n8n, React+Vite, JWT auth) | ✅ Tamamlandı |
| Faz 2 | Veri katmanı, persona UI, RSS workflow | ✅ Tamamlandı |
| Faz 3 | AI üretim pipeline (Gemini, job polling) | ✅ Tamamlandı |
| Faz 4 | Onay kuyruğu UI (approve/reject/edit) | ✅ Tamamlandı |
| Faz 6 (kısmi) | **History sayfası** — bu oturumda yazıldı | 🟡 Kod hazır, n8n import bekliyor |
| Faz 5 | X API gerçek yayın (OAuth PKCE, token refresh) | ⬜ Başlanmadı |

> Not: Supabase yerine **Neon** (Postgres) + **n8n JWT auth** kullanılıyor; Realtime yerine
> **2 sn polling** var. CLAUDE.md'deki Supabase referansları bu yönüyle güncel değil.

## Aktif n8n Workflow'ları

`politicai-auth`, `politicai-news-fetch`, `politicai-news-list`, `politicai-generate`,
`politicai-job-status`, `politicai-drafts-api`, `politicai-publish` (stub).

**Henüz import edilmemiş:** `politicai-persona-api` (dosya vardı, n8n'de yok),
`politicai-history-api` (bu oturumda yazıldı).

---

## Bu Oturumda Yapılanlar

### 1. Persona sayfası çalışır hale getirildi (n8n tarafı)
- **Tespit:** UI ([PersonaFormPage.tsx](src/pages/PersonaFormPage.tsx)) zaten hazırdı;
  sorun n8n tarafındaydı. `politicai-persona-api.json` hiç import edilmemişti **ve**
  upsert'teki `ON CONFLICT (client_id)` şemada unique constraint olmadığı için her
  kaydetmede patlayacaktı.
- `scripts/migration-personas-unique-client.sql` yazıldı: duplicate temizliği + unique index.
- `politicai-persona-api.json` düzeltmeleri:
  - `SELECT Persona` node'una `alwaysOutputData: true` — persona kaydı yokken webhook
    timeout'a düşmek yerine `{}` döner (UI default'ları korur).
  - Her iki JWT node'una **UUID format guard'ı** (client_id SQL'e string interpolation ile giriyor).
  - Upsert SQL builder'ına sayı sanitizasyonu (`max_chars` 1-280, `daily_tweet_count` 1-17),
    dizi/voice_examples tip güvenliği, `identity` zorunluluğu.

### 2. "Tweet Üret tüm haberler için üretiyordu" bug fix'i test edildi
- **E2E test sonucu:** Filtre düzeltmesi (`Haber Çek` → `WHERE id='{{news_id}}'`) n8n'de
  **çalışıyor** — execution trace tek haber için tek akış gösterdi. UI tarafındaki çift
  tıklama koruması da yerinde.
- **Ancak test iki gizli bug ortaya çıkardı:**
  1. **Gemini 403 Forbidden:** `GEMINI_API_KEY` ne `.env`'de ne n8n process ortamında
     tanımlı — muhtemelen Faz 3 testlerinde terminalde elle export edilmişti, n8n
     yeniden başlatılınca kayboldu. Üretim şu an bu yüzden çalışmıyor.
  2. **Job'lar hatada takılı kalıyordu:** `Gemini API` ve `JSON Parse & Validate`
     node'larında `onError: "continueErrorOutput"` ayarı yoktu → hata `Hata İşle`
     node'una hiç ulaşmıyor, job sonsuza dek `calling_gemini`'de kalıyordu. Düzeltildi.
- Tekrarlanabilir test script'i: `scripts/e2e-generate-test.sh`.

### 3. Güvenlik onarımları
- **JWT imza doğrulaması geri getirildi:** `politicai-generate`'in JWT node'u bir önceki
  düzenlemede yalnızca decode + exp kontrolüne düşürülmüştü (imza doğrulaması YOK —
  Cloudflare Tunnel dışa açıkken kritik açık). Diğer workflow'lardaki çalışan HMAC
  pattern'i geri kondu. (`politicai-auth` da `require('crypto')` kullanıyor ve çalışıyor —
  bu n8n instance'ında crypto sorunsuz.)
- **UUID format guard'ları** eklendi: generate (`news_id`, `client_id`), publish
  (`draft_id`), persona-api, history-api — hepsi SQL'e string interpolation ile giren
  değerler için injection koruması.
- **`.env.example`'a gerçek secret'lar yazılmıştı** (Neon şifresi, JWT_SECRET,
  ENCRYPTION_KEY, e-posta/şifre). Commit **edilmemişti** — working tree'de yakalandı ve
  placeholder'lara çevrildi. Gerçek değerler `.env`'de duruyor (git-ignored). Ayrıca
  `GEMINI_API_KEY=` satırı eklendi.

### 4. Publish stub genişletildi (History'nin veri kaynağı)
`politicai-publish.json` artık: draft'ı `status='published'` yapar + **`posts` tablosuna
INSERT eder** (`status='published'`, `published_at=now()`, `twitter_post_id=NULL`) +
audit log'a `post_id` yazar. Reddedilmiş taslağın yayınlanması 409 ile engellendi.
Faz 5'te X API çağrısı bu akışın ortasına girecek; veri modeli şimdiden doğru.

### 5. History sayfası (yeni)
- **`politicai-history-api.json`** (yeni workflow): `GET /webhook/history?client_id&hours`
  → JWT doğrula → `posts LEFT JOIN drafts LEFT JOIN news_pool` → tweet + variant +
  kaynak haber başlığı/linki + metrikler. `hours=0` → tümü; sanitize edilmiş (0-8760).
- **[HistoryPage.tsx](src/pages/HistoryPage.tsx)** (yeni sayfa): feed-style kart listesi,
  filtre çipleri (**Son 24 saat** varsayılan / 7 gün / Tümü), variant badge (kuyruktaki
  renklerle aynı), kaynak haber kutusu + dış link, metrik chip'leri (0 + "Free tier —
  metrikler v2'de"), durum ikonları, boş/hata/yükleme durumları.
- Route: `/history` ([App.tsx](src/App.tsx)) — sidebar'daki "Geçmiş" linki artık çalışıyor.
- Tip: `HistoryItem` ([types/index.ts](src/types/index.ts)).

### 6. QueuePage `published` durumu
Tek "Yayınla" artık local state'i `published` yapıyor (eskiden `approved`): mavi
"Yayınlandı" chip'i + mavi sol kenar; yayınlanan kartta Yayınla/Düzenle/Yeniden Üret
gizleniyor; toast metni güncellendi. **Toplu buton hâlâ sadece onaylar** (gerçek toplu
yayın Faz 5'te — rate limit'e duyarlı olması gerekiyor).

### 7. Güvenlik sertleştirme turu (UI/UX taraması ile birlikte)
- **CORS kısıtlaması:** Tüm webhook node'larına `allowedOrigins:
  http://localhost:5173,http://127.0.0.1:5173` eklendi (önceden her origin kabul
  ediliyordu — CLAUDE.md kuralı). Frontend origin'i değişirse bu listeyi güncelle.
- **Timing-safe karşılaştırma:** Tüm JWT node'larında imza kontrolü
  `crypto.timingSafeEqual` ile; auth login'de e-posta/şifre kontrolü de timing-safe +
  başarısız denemede 400 ms gecikme (tunnel üzerinden brute-force yavaşlatma).
- **Eksik UUID guard'ları kapatıldı:** `job-status?job_id=` ve `drafts?client_id=`
  query parametreleri SQL'e guard'sız giriyordu — ikisine de format kontrolü eklendi.
- **Frontend link güvenliği:** RSS'ten gelen haber linkleri `safeHttpUrl` süzgecinden
  geçiyor (`javascript:` şeması engellenir) — NewsPage + HistoryPage.

### 8. UI/UX iyileştirmeleri (ui-ux-pro-max wrapper kurallarına göre)
- `index.css` base layer: koyu arka plan `html`'e taşındı (yüklenirken beyaz flash
  yok), `antialiased`, klavye kullanıcıları için global `:focus-visible` odak halkası.
- NewsPage: `alert()`'ler kaldırıldı → inline hata banner'ı; "Tweet Üret" ana CTA
  brand mavisine alındı; ikon-linklere `aria-label`.
- QueuePage: toplu buton etiketi davranışla eşleşti — **"N Taslağı Onayla"**
  (toplu akış v1'de yalnızca onaylıyor; "Yayınla" etiketi yanıltıcıydı, Faz 5'te geri gelir).
- PersonaFormPage: "espriyle" tonu sarıdan amber'a birleştirildi (Kuyruk/Geçmiş ile tutarlı).
- LoginPage: skill kuralındaki hafif gradient arka plan.

### 9. tsconfig.json editör hatası düzeltildi
`tsconfig.json`'daki `"baseUrl": "."` satırı VSCode'un gömülü TypeScript sürümünde
(6.x, deprecate) editörde hataya sebep oluyordu; proje TS'i (5.9.3) ile CLI'da
görünmüyordu. Satır kaldırıldı — TS 5.1+'dan beri `paths` girdileri (`"@/*": ["./src/*"]`)
zaten tsconfig'in bulunduğu dizine göre çözülüyor, `baseUrl`'e ihtiyaç yok. Vite alias'ı
zaten ayrı olarak `vite.config.ts`'de tanımlı, etkilenmedi. `tsc --noEmit`, `npm run build`
ve tsserver probe'u ile doğrulandı. **Editörde hâlâ görünürse:** Cmd+Shift+P →
"TypeScript: Restart TS Server".

### Doğrulama
- `tsc --noEmit` ✅ ve `npm run build` ✅ temiz.
- Tüm workflow JSON'ları parse ediliyor, bağlantı grafiği tutarlı, tüm `jsCode`
  blokları `node --check`'ten geçiyor.

---

## ⚠️ Senin Yapman Gerekenler (sırayla)

1. **Neon'da migration çalıştır** (SQL Editor):
   `scripts/migration-personas-unique-client.sql` — persona kaydetme bunsuz çalışmaz.

2. **Takılı job'ları temizle** (Neon SQL Editor — onError fix'i öncesinden kalanlar):
   ```sql
   UPDATE draft_jobs SET status='failed', error_message='stale: onError fix öncesi takılı kaldı'
   WHERE status NOT IN ('saved','failed') AND updated_at < now() - interval '10 minutes';
   ```

3. **GEMINI_API_KEY'i tanımla:** anahtarı `.env`'e ekle (`GEMINI_API_KEY=...`) ve n8n'i
   bu ortamla yeniden başlat:
   ```bash
   cd ~/Desktop/twiter && set -a && source .env && set +a && npx n8n
   ```
   (JWT_SECRET vb. de aynı yoldan gidiyor — n8n'i hep böyle başlat.)

4. **n8n'e import/re-import et** (her birinde Postgres credential'ı seç, aktif et).
   Güvenlik turu (CORS + timing-safe) tüm webhook'lu workflow'lara dokunduğu için
   **`politicai-news-fetch` hariç hepsi** yeniden import edilmeli:
   - `politicai-generate.json` — JWT imza + onError + UUID guard + CORS
   - `politicai-publish.json` — posts INSERT + published + CORS
   - `politicai-persona-api.json` — **ilk kez import** + aktif et
   - `politicai-history-api.json` — **ilk kez import** + aktif et
   - `politicai-auth.json` — timing-safe login + brute-force gecikmesi + CORS
   - `politicai-drafts-api.json`, `politicai-job-status.json`,
     `politicai-news-list.json` — timing-safe imza + UUID guard + CORS

5. **Test et:**
   - `bash scripts/e2e-generate-test.sh` → `PASS — 3 varyant, hepsi seçilen habere ait`
     beklenir. (Gemini anahtarı yanlışsa artık job düzgünce `failed` olur, takılmaz.)
   - Persona sayfası: aç → form doluyor → değiştir → Kaydet → yenile → değişiklik duruyor.
   - Kuyruk → bir taslakta "Yayınla" → Geçmiş sayfasında kartı gör (24 saat filtresi).

## Açık İşler / Notlar

- **Model adı:** generate workflow'u URL'de `gemini-2.0-flash` çağırıyor; sen "Gemini 2.5
  Flash" diye anıyorsun. 2.5 istiyorsan URL'deki model adını güncellemek yeterli.
- **Toplu yayın** hâlâ approve-only; gerçek toplu yayın Faz 5'te (17/gün rate limit guard'ı ile).
- **Metrikler** (like/RT/reply) Free tier'da hep 0 — UI'da ibaresi var, v2'de Basic ile dolacak.
- **AUTH_PASSWORD zayıf** (`.env`'de) — dışa açık tunnel varken güçlendirmek iyi olur.
- Faz 5 kalanlar: X Developer portal app, OAuth 2.0 PKCE, token'ların pgcrypto ile
  saklanması (`ENCRYPTION_KEY` hazır), `politicai-publish`'e gerçek X API çağrısı,
  `politicai-publish-batch`, otomatik token refresh, 17/gün rate limit uyarısı.
