-- PoliticAI v1 — Initial Schema
-- 2026-05-13

-- pgcrypto: Twitter OAuth token'larını şifrelemek için
create extension if not exists pgcrypto;

-- updated_at sütununu otomatik güncelleyen tetikleyici fonksiyonu
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ==========================================
-- clients: Politikacı/Aday Profili (v1: tek kayıt)
-- ==========================================
create table clients (
  id                          uuid primary key default gen_random_uuid(),
  display_name                text not null,
  twitter_handle              text,
  twitter_oauth_token         text,           -- pgcrypto ile şifrelenmiş
  twitter_oauth_refresh_token text,           -- pgcrypto ile şifrelenmiş
  twitter_token_expires_at    timestamptz,
  twitter_connected           boolean default false,
  status                      text default 'active' check (status in ('active', 'paused')),
  created_at                  timestamptz default now()
);

alter table clients enable row level security;
create policy "authenticated users full access" on clients
  for all using (auth.uid() is not null);

-- ==========================================
-- personas: Stil ve Kimlik Profili
-- ==========================================
create table personas (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid references clients(id) on delete cascade not null,
  identity            text not null,
  ideology            text not null,
  themes              text[] default '{}',
  banned_words        text[] default '{}',
  banned_topics       text[] default '{}',
  address_form        text,
  voice_examples      jsonb default '[]',     -- twiter.json'daki ton + beğenilen tweet örnekleri
  reference_prompt    text,                   -- twiter.json'daki orijinal prompt (referans, değiştirilmez)
  max_chars           int default 280,
  daily_tweet_count   int default 3,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table personas enable row level security;
create policy "authenticated users full access" on personas
  for all using (auth.uid() is not null);

create trigger set_personas_updated_at
  before update on personas
  for each row execute function handle_updated_at();

-- ==========================================
-- news_pool: RSS'ten Toplanan Haberler
-- ==========================================
create table news_pool (
  id              uuid primary key default gen_random_uuid(),
  source_name     text not null,              -- "TRT Haber", "A Haber", "Yeni Şafak"
  title           text not null,
  description     text,
  link            text unique,                -- duplicate engelleme
  published_at    timestamptz,
  fetched_at      timestamptz default now(),
  processed       boolean default false,
  relevance_score float
);

alter table news_pool enable row level security;
create policy "authenticated users full access" on news_pool
  for all using (auth.uid() is not null);

-- ==========================================
-- draft_jobs: İçerik Üretim İş Takibi (async pattern)
-- ==========================================
create table draft_jobs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) not null,
  news_id       uuid references news_pool(id),
  status        text not null check (status in (
                  'queued',
                  'fetching_news',
                  'building_prompt',
                  'calling_gemini',
                  'moderating',
                  'saved',
                  'failed'
                )),
  error_message text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table draft_jobs enable row level security;
-- Frontend sadece okur; n8n service_role ile insert/update yapar (RLS bypass)
create policy "authenticated users read access" on draft_jobs
  for select using (auth.uid() is not null);

create trigger set_draft_jobs_updated_at
  before update on draft_jobs
  for each row execute function handle_updated_at();

-- ==========================================
-- drafts: Onay Bekleyen Tweet Varyantları
-- ==========================================
create table drafts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references clients(id) on delete cascade not null,
  news_id          uuid references news_pool(id) on delete set null,
  job_id           uuid references draft_jobs(id) on delete set null,
  content          text not null,
  variant_label    text check (variant_label in ('sert', 'uzlasmaci', 'espriyle')),
  status           text default 'pending' check (status in (
                     'pending', 'approved', 'rejected', 'edited', 'published'
                   )),
  moderation_flags text[] default '{}',
  created_at       timestamptz default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid
);

alter table drafts enable row level security;
create policy "authenticated users full access" on drafts
  for all using (auth.uid() is not null);

-- ==========================================
-- posts: Yayınlanmış Tweet'ler
-- ==========================================
create table posts (
  id                  uuid primary key default gen_random_uuid(),
  draft_id            uuid references drafts(id),
  client_id           uuid references clients(id) on delete cascade not null,
  content             text not null,
  twitter_post_id     text,
  status              text default 'publishing' check (status in ('publishing', 'published', 'failed')),
  error_message       text,
  published_at        timestamptz,
  -- Twitter Free tier metrik okumayı desteklemiyor; v2'de Basic planla dolacak
  likes               int default 0,
  retweets            int default 0,
  replies             int default 0,
  last_metrics_sync   timestamptz
);

alter table posts enable row level security;
create policy "authenticated users full access" on posts
  for all using (auth.uid() is not null);

-- ==========================================
-- audit_log: Onay/Red Kayıtları (Hukuki Sorumluluk)
-- ==========================================
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id),
  action        text not null,               -- 'approve','reject','edit','publish','batch_publish'
  resource_type text,                        -- 'draft', 'post'
  resource_id   uuid,
  details       jsonb,
  created_at    timestamptz default now()
);

alter table audit_log enable row level security;
-- Insert: her aksiyon kayıt altına alınır
create policy "authenticated users insert" on audit_log
  for insert with check (auth.uid() is not null);
-- Select: geçmiş okunabilir
create policy "authenticated users select" on audit_log
  for select using (auth.uid() is not null);

-- ==========================================
-- Realtime: Onay kuyruğu ve job takibi için yayın ekle
-- ==========================================
alter publication supabase_realtime add table drafts;
alter publication supabase_realtime add table draft_jobs;
alter publication supabase_realtime add table posts;
