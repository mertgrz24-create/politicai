import { useState, useEffect } from 'react'
import { RefreshCw, Loader2, Zap, AlertCircle, CheckCircle2, Newspaper, ExternalLink } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { useJobPoller } from '@/lib/hooks/useJobPoller'
import type { NewsItem, DraftJobStatus } from '@/types'

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID

const STATUS_LABELS: Record<DraftJobStatus, string> = {
  queued:          'Sıraya alındı...',
  fetching_news:   'Haber alınıyor...',
  building_prompt: 'Prompt hazırlanıyor...',
  calling_gemini:  'Gemini çağrılıyor...',
  moderating:      'Moderasyon...',
  saved:           '3 taslak hazır',
  failed:          'Hata oluştu',
}

const STATUS_COLOR: Record<DraftJobStatus, string> = {
  queued:          'text-gray-400',
  fetching_news:   'text-blue-400',
  building_prompt: 'text-blue-400',
  calling_gemini:  'text-purple-400',
  moderating:      'text-amber-400',
  saved:           'text-green-400',
  failed:          'text-red-400',
}

function NewsCard({
  item,
  onGenerate,
  activeJobNewsId,
}: {
  item: NewsItem
  onGenerate: (newsId: string) => void
  activeJobNewsId: string | null
}) {
  const isActive = activeJobNewsId === item.id

  const pub = item.published_at
    ? new Date(item.published_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isActive
          ? 'border-purple-700/60 bg-purple-900/10'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
              {item.source_name}
            </span>
            {pub && <span className="text-xs text-gray-600">{pub}</span>}
          </div>
          <p className="text-sm font-medium leading-snug text-gray-200">{item.title}</p>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.description}</p>
          )}
        </div>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 shrink-0 text-gray-600 hover:text-gray-400"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      <button
        onClick={() => onGenerate(item.id)}
        disabled={!!activeJobNewsId}
        className="flex items-center gap-1.5 rounded-md bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Zap size={12} />
        Tweet Üret
      </button>
    </div>
  )
}

function JobStatusBanner({
  status,
  error,
  draftCount,
  polling,
}: {
  status: DraftJobStatus | null
  error: string | null
  draftCount: number
  polling: boolean
}) {
  if (!status) return null

  return (
    <div
      className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
        status === 'saved'
          ? 'border-green-800/60 bg-green-900/10'
          : status === 'failed'
          ? 'border-red-800/60 bg-red-900/10'
          : 'border-gray-700 bg-gray-900'
      }`}
    >
      {status === 'saved' ? (
        <CheckCircle2 size={15} className="shrink-0 text-green-400" />
      ) : status === 'failed' ? (
        <AlertCircle size={15} className="shrink-0 text-red-400" />
      ) : (
        <Loader2 size={15} className="shrink-0 animate-spin text-gray-400" />
      )}

      <div className="flex-1">
        <span className={STATUS_COLOR[status] ?? 'text-gray-300'}>
          {STATUS_LABELS[status] ?? status}
        </span>
        {status === 'saved' && draftCount > 0 && (
          <span className="ml-2 text-gray-500">— {draftCount} taslak oluşturuldu</span>
        )}
        {error && <p className="mt-0.5 text-xs text-red-400">{error}</p>}
      </div>

      {polling && (
        <span className="text-xs text-gray-600">2s polling</span>
      )}
    </div>
  )
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [activeNewsId, setActiveNewsId] = useState<string | null>(null)

  const poller = useJobPoller()

  async function fetchNews() {
    setLoading(true)
    setFetchError('')
    try {
      const data = await apiGet<{ news: NewsItem[] }>('/webhook/news-list')
      setNews(data.news ?? [])
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Haberler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  async function handleGenerate(newsId: string) {
    if (!CLIENT_ID) {
      alert('VITE_CLIENT_ID .env dosyasında tanımlı değil.')
      return
    }
    poller.reset()
    setActiveNewsId(newsId)
    try {
      const res = await apiPost<{ job_id: string; status: string }>(
        '/webhook/generate',
        { news_id: newsId, client_id: CLIENT_ID }
      )
      poller.start(res.job_id)
    } catch (err) {
      setActiveNewsId(null)
      alert(err instanceof Error ? err.message : 'Üretim başlatılamadı.')
    }
  }

  // Polling bitti → activeNewsId serbest bırak
  useEffect(() => {
    if (!poller.polling && (poller.status === 'saved' || poller.status === 'failed')) {
      setActiveNewsId(null)
    }
  }, [poller.polling, poller.status])

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper size={18} className="text-gray-500" />
          <h1 className="font-semibold text-white">Haberler</h1>
          {!loading && (
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
              {news.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200 disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      <JobStatusBanner
        status={poller.status}
        error={poller.error}
        draftCount={poller.drafts.length}
        polling={poller.polling}
      />

      {!CLIENT_ID && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-800/60 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>VITE_CLIENT_ID</strong> .env dosyasında tanımlı değil — üretim çalışmaz.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-600" />
        </div>
      ) : fetchError ? (
        <div className="rounded-lg border border-red-800/60 bg-red-900/10 px-4 py-3 text-sm text-red-400">
          {fetchError}
        </div>
      ) : news.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-600">Henüz haber yok.</p>
          <p className="mt-1 text-xs text-gray-700">
            n8n'de <code className="rounded bg-gray-800 px-1 py-0.5">politicai-news-fetch</code> workflow'unu aktif et.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map(item => (
            <NewsCard
              key={item.id}
              item={item}
              onGenerate={handleGenerate}
              activeJobNewsId={activeNewsId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
