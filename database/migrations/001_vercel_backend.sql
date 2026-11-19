-- Additive migration for an existing PoliticAI Neon database.
-- No existing client/persona/draft/post rows are removed.
ALTER TABLE draft_jobs DROP CONSTRAINT IF EXISTS draft_jobs_status_check;
ALTER TABLE draft_jobs ADD CONSTRAINT draft_jobs_status_check CHECK (status IN (
  'queued','fetching_news','building_prompt','calling_gemini','calling_ai','moderating','saved','failed'
));
ALTER TABLE draft_jobs ADD COLUMN IF NOT EXISTS ai_provider text;
ALTER TABLE draft_jobs ADD COLUMN IF NOT EXISTS ai_model text;
ALTER TABLE draft_jobs ADD COLUMN IF NOT EXISTS input_tokens integer;
ALTER TABLE draft_jobs ADD COLUMN IF NOT EXISTS output_tokens integer;

-- Refuse a lossy deduplication. Existing duplicates require deliberate resolution.
CREATE UNIQUE INDEX IF NOT EXISTS personas_client_id_unique ON personas(client_id);
CREATE INDEX IF NOT EXISTS draft_jobs_client_created_idx ON draft_jobs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS drafts_client_created_idx ON drafts(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS drafts_job_idx ON drafts(job_id);
CREATE INDEX IF NOT EXISTS news_pool_fetched_idx ON news_pool(fetched_at DESC);
CREATE TABLE IF NOT EXISTS app_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS app_rate_limits_reset_idx ON app_rate_limits(reset_at);
