-- PoliticAI v1 — Initial Schema (Neon)
-- 2026-05-14

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
-- clients
-- ==========================================
create table clients (
  id                          uuid primary key default gen_random_uuid(),
  display_name                text not null,
  twitter_handle              text,
  twitter_oauth_token         text,
  twitter_oauth_refresh_token text,
  twitter_token_expires_at    timestamptz,
  twitter_connected           boolean default false,
  status                      text default 'active' check (status in ('active','paused')),
  created_at                  timestamptz default now()
);

-- ==========================================
-- personas
-- ==========================================
create table personas (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid references clients(id) on delete cascade not null,
  identity          text not null,
  ideology          text not null,
  themes            text[] default '{}',
  banned_words      text[] default '{}',
  banned_topics     text[] default '{}',
  address_form      text,
  voice_examples    jsonb default '[]',
  reference_prompt  text,
  max_chars         int default 280,
  daily_tweet_count int default 3,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create trigger set_personas_updated_at
  before update on personas
  for each row execute function handle_updated_at();

-- ==========================================
-- news_pool
-- ==========================================
create table news_pool (
  id              uuid primary key default gen_random_uuid(),
  source_name     text not null,
  title           text not null,
  description     text,
  link            text unique,
  published_at    timestamptz,
  fetched_at      timestamptz default now(),
  processed       boolean default false,
  relevance_score float
);

-- ==========================================
-- draft_jobs
-- ==========================================
create table draft_jobs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) not null,
  news_id       uuid references news_pool(id),
  status        text not null check (status in (
                  'queued','fetching_news','building_prompt',
                  'calling_gemini','moderating','saved','failed'
                )),
  error_message text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger set_draft_jobs_updated_at
  before update on draft_jobs
  for each row execute function handle_updated_at();

-- ==========================================
-- drafts
-- ==========================================
create table drafts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references clients(id) on delete cascade not null,
  news_id          uuid references news_pool(id) on delete set null,
  job_id           uuid references draft_jobs(id) on delete set null,
  content          text not null,
  variant_label    text check (variant_label in ('sert','uzlasmaci','espriyle')),
  status           text default 'pending' check (status in (
                     'pending','approved','rejected','edited','published'
                   )),
  moderation_flags text[] default '{}',
  created_at       timestamptz default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid
);

-- ==========================================
-- posts
-- ==========================================
create table posts (
  id                uuid primary key default gen_random_uuid(),
  draft_id          uuid references drafts(id),
  client_id         uuid references clients(id) on delete cascade not null,
  content           text not null,
  twitter_post_id   text,
  status            text default 'publishing' check (status in (
                      'publishing','published','failed'
                    )),
  error_message     text,
  published_at      timestamptz,
  likes             int default 0,
  retweets          int default 0,
  replies           int default 0,
  last_metrics_sync timestamptz
);

-- ==========================================
-- audit_log
-- ==========================================
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  action        text not null,
  resource_type text,
  resource_id   uuid,
  details       jsonb,
  created_at    timestamptz default now()
);