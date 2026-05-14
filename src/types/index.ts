export interface Client {
  id: string
  display_name: string
  twitter_handle: string | null
  twitter_oauth_token: string | null
  twitter_oauth_refresh_token: string | null
  twitter_token_expires_at: string | null
  twitter_connected: boolean
  status: 'active' | 'paused'
  created_at: string
}

export interface VoiceExample {
  tone: 'sert' | 'uzlasmaci' | 'espriyle'
  example: string
}

export interface Persona {
  id: string
  client_id: string
  identity: string
  ideology: string
  themes: string[]
  banned_words: string[]
  banned_topics: string[]
  address_form: string | null
  voice_examples: VoiceExample[]
  reference_prompt: string | null
  max_chars: number
  daily_tweet_count: number
  created_at: string
  updated_at: string
}

export interface NewsItem {
  id: string
  source_name: string
  title: string
  description: string | null
  link: string | null
  published_at: string | null
  fetched_at: string
  processed: boolean
  relevance_score: number | null
}

export type DraftJobStatus =
  | 'queued'
  | 'fetching_news'
  | 'building_prompt'
  | 'calling_gemini'
  | 'moderating'
  | 'saved'
  | 'failed'

export interface DraftJob {
  id: string
  client_id: string
  news_id: string | null
  status: DraftJobStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export type DraftVariant = 'sert' | 'uzlasmaci' | 'espriyle'
export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'edited' | 'published'

export interface Draft {
  id: string
  client_id: string
  news_id: string | null
  job_id: string | null
  content: string
  variant_label: DraftVariant | null
  status: DraftStatus
  moderation_flags: string[]
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export type PostStatus = 'publishing' | 'published' | 'failed'

export interface Post {
  id: string
  draft_id: string | null
  client_id: string
  content: string
  twitter_post_id: string | null
  status: PostStatus
  error_message: string | null
  published_at: string | null
  likes: number
  retweets: number
  replies: number
  last_metrics_sync: string | null
}

export interface AuditEntry {
  id: string
  user_id: string | null
  action: 'approve' | 'reject' | 'edit' | 'publish' | 'batch_publish'
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}
