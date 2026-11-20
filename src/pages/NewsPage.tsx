import { useAuth } from '@/contexts/AuthContext'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { safeHttpUrl } from '@/lib/safeUrl'
import { useJobPoller } from '@/lib/hooks/useJobPoller'
import {
  errorMessage,
  formatDate,
  todayLabel,
  toneLabels,
  type DraftListItem,
} from '@/lib/presentation'
import {
  Banner,
  EmptyState,
  LoadingState,
  Notice,
  PageHeader,
  RefreshButton,
  useNotice,
} from '@/components/ui/Primitives'
import DraftReview from '@/components/ui/DraftReview'
import { useWorkspaceGuard } from '@/contexts/WorkspaceContext'
import type { NewsItem, DraftJobStatus } from '@/types'

const statusLabels: Record<DraftJobStatus, string> = {
  queued: 'Üretim sıraya alındı',
  fetching_news: 'Haber hazırlanıyor',
  building_prompt: 'İletişim profili uygulanıyor',
  calling_gemini: 'Taslaklar yazılıyor',
  calling_ai: 'Taslaklar yazılıyor',
  moderating: 'İçerik kontrol ediliyor',
  saved: 'Taslaklar hazır',
  failed: 'Üretim tamamlanamadı',
}
const steps: DraftJobStatus[] = [
  'queued',
  'fetching_news',
  'building_prompt',
  'calling_ai',
  'moderating',
  'saved',
]
export default function NewsPage() {
  const CLIENT_ID = useAuth().user?.client_id
  const [params, setParams] = useSearchParams()
  const [news, setNews] = useState<NewsItem[]>([])
  const [drafts, setDrafts] = useState<DraftListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState(false)
  const [error, setError] = useState('')
  const [draftError, setDraftError] = useState('')
  const [actionError, setActionError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null)
  const generating = useRef(false)
  const poller = useJobPoller()
  const { request } = useWorkspaceGuard()
  const notice = useNotice()
  const query = params.get('q') ?? ''
  const source = params.get('source') ?? 'all'
  const processed = params.get('processed') ?? 'all'
  const period = params.get('period') ?? 'all'
  const selected =
    news.find((item) => item.id === params.get('news_id')) ?? news[0]
  const filtered = news.filter(
    (item) =>
      (!query ||
        `${item.title} ${item.description ?? ''}`
          .toLocaleLowerCase('tr')
          .includes(query.toLocaleLowerCase('tr'))) &&
      (source === 'all' || item.source_name === source) &&
      (processed === 'all' || item.processed === (processed === 'yes')) &&
      (period !== 'day' ||
        (Date.now() - new Date(item.fetched_at).getTime() >= 0 &&
          Date.now() - new Date(item.fetched_at).getTime() < 86400000)),
  )
  const related = selected
    ? drafts.filter((draft) => draft.news_id === selected.id)
    : []
  const current =
    related.find((draft) => draft.id === selectedDraft) ?? related[0]
  const busy = starting || poller.polling
  const draftGroup = current?.job_id
    ? related.filter((draft) => draft.job_id === current.job_id)
    : []
  const sourceUrl = safeHttpUrl(selected?.link)
  function param(key: string, value: string) {
    request(() =>
      setParams(
        (currentParams) => {
          const next = new URLSearchParams(currentParams)
          if (value && value !== 'all') next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      ),
    )
  }
  const fetchDrafts = useCallback(async () => {
    if (!CLIENT_ID) return
    try {
      const data = await apiGet<{ drafts: DraftListItem[] }>(
        `/api/drafts?client_id=${encodeURIComponent(CLIENT_ID)}`,
      )
      setDrafts(data.drafts ?? [])
      setDraftError('')
    } catch (err) {
      setDraftError(errorMessage(err, 'Mevcut taslaklar yüklenemedi.'))
    }
  }, [])
  const loadNews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiGet<{ news: NewsItem[] }>('/api/news-list')
      setNews(data.news ?? [])
    } catch (err) {
      setError(errorMessage(err, 'Haberler yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }, [])
  async function refreshSources() {
    if (collecting) return
    setCollecting(true)
    setActionError('')
    try {
      const result = await apiPost<{ added: number; warnings: string[] }>('/api/news/refresh', {})
      await loadNews()
      notice.notify(`${result.added} yeni haber eklendi.${result.warnings.length ? ` ${result.warnings.join(' ')}` : ''}`)
    } catch (err) {
      setActionError(errorMessage(err, 'Haber kaynakları güncellenemedi.'))
    } finally { setCollecting(false) }
  }
  useEffect(() => {
    void loadNews()
    void fetchDrafts()
  }, [loadNews, fetchDrafts])
  useEffect(() => {
    if (poller.status !== 'saved' && poller.status !== 'failed') return
    generating.current = false
    setStarting(false)
    if (poller.status === 'saved') {
      const fresh = poller.drafts.map((draft) => ({
        ...draft,
        job_id: draft.job_id ?? poller.jobId,
      }))
      setDrafts((previous) => [
        ...fresh,
        ...previous.filter(
          (draft) => !fresh.some((item) => item.id === draft.id),
        ),
      ])
      setSelectedDraft(fresh[0]?.id ?? null)
      setNews((previous) =>
        previous.map((item) =>
          item.id === activeId ? { ...item, processed: true } : item,
        ),
      )
    }
  }, [poller.status, poller.drafts, poller.jobId, activeId])
  async function generate() {
    if (!selected || !CLIENT_ID || generating.current) return
    generating.current = true
    setStarting(true)
    setActionError('')
    setActiveId(selected.id)
    poller.reset()
    try {
      const result = await apiPost<{ job_id: string }>('/api/generate', {
        news_id: selected.id,
        client_id: CLIENT_ID,
      })
      poller.start(result.job_id)
    } catch (err) {
      generating.current = false
      setStarting(false)
      setActionError(errorMessage(err, 'Üretim başlatılamadı.'))
    }
  }
  async function updateDraft(
    id: string,
    action: 'approve' | 'reject' | 'edit',
    content?: string,
  ) {
    await apiPost('/api/draft/update', {
      draft_id: id,
      action,
      ...(content !== undefined ? { content } : {}),
    })
    setDrafts((previous) =>
      previous.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              content: content ?? draft.content,
              status:
                action === 'edit'
                  ? 'edited'
                  : action === 'approve'
                    ? 'approved'
                    : 'rejected',
            }
          : draft,
      ),
    )
    notice.notify(
      action === 'edit'
        ? 'Metin kaydedildi. Son onayını bekliyor.'
        : action === 'approve'
          ? 'Taslak onaylandı. Yayın işlemi yapılmadı.'
          : 'Taslak reddedildi.',
    )
  }
  function chooseDraft(id: string) {
    request(() => setSelectedDraft(id))
  }
  function selectNews(id: string) {
    request(() => {
      setSelectedDraft(null)
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.set('news_id', id)
          return next
        },
        { replace: true },
      )
      requestAnimationFrame(() =>
        document
          .getElementById('news-detail')
          ?.scrollIntoView({ block: 'start' }),
      )
    })
  }
  return (
    <div>
      <PageHeader
        eyebrow={todayLabel()}
        title="Gündemden, senin sesine."
        description="Haberi incele, üslubunu seç ve söylemek istediğini netleştir."
        actions={
          <>
          <button className="pa-button pa-secondary" disabled={collecting || busy || loading}
            onClick={() => request(() => { void refreshSources() })}>
            {collecting ? 'Kaynaklar taranıyor…' : 'Yeni haberleri getir'}
          </button>
          <RefreshButton
            loading={loading || busy}
            onClick={() =>
              request(() => {
                void loadNews()
                void fetchDrafts()
              })
            }
          />
          </>
        }
      />
      {actionError && <Banner kind="error">{actionError}</Banner>}
      <div className="pa-workspace">
        <section className="pa-feed" aria-label="Haber akışı">
          <div className="pa-section-label">
            <span>Haber akışı</span>
            <span>{filtered.length} haber</span>
          </div>
          <label className="pa-search">
            <Search size={18} />
            <span className="pa-sr-only">Haberlerde ara</span>
            <input
              value={query}
              onChange={(event) => param('q', event.target.value)}
              placeholder="Haberlerde ara…"
            />
          </label>
          <button
            className="pa-text-button pa-filter-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={16} />
            Filtreler
            <ChevronDown size={15} />
          </button>
          {filtersOpen && (
            <div className="pa-filters">
              <label>
                Kaynak
                <select
                  value={source}
                  onChange={(event) => param('source', event.target.value)}
                >
                  <option value="all">Tüm kaynaklar</option>
                  {[...new Set(news.map((item) => item.source_name))].map(
                    (name) => (
                      <option key={name}>{name}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Tarih
                <select
                  value={period}
                  onChange={(event) => param('period', event.target.value)}
                >
                  <option value="all">Tüm tarihler</option>
                  <option value="day">Son 24 saat</option>
                </select>
              </label>
              <label>
                Durum
                <select
                  value={processed}
                  onChange={(event) => param('processed', event.target.value)}
                >
                  <option value="all">Tüm haberler</option>
                  <option value="no">İşlenmemiş</option>
                  <option value="yes">Taslak üretildi</option>
                </select>
              </label>
            </div>
          )}
          {(query ||
            source !== 'all' ||
            period !== 'all' ||
            processed !== 'all') && (
            <button
              className="pa-text-button"
              onClick={() =>
                request(() =>
                  setParams(
                    (previous) => {
                      const next = new URLSearchParams(previous)
                      ;['q', 'source', 'period', 'processed'].forEach((key) =>
                        next.delete(key),
                      )
                      return next
                    },
                    { replace: true },
                  ),
                )
              }
            >
              Filtreleri temizle
            </button>
          )}
          {loading ? (
            <LoadingState label="Haberler yükleniyor" />
          ) : error ? (
            <Banner kind="error">
              {error}
              <button className="pa-text-button" onClick={loadNews}>
                Tekrar dene
              </button>
            </Banner>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Haber bulunamadı"
              description={
                news.length
                  ? 'Başka bir kelimeyle ara veya filtreleri temizle.'
                  : 'Yeni haberler geldiğinde burada listelenecek.'
              }
            />
          ) : (
            <div className="pa-feed-list">
              {filtered.map((item) => {
                const itemUrl = safeHttpUrl(item.link)
                return (
                <div className="pa-news-item" key={item.id}>
                <button
                  className={`pa-news-row ${selected?.id === item.id ? 'is-selected' : ''}`}
                  aria-pressed={selected?.id === item.id}
                  disabled={busy}
                  onClick={() => selectNews(item.id)}
                >
                  <span className="pa-news-meta">
                    <span>{item.source_name}</span>
                    <span>{formatDate(item.published_at)}</span>
                  </span>
                  <strong>{item.title}</strong>
                  <span className="pa-news-description">
                    {item.description}
                  </span>
                  <span className="pa-news-bottom">
                    {item.processed ? (
                      <Check size={13} />
                    ) : (
                      <span className="pa-dot" />
                    )}
                    {item.processed ? 'Taslak üretildi' : 'Yeni haber'}
                  </span>
                </button>
                {itemUrl && (
                  <a
                    className="pa-news-link"
                    href={itemUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Kaynağı aç: ${item.title}`}
                  >
                    Kaynak <ExternalLink size={12} />
                  </a>
                )}
                </div>
                )
              })}
            </div>
          )}
          <p className="pa-small pa-feed-note">
            Arama ve filtreler yüklenen haberler üzerinde çalışır.
          </p>
        </section>
        <section
          className="pa-work-detail"
          id="news-detail"
          aria-label="Haber ve taslak inceleme"
        >
          {selected ? (
            <>
              <span className="pa-eyebrow">
                {selected.source_name} / {formatDate(selected.published_at)}
              </span>
              <h2>{selected.title}</h2>
              <div className="pa-source">
                <p>
                  {selected.description ||
                    'Bu haber için özet bulunmuyor. Kaynağı açarak içeriği inceleyebilirsin.'}
                </p>
                {sourceUrl && (
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    Kaynak haberi aç <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {!CLIENT_ID && (
                <Banner kind="warning">
                  İletişim hesabı henüz yapılandırılmadı. Taslak üretmek için
                  hesap ayarlarının tamamlanması gerekiyor.
                </Banner>
              )}
              <div className="pa-generation-head">
                <div>
                  <h3>Bir haber, üç farklı anlatım.</h3>
                  <p>Üslubu karşılaştır, kendi cümleni bul.</p>
                </div>
                <button
                  className="pa-button pa-secondary"
                  disabled={busy || !CLIENT_ID}
                  onClick={() =>
                    request(() => {
                      void generate()
                    })
                  }
                >
                  <Sparkles size={16} />
                  {busy
                    ? 'Üretiliyor…'
                    : related.length
                      ? 'Yeniden üret'
                      : 'Taslak üret'}
                </button>
              </div>
              {busy && (
                <div className="pa-progress" role="status">
                  <span>
                    {poller.status
                      ? statusLabels[poller.status]
                      : 'Üretim başlatılıyor'}
                  </span>
                  <progress
                    max={6}
                    value={Math.max(
                      1,
                      steps.indexOf(poller.status ?? 'queued') + 1,
                    )}
                  />
                </div>
              )}
              {poller.error && (
                <Banner kind={poller.status === 'failed' ? 'error' : 'warning'}>
                  {poller.error}
                </Banner>
              )}
              {draftError && (
                <Banner kind="warning">
                  {draftError}
                  <button className="pa-text-button" onClick={fetchDrafts}>
                    Taslakları yeniden yükle
                  </button>
                </Banner>
              )}
              {current ? (
                <>
                  {related.length > 1 && (
                    <label className="pa-field">
                      İncelenen taslak
                      <select
                        value={current.id}
                        onChange={(event) => chooseDraft(event.target.value)}
                      >
                        {related.map((draft) => (
                          <option key={draft.id} value={draft.id}>
                            {draft.variant_label
                              ? toneLabels[draft.variant_label]
                              : 'Taslak'}{' '}
                            · {formatDate(draft.created_at)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {draftGroup.length > 1 && (
                    <div
                      className="pa-tabs"
                      role="tablist"
                      aria-label="Aynı üretimin taslakları"
                    >
                      {draftGroup.map((draft, index) => (
                        <button
                          key={draft.id}
                          id={`tone-${draft.id}`}
                          role="tab"
                          aria-selected={draft.id === current.id}
                          aria-controls="tone-panel"
                          tabIndex={draft.id === current.id ? 0 : -1}
                          onKeyDown={(event) => {
                            if (
                              ![
                                'ArrowLeft',
                                'ArrowRight',
                                'Home',
                                'End',
                              ].includes(event.key)
                            )
                              return
                            event.preventDefault()
                            const next =
                              event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? draftGroup.length - 1
                                  : (index +
                                      (event.key === 'ArrowRight'
                                        ? 1
                                        : draftGroup.length - 1)) %
                                    draftGroup.length
                            request(() => {
                              setSelectedDraft(draftGroup[next].id)
                              requestAnimationFrame(() =>
                                document
                                  .getElementById(`tone-${draftGroup[next].id}`)
                                  ?.focus(),
                              )
                            })
                          }}
                          onClick={() =>
                            request(() => setSelectedDraft(draft.id))
                          }
                        >
                          {draft.variant_label
                            ? toneLabels[draft.variant_label]
                            : 'Taslak'}
                        </button>
                      ))}
                    </div>
                  )}
                  <div
                    id="tone-panel"
                    role={draftGroup.length > 1 ? 'tabpanel' : undefined}
                    aria-labelledby={
                      draftGroup.length > 1 ? `tone-${current.id}` : undefined
                    }
                  >
                    <DraftReview
                      key={current.id}
                      draft={current}
                      disabled={busy}
                      onSave={(id, content) => updateDraft(id, 'edit', content)}
                      onApprove={(id) => updateDraft(id, 'approve')}
                      onReject={(id) => updateDraft(id, 'reject')}
                    />
                  </div>
                  <Link className="pa-text-button" to="/queue">
                    Tüm taslakları onay kuyruğunda gör
                  </Link>
                </>
              ) : (
                <EmptyState
                  title="İlk cümleye buradan başla."
                  description="Bu haber için taslak üret. Hazır olduğunda farklı üslupları burada inceleyebilirsin."
                />
              )}
            </>
          ) : loading ? (
            <LoadingState label="Çalışma alanı hazırlanıyor" />
          ) : (
            <EmptyState
              title="Her iyi metin, bir haberle başlar."
              description="İncelemek için haber akışından bir kaynak seç."
            />
          )}
        </section>
      </div>
      <Notice message={notice.notice} onClose={notice.dismiss} />
    </div>
  )
}
