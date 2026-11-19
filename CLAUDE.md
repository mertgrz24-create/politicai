# Güncel mimari — 15 Ekim 2026

Bu bölüm aşağıdaki tarihsel planın mimari varsayımlarının yerine geçer. Proje artık n8n kullanmaz: React 18/Tailwind 3 arayüz + Vercel Node.js API + Neon PostgreSQL. API `/api/*`, oturum HttpOnly çerez, tek yönetici/tek server CLIENT_ID. Claude ve Gemini desteği `server/ai.ts` içindedir; model kimliği ve anahtar sunucu ortamından gelir. `npm run dev` arayüz ve API'yi birlikte açar. `npm run db:migrate` ek migration uygular. Dağıtım: `docs/vercel-deployment.md`.

Eski n8n dosyaları `archive/n8n-workflows/` altında referanstır. Yeni iş akışlarını n8n'e ekleme. Gerçek X entegrasyonu henüz uygulanmadı; publish 501 döner. İnsan onayı backend'de zorunludur. Üretim işleri Vercel waitUntil ile sınırlı süre çalışır, kalıcı kuyruk değildir. Sırları VITE_ değişkenlerine taşıma. Aşağıdaki Supabase/n8n/Hostinger mimarisi ve eski fiyat/tier bilgileri güncel karar olarak kullanılmamalı.

---

## Tarihsel proje notları

# PoliticAI — Proje Kontekst Dosyası

> Bu dosya Claude Code oturumlarında otomatik olarak yüklenir. Projenin tüm bağlamını, mimarisini ve karar gerekçelerini içerir.

## Proje Sahibi
- **Geliştirici:** Mert (Uluslararası İlişkiler öğrencisi, AI/automation odaklı)
- **Hedef Müşteri Profili (uzun vade):** Siyasi parti danışmanlık firmaları, medya ajansları — politikacı, milletvekili, belediye başkanı, aday için sosyal medya yönetimi
- **Pilot Kullanıcı (v1):** Yok — geliştirici kendi test verisi ile çalışacak. Persona ve örnek tweet stili `twiter.json` workflow'unun beğenilmiş çıktılarından türetilecek.

## Proje Amacı
Türkiye'deki güncel haberleri okuyan, politikacının kişisel ses/stil profiline uygun tweet varyantları üreten ve insan onayından sonra X (Twitter) hesabına yayınlayan KVKK + seçim mevzuatı uyumlu AI iletişim asistanı.

**Tek cümleyle:** "Haberi okudu, vekilin diliyle 3 farklı tweet yazdı, vekil beğendiğini tek tuşla yayınladı."

---

## v1 vs v2 Kapsam Ayrımı

**v1 (bu doküman):** Tek politikacı, tek X hesabı, local-first (geliştiricinin makinesi). Gerçek Gemini API + gerçek X API. Multi-tenant YOK. Agency layer YOK. White-label YOK.

**v2 (satış sonrası):** Hostinger'da production, multi-tenant SaaS, agency dashboard, white-label, billing, paralı plan (Claude Sonnet, Twitter Basic). v2'ye geçiş için `PROJECT.md` (ayrı doküman, v1 stabil olunca yazılacak).

---

## Mimari Karar Özeti

### Teknoloji Yığını
| Katman | Teknoloji | Gerekçe |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind | UİKT projesinde kanıtlanmış stack |
| Auth & Realtime | Supabase (local Docker) | Auth + Realtime tek pakette, free tier yeterli, production'a aynı kod taşınır |
| Otomasyon | n8n (self-hosted Docker, MacBook Air) | Mevcut twiter.json'u temel alıyoruz, n8n bilgisi sağlam |
| RSS Toplama | n8n RSS Read node (mevcut) | TRT Haber, A Haber, Yeni Şafak — değiştirilebilir |
| AI Analiz | **Gemini 1.5 Flash** (mevcut twiter.json'da çalışıyor) | Hız + free tier. Çıktı kalitesi mevcut workflow'da onaylandı. Üretim katmanı paralı plana switch'lenebilir (Claude Sonnet 4.5). |
| Twitter | X API v2 (Free tier — günde 17 tweet) | v1 için yeterli. Basic ($100/ay) v2'de açılır. |
| Veritabanı | Supabase PostgreSQL (local Docker) | Aynı kod free → paid Supabase'e taşınır |

### KRİTİK MİMARİ KARAR: Mevcut Çalışan Prompt'u Koru
**Sorun:** twiter.json'daki Gemini prompt'u beğenilmiş çıktı üretiyor. Sıfırdan AI mimari kurgusu yapmak bu kazancı kaybedebilir.

**Çözüm:** Mevcut prompt template'i (`role: "professional social media manager for a conservative, religious, and pro-government Turkish politician"` + tone reference + strict rules) **referans olarak korunur**. v1'de bu prompt:
1. Hardcode değil, Supabase `personas` tablosundan dinamik gelir
2. Tek varyant değil, 3 varyant üretir (sert/uzlaşmacı/espriyle)
3. Tek başlık değil, başlık + description birlikte verilir (mevcut workflow'un zayıf yanı — sadece title kullanıyor)
4. JSON output formatında döner (mevcut serbest metin yerine — moderasyon kolaylığı için)

Mevcut prompt'un beğenilen ton/üslubu **sample tweet alanı** olarak `personas.voice_examples`'a kaydedilir. Yeni prompt bunları few-shot örnek olarak kullanır.

### KRİTİK MİMARİ KARAR: Async Webhook + Realtime
**Sorun:** RSS + Gemini + Moderation + DB toplam 5-12 saniye sürer. Senkron webhook'ta UI donar.

**Çözüm:** Avukat projesindeki üç fazlı async akış birebir uyarlanır:
1. UI → n8n webhook (`/generate`): `202 Accepted` döner, `job_id` ile (anında).
2. n8n her adımda Supabase `draft_jobs` tablosunu günceller (`queued` → `fetching_news` → `building_prompt` → `calling_gemini` → `moderating` → `saved` / `failed`).
3. UI Supabase Realtime ile bu satırı dinler, durum değiştiğinde anında günceller.

**Aynı pattern publish için de:** UI → n8n webhook (`/publish` veya `/publish-batch`) → n8n X API'ye yazar → `posts` tablosuna kayıt → Realtime push.

### KRİTİK MİMARİ KARAR: Free → Paid API Geçiş Hazırlığı
**Sorun:** v1 Gemini Free, v2 Claude Sonnet. v1 Twitter Free, v2 Basic. Kod hardcode olursa geçiş sancılı.

**Çözüm:** n8n workflow'larında **environment variable switch'i**:
- `AI_PROVIDER` = `gemini-flash` | `claude-sonnet` (n8n env var)
- `TWITTER_TIER` = `free` | `basic` (rate limit ayarları için)

İki AI sağlayıcı için n8n'de paralel branch hazırlanır, switch node ile seçilir. v2'ye geçişte sadece env var değişir, workflow tekrar yazılmaz. Prompt template'leri aynı (Gemini ve Claude ikisi de aynı JSON formatı kabul eder).

### KRİTİK MİMARİ KARAR: Güvenlik (Avukat projesinden örnek alındı)
- **Kullanıcı kimliği** UI'dan düz `user_id` olarak GİTMEZ. Supabase JWT olarak gider, n8n webhook'ta doğrulanır.
- **X OAuth token'ları** Supabase'de `pgcrypto` ile şifrelenir. Plain text **asla** saklanmaz. Şifreleme anahtarı n8n env var'da tutulur (`.env` dosyası git'e dahil değil).
- **n8n webhook'ları local'de** çalıştığı için **Cloudflare Tunnel** ile expose edilir (production benzeri test için). v2'de production tunnel yerine Hostinger reverse proxy.
- **CORS:** Supabase ve n8n webhook'ları sadece localhost:5173 ve Cloudflare Tunnel URL'inden gelen istekleri kabul eder.

### KRİTİK MİMARİ KARAR: İçerik Moderasyonu ve İnsan Onayı
**Yasal/etik zorunluluk:** Siyasi içerik yayınlanmadan **mutlaka insan onayından geçer**. Tam otomatik yayın YOK. Bu hem KVKK m.11 (kişinin profil çıkarmasına itiraz hakkı) hem seçim mevzuatı (YSK) hem de itibar riski açısından zorunlu.

**Çözüm:** Üç katmanlı kontrol:
1. **Otomatik moderasyon** (n8n moderation node): banned_words regex match, karakter limiti, küfür/hakaret listesi, URL içeriyor mu kontrolü. Flag'li olsa bile draft yazılır, editör görür.
2. **İnsan onayı** (UI onay kuyruğu): Editör/politikacı kendi gözüyle okur, "Yayınla" butonuna tıklar.
3. **Audit log** (`audit_log` tablosu): Kim hangi tweet'i ne zaman onayladı, kim reddetti, hepsi kayıt altında.

---

## Akış Diyagramı

```
┌─────────────┐
│ Frontend    │  React + Tailwind + Supabase JS
│ (localhost) │  Onay kuyruğu UI, JWT auth
└──────┬──────┘
       │ POST /generate (job_id, news_id) + JWT
       ▼
┌─────────────┐
│ n8n Webhook │  ① JWT doğrula  ② job_id üret  ③ 202 Accepted dön
│ (Docker)    │
└──────┬──────┘
       │ async (Supabase status updates her adımda)
       ▼
┌─────────────────────────────────────────────────────────────┐
│ AI ÜRETİM AKIŞI                                              │
│ ┌─────────┐  ┌──────────┐  ┌─────────────┐  ┌────────────┐ │
│ │Persona  │→ │Prompt    │→ │Gemini Flash │→ │JSON parse  │ │
│ │çek (DB) │  │oluştur   │  │(3 varyant)  │  │+ doğrula   │ │
│ └─────────┘  └──────────┘  └─────────────┘  └─────┬──────┘ │
└──────────────────────────────────────────────────────┼──────┘
                                                       │
                                                       ▼
                                              ┌──────────────┐
                                              │ Moderation   │
                                              │ (regex+rules)│
                                              └──────┬───────┘
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │ Supabase     │
                                              │ drafts INSERT │
                                              │ status='saved'│
                                              └──────┬───────┘
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │ Realtime push│
                                              │ → UI günceller│
                                              └──────────────┘

═══════════════════════════════════════════════════════════════

Ayrı akış — Yayınlama (UI'dan tetiklenir):

  UI "Yayınla" tıklar (tek veya toplu seçim)
       ▼
  n8n Webhook /publish veya /publish-batch
       ▼
  JWT doğrula → posts.status = 'publishing' (Realtime push)
       ▼
  X API v2 OAuth 2.0 ile gönder
  (Free tier rate limit kontrolü: günlük 17 sınırı)
       ▼
  posts.status = 'published' veya 'failed' (Realtime push)
       ▼
  UI anında günceller, toast gösterir
```

---

## Veritabanı Şemaları (Supabase)

### `clients` — Politikacı/Aday Profili (v1'de tek kayıt)
```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  twitter_handle text,
  twitter_oauth_token text,         -- pgcrypto ile şifrelenmiş
  twitter_oauth_refresh_token text, -- pgcrypto ile şifrelenmiş
  twitter_token_expires_at timestamptz,
  twitter_connected boolean default false,
  status text default 'active' check (status in ('active','paused')),
  created_at timestamptz default now()
);

alter table clients enable row level security;
create policy "owner sees own client" on clients
  for all using (auth.uid() is not null);
```

### `personas` — Stil ve Kimlik Profili
```sql
create table personas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  identity text not null,                    -- "Bursa Büyükşehir Belediye Başkanı"
  ideology text not null,                    -- conservative (v1'de tek varsayılan)
  themes text[] default '{}',                -- ['aile','ekonomi','şehir hizmetleri']
  banned_words text[] default '{}',
  banned_topics text[] default '{}',
  address_form text,                         -- "Aziz milletim"
  voice_examples jsonb default '[]',         -- twiter.json'daki örnek tone + üretilen beğenilen tweet'ler
  reference_prompt text,                     -- twiter.json'daki orijinal prompt (referans)
  max_chars int default 280,
  daily_tweet_count int default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table personas enable row level security;
create policy "owner sees own personas" on personas
  for all using (auth.uid() is not null);
```

### `news_pool` — Toplanan Haberler
```sql
create table news_pool (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,                 -- "TRT Haber", "A Haber", "Yeni Şafak"
  title text not null,
  description text,                          -- twiter.json'da kullanılmıyordu, ekledik
  link text unique,                          -- dedup için unique
  published_at timestamptz,
  fetched_at timestamptz default now(),
  processed boolean default false,
  relevance_score float                      -- opsiyonel — gelecek için
);
```

### `draft_jobs` — İçerik Üretim İş Durumu (Avukat'tan birebir uyarlama)
```sql
create table draft_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) not null,
  news_id uuid references news_pool(id),
  status text not null check (status in (
    'queued','fetching_news','building_prompt','calling_gemini',
    'moderating','saved','failed'
  )),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table draft_jobs enable row level security;
create policy "owner sees own jobs" on draft_jobs
  for select using (auth.uid() is not null);
```

### `drafts` — Onay Bekleyen Tweet Varyantları
```sql
create table drafts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  news_id uuid references news_pool(id) on delete set null,
  job_id uuid references draft_jobs(id) on delete set null,
  content text not null,
  variant_label text check (variant_label in ('sert','uzlasmaci','espriyle')),
  status text default 'pending' check (status in ('pending','approved','rejected','edited','published')),
  moderation_flags text[] default '{}',
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

alter table drafts enable row level security;
create policy "owner sees own drafts" on drafts for all using (auth.uid() is not null);
```

### `posts` — Yayınlanmış Tweet'ler
```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references drafts(id),
  client_id uuid references clients(id) on delete cascade not null,
  content text not null,
  twitter_post_id text,
  status text default 'publishing' check (status in ('publishing','published','failed')),
  error_message text,
  published_at timestamptz,
  -- Twitter Free tier metric okuma desteklemiyor — v2'de doldurulacak
  likes int default 0,
  retweets int default 0,
  replies int default 0,
  last_metrics_sync timestamptz
);

alter table posts enable row level security;
create policy "owner sees own posts" on posts for all using (auth.uid() is not null);
```

### `audit_log` — Onay/Red Kayıtları (Hukuki Sorumluluk İçin)
```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,    -- 'approve','reject','edit','publish','batch_publish'
  resource_type text,      -- 'draft','post'
  resource_id uuid,
  details jsonb,
  created_at timestamptz default now()
);
```

---

## Skill Listesi (`.claude/skills/`)

Her skill bağımsız çalışabilir bir yetkinlik. Claude Code aktif olduğunda otomatik tetiklenir.

| Skill | Görev | Aşama |
|---|---|---|
| `ui-ux-pro-max` | Onay kuyruğu, persona ekranı, dashboard tasarımı — 67 UI stili + 161 reasoning rule | 2, 4 |
| `supabase-auth` | JWT doğrulama, RLS politikaları, Realtime kanalı kurulumu | 1, 6 |
| `n8n-workflow-builder` | Mevcut twiter.json'u temel alıp async/realtime pattern'e dönüştürme | 3 |
| `gemini-prompt-engineering` | Mevcut twiter.json prompt'unu persona-aware şekilde generic'leştirme + 3 varyant + JSON output | 3 |
| `content-moderation` | Banned words regex, karakter limiti, küfür filtresi, URL kontrolü | 3 |
| `twitter-oauth-publish` | X API v2 OAuth 2.0 PKCE, tek tweet yayın, toplu yayın (rate limit'e duyarlı) | 5 |
| `json-structuralist` | Gemini JSON output şema doğrulama, fallback, retry mantığı | 3 |
| `api-provider-switch` | Gemini ↔ Claude geçiş soyutlaması, env var yönetimi | 3, 7 |

### UI/UX Pro Max Skill Kurulumu

Bu skill GitHub'dan ayrı kuruluyor, dış kaynak:

```bash
npm install -g uipro-cli
uipro init --ai claude
```

Repo: `nextlevelbuilder/ui-ux-pro-max-skill`. 67 UI stili (modern, minimal, glassmorphism, neumorphism vb.) ve 161 reasoning rule içerir. Onay kuyruğu, persona düzenleme ve dashboard ekranları yazılırken otomatik tetiklenecek — özellikle "sticky action bar", "card with checkbox + actions", "progress indicator" gibi pattern'leri profesyonel şekilde önerir. Frontend kodlama başlamadan önce mutlaka kurulmalı.

---

## Geliştirme Yol Haritası

### Faz 1: Altyapı (3-4 gün)
- [ ] Supabase local (Docker) + schema kur
- [ ] n8n self-hosted çalıştır (Docker, mevcut twiter.json import et — bozma, referans olarak kalsın)
- [ ] React + Vite + TypeScript + Tailwind proje kur
- [ ] UI/UX Pro Max skill kur (`uipro init --ai claude`)
- [ ] Supabase JWT auth çalışsın (basit email/şifre)
- [ ] Cloudflare Tunnel kur (n8n webhook'larını expose et)

### Faz 2: Veri ve Persona Katmanı (2 gün)
- [ ] `clients` tablosuna geliştirici kendisini insert eder
- [ ] `personas` formu UI'da hazırla — twiter.json'daki prompt'taki muhafazakar profili **varsayılan voice_examples** olarak doldur
- [ ] `news_pool` tablosu ve yeni n8n RSS toplama workflow'u (3 kaynak: TRT, A Haber, Yeni Şafak — mevcut workflow'dan al)

### Faz 3: AI Üretim Pipeline (3-4 gün)
- [ ] Yeni n8n workflow: `politicai-generate` — webhook tetiklenir, async, status update'leri yapar
- [ ] Persona-aware prompt template'i (twiter.json prompt'u referans, 3 varyant + JSON output formatı)
- [ ] Gemini Flash node (mevcut credential)
- [ ] Moderation node (regex + banned_words)
- [ ] `drafts` tablosuna INSERT
- [ ] Hata yönetimi (status='failed' + error_message)
- [ ] Test: Tek haber için 3 varyant üretsin, ortalama 5-8 saniyede tamamlansın

### Faz 4: Onay Kuyruğu UI (3-4 gün)
- [ ] Login + JWT entegrasyonu
- [ ] Onay kuyruğu sayfası — UI/UX Pro Max ile sticky action bar tasarımı
  - Toplu seç checkbox
  - Tek tek "Hemen Yayınla" butonu
  - "Yeniden Üret" butonu (yeni job tetikler)
  - Düzenle (inline textarea)
  - Reddet
- [ ] Supabase Realtime subscription — yeni draft girince anında listede gözüksün
- [ ] Variant badge renkli (sert kırmızı, uzlaşmacı yeşil, espriyle sarı)
- [ ] Moderation flag varsa sol kenar amber çubuk + uyarı metni

### Faz 5: X API Yayın (3-4 gün)
- [ ] X Developer Portal'da app aç (Free tier)
- [ ] OAuth 2.0 PKCE flow — kendi X hesabını bağla
- [ ] Token'ları `clients` tablosuna pgcrypto ile şifreli kaydet
- [ ] `politicai-publish` n8n workflow'u — tek tweet
- [ ] `politicai-publish-batch` n8n workflow'u — sırayla, aralarında bekleme
- [ ] Otomatik token refresh
- [ ] UI'da "Hemen Yayınla" ve toplu yayın butonları aktif
- [ ] Rate limit guard: Free tier günlük 17 sınırına yaklaşıldığında uyarı

### Faz 6: History ve Polish (2 gün)
- [ ] History sayfası — yayınlanmış tweet'ler listesi
- [ ] Audit log entegrasyonu — her aksiyon kayıt altında
- [ ] Settings sayfası — persona düzenleme, banned_words yönetimi
- [ ] Hata bildirimleri (toast + UI banner)
- [ ] Manuel test: kendin 1-2 hafta günlük kullan, çıktı kalitesini gözlemle

### Faz 7: API Provider Switch ve Production Hazırlığı (v1→v2 köprüsü, 2 gün)
- [ ] n8n env var: `AI_PROVIDER` ekle, Gemini ↔ Claude switch'i
- [ ] Twitter rate limit config: `TWITTER_TIER` env var
- [ ] Hostinger taşınma checklist'i hazırla (DB dump, env var transfer, domain bağlama)
- [ ] Production secrets yönetimi planı

---

## Bilinen Riskler & Notlar

1. **Twitter Free tier metric okuma desteklemiyor:** Yayınlanan tweet'lerin like/RT/reply sayıları v1'de **0 görünür**. UI'da bunu "Free tier — metrikler v2'de gelecek" ibaresiyle bildir. Gerçek metrik için Basic plan ($100/ay) şart.

2. **Twitter Free tier günde 17 tweet sınırı:** v1 geliştirme/test için yeter ama gerçek bir politikacı için günlük 3-8 tweet gerekirse Free tier hafta yetmez. v1 demo amaçlı, kapsamlı kullanım için Basic'e geçiş zorunlu.

3. **Gemini Flash Türkçe siyasi nüansta orta düzey:** Mevcut twiter.json çıktıları beğenildi ama 3 varyant + few-shot prompting'de tutarlılık bozulabilir. v1'de gözlem yapılır, kalite düşerse v2'de Claude Sonnet'a switch. `api-provider-switch` skill'i bunu kolaylaştırır.

4. **n8n local çalıştığında 7/24 makinanın açık kalması gerekir:** RSS toplama cron'u her 30 dakika çalışıyor, MacBook kapalıyken haber gelmez. Geliştirici test sürecinde sorun değil, gerçek kullanım için Hostinger'a taşıma gerekli.

5. **Cloudflare Tunnel güvenlik:** Local n8n'i dış dünyaya açıyor — webhook'lara JWT doğrulama olmasaydı brute force riski olurdu. JWT doğrulama olmazsa olmaz.

6. **PII riski siyasi içerikte düşük ama sıfır değil:** Habere konu olan kişilerin isimleri prompt'a giriyor, Gemini'a gönderiliyor. Bu kişisel veri sayılmaz (kamuya açık haber içeriği) ama yine de banned_words listesinde "rakip aday isimleri" özel olarak yönetilmeli — onlar hakkında tweet üretmemeli.

7. **YSK seçim mevzuatı:** Seçim dönemlerinde özel kurallar var (yasak dönemde tweet, hakaret, dezenformasyon). v1 demo amaçlı olduğu için kritik değil, v2'de "seçim modu" toggle'ı eklenecek.

8. **İçerik sorumluluğu:** Yayınlanan tweet'in sorumluluğu yayınlayan politikacıdadır. Sözleşmede (v2) net olarak belirtilecek: "PoliticAI araç sağlayıcıdır, içerik sorumluluğu kullanıcıya aittir."

---

## Referanslar
- n8n docs: https://docs.n8n.io
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Gemini API: https://ai.google.dev/docs
- X API v2: https://developer.x.com/en/docs/x-api
- Anthropic Claude API (v2 için): https://docs.claude.com
- UI/UX Pro Max skill: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Avukat projesi referans:** Aynı async/realtime mimari pattern'i kullanır. Veri akışı farklı, mimari aynı. Skill yapısı buradan örneklendi.

## Claude Code'a Talimatlar

Bu projede çalışırken:
- **Türkçe yorum yazabilirsin**, kod İngilizce.
- **Mevcut twiter.json'u silme, bozma.** Referans olarak `n8n-workflows/legacy-twiter.json` adıyla sakla. Yeni workflow'lar `politicai-*.json` olarak ayrı dosyalarda olsun.
- **twiter.json'daki prompt çıktıları beğenildi**, mevcut tonu/üslubu yok etmeden generic'leştir. Voice examples olarak persona'ya gömülmeli.
- **İçerik moderasyonu** her tasarım kararında öncelikli, hız ikinci. Siyasi içerikte hata maliyetli.
- Yeni bir adım eklenecekse önce **`draft_jobs.status` enum'ına** ekle, sonra n8n node'una.
- n8n workflow JSON'ları `n8n-workflows/` klasöründe versiyonlanır.
- Skill dosyaları değiştirildiğinde `README.md`'deki tabloyu güncelle.
- **Tam otomatik yayın YOK.** Her tweet insan onayından geçer. Bu kural test/dev/prod hiçbir ortamda esnemez.
- **API anahtarları .env'de**, asla kod içinde değil, asla git'e commit edilmez.
- Free → Paid geçişine hazır kod yaz: `AI_PROVIDER` ve `TWITTER_TIER` env var'larına saygılı.
