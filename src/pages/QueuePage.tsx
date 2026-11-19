import { useAuth } from '@/contexts/AuthContext'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Search } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { useJobPoller } from '@/lib/hooks/useJobPoller'
import {
  draftStatusLabels,
  errorMessage,
  formatDate,
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
  ToneBadge,
  useNotice,
} from '@/components/ui/Primitives'
import DraftReview from '@/components/ui/DraftReview'
import { useWorkspaceGuard } from '@/contexts/WorkspaceContext'

export default function QueuePage() {
  const CLIENT_ID = useAuth().user?.client_id
  const [params, setParams] = useSearchParams()
  const [drafts, setDrafts] = useState<DraftListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [batchBusy, setBatchBusy] = useState(false)
  const [starting, setStarting] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const generationLock = useRef(false)
  const notice = useNotice()
  const { request } = useWorkspaceGuard()
  const poller = useJobPoller()
  const status = params.get('status') ?? 'all'
  const query = params.get('q') ?? ''
  const filtered = drafts.filter(
    (draft) =>
      (status === 'all' ||
        (status === 'pending'
          ? ['pending', 'edited'].includes(draft.status)
          : draft.status === status)) &&
      (!query ||
        `${draft.content} ${draft.news_title ?? ''}`
          .toLocaleLowerCase('tr')
          .includes(query.toLocaleLowerCase('tr'))),
  )
  const selectable = filtered.filter((draft) =>
    ['pending', 'edited'].includes(draft.status),
  )
  const selectedIds = selectable
    .filter((draft) => selected.has(draft.id))
    .map((draft) => draft.id)
  const current =
    filtered.find((draft) => draft.id === focusedId) ?? filtered[0]
  const allSelected =
    selectable.length > 0 && selectedIds.length === selectable.length
  const busy = starting || poller.polling || batchBusy
  const fetchDrafts = useCallback(async (silent = false) => {
    if (!CLIENT_ID) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    try {
      const data = await apiGet<{ drafts: DraftListItem[] }>(
        `/api/drafts?client_id=${encodeURIComponent(CLIENT_ID)}`,
      )
      setDrafts(data.drafts ?? [])
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Taslaklar yüklenemedi.'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void fetchDrafts()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void fetchDrafts(true)
    }, 10000)
    return () => clearInterval(timer)
  }, [fetchDrafts])
  useEffect(() => {
    if (!regeneratingId || !['saved', 'failed'].includes(poller.status ?? ''))
      return
    generationLock.current = false
    setStarting(false)
    setRegeneratingId(null)
    if (poller.status === 'saved') {
      void fetchDrafts(true)
      notice.notify('Yeni taslaklar hazır. Listeden inceleyebilirsin.')
    }
  }, [poller.status, regeneratingId, fetchDrafts, notice.notify])
  function filter(key: string, value: string) {
    request(() =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (value && value !== 'all') next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      ),
    )
  }
  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  async function update(
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
    setSelected((previous) => {
      const next = new Set(previous)
      next.delete(id)
      return next
    })
    notice.notify(
      action === 'edit'
        ? 'Metin kaydedildi. Son onayını bekliyor.'
        : action === 'approve'
          ? 'Taslak onaylandı. Yayın işlemi yapılmadı.'
          : 'Taslak reddedildi.',
    )
  }
  async function batchApprove() {
    if (!selectedIds.length || busy) return
    setBatchBusy(true)
    setError('')
    const ids = [...selectedIds]
    try {
      await apiPost('/api/draft/batch', {
        draft_ids: ids,
        action: 'approve',
      })
      setDrafts((previous) =>
        previous.map((draft) =>
          ids.includes(draft.id) ? { ...draft, status: 'approved' } : draft,
        ),
      )
      setSelected(new Set())
      notice.notify(`${ids.length} taslak onaylandı. Yayın işlemi yapılmadı.`)
    } catch (err) {
      setError(errorMessage(err, 'Toplu onay tamamlanamadı.'))
    } finally {
      setBatchBusy(false)
    }
  }
  async function regenerate() {
    if (!current?.news_id || !CLIENT_ID || generationLock.current) return
    generationLock.current = true
    setStarting(true)
    setRegeneratingId(current.id)
    poller.reset()
    try {
      const result = await apiPost<{ job_id: string }>('/api/generate', {
        news_id: current.news_id,
        client_id: CLIENT_ID,
      })
      poller.start(result.job_id)
    } catch (err) {
      generationLock.current = false
      setStarting(false)
      setRegeneratingId(null)
      throw err
    }
  }
  async function publish(id: string) {
    const result = await apiPost<{
      twitter_post_id?: string
      post?: { twitter_post_id?: string }
    }>('/api/publish', { draft_id: id })
    await fetchDrafts(true)
    if (result.twitter_post_id || result.post?.twitter_post_id)
      notice.notify('Gönderi X’te yayınlandı.')
    else
      notice.notify(
        'Yayın isteği işlendi. X yayın doğrulaması için geçmiş kaydını kontrol et.',
      )
  }
  return (
    <div>
      <PageHeader
        eyebrow="Onay kuyruğu"
        title="Son cümleye sen karar ver."
        description="Taslakları karşılaştır, metni düzenle ve yayın öncesi onayını ver."
        actions={
          <RefreshButton
            loading={loading || busy}
            onClick={() =>
              request(() => {
                void fetchDrafts()
              })
            }
          />
        }
      />
      <div className="pa-queue-toolbar">
        <label className="pa-check-label">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={!selectable.length || busy}
            onChange={() =>
              setSelected(
                allSelected
                  ? new Set()
                  : new Set(selectable.map((draft) => draft.id)),
              )
            }
          />
          Görünenleri seç
        </label>
        <span className="pa-small">
          {selectedIds.length} seçili / {selectable.length} bekleyen
        </span>
        {selectedIds.length > 0 && (
          <button
            className="pa-text-button"
            onClick={() => setSelected(new Set())}
          >
            Seçimi temizle
          </button>
        )}
        <button
          className="pa-button"
          disabled={!selectedIds.length || busy}
          onClick={() =>
            request(() => {
              void batchApprove()
            })
          }
        >
          <CheckCircle2 size={17} />
          {batchBusy
            ? 'Onaylanıyor…'
            : selectedIds.length
              ? `${selectedIds.length} taslağı onayla`
              : 'Seçilenleri onayla'}
        </button>
      </div>
      <div className="pa-workspace">
        <section className="pa-feed" aria-label="Taslak listesi">
          <div className="pa-section-label">
            <span>İncelenecek metinler</span>
            <span>{filtered.length} taslak</span>
          </div>
          <label className="pa-search">
            <Search size={18} />
            <span className="pa-sr-only">Taslaklarda ara</span>
            <input
              placeholder="Taslaklarda ara…"
              value={query}
              onChange={(event) => filter('q', event.target.value)}
            />
          </label>
          <div className="pa-filters">
            <label>
              Durum
              <select
                value={status}
                onChange={(event) => filter('status', event.target.value)}
              >
                <option value="all">Tüm taslaklar</option>
                <option value="pending">İnceleme bekleyen</option>
                <option value="approved">Onaylanan</option>
                <option value="rejected">Reddedilen</option>
                <option value="published">Yayın kaydı olan</option>
              </select>
            </label>
          </div>
          {!CLIENT_ID ? (
            <Banner kind="warning">
              İletişim hesabı henüz yapılandırılmadı.
            </Banner>
          ) : loading ? (
            <LoadingState label="Taslaklar yükleniyor" />
          ) : (
            <div className="pa-feed-list">
              {filtered.map((draft) => (
                <div
                  className={`pa-queue-row ${current?.id === draft.id ? 'is-selected' : ''}`}
                  key={draft.id}
                >
                  <label>
                    <span className="pa-sr-only">
                      {draft.variant_label
                        ? toneLabels[draft.variant_label]
                        : 'Taslak'}{' '}
                      · {draft.news_title || draft.content.slice(0, 50)}{' '}
                      taslağını toplu onay için seç
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(draft.id)}
                      disabled={
                        !['pending', 'edited'].includes(draft.status) || busy
                      }
                      onChange={() => toggle(draft.id)}
                    />
                  </label>
                  <button
                    aria-pressed={current?.id === draft.id}
                    disabled={busy}
                    onClick={() =>
                      request(() => {
                        setFocusedId(draft.id)
                        requestAnimationFrame(() =>
                          document
                            .getElementById('queue-detail')
                            ?.scrollIntoView({ block: 'start' }),
                        )
                      })
                    }
                  >
                    <ToneBadge tone={draft.variant_label} />
                    <strong>{draft.content}</strong>
                    <span className="pa-small">
                      {draftStatusLabels[draft.status]} ·{' '}
                      {formatDate(draft.created_at)}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
          {!loading && !filtered.length && (
            <EmptyState
              title={drafts.length ? 'Eşleşen taslak yok' : 'Kuyruk şu an boş.'}
              description={
                drafts.length
                  ? 'Aramayı veya durum filtresini değiştir.'
                  : 'Bir haber seçerek ilk taslaklarını hazırlayabilirsin.'
              }
              action={
                <Link className="pa-button pa-secondary" to="/news">
                  Haberleri incele
                </Link>
              }
            />
          )}
        </section>
        <section
          className="pa-work-detail"
          id="queue-detail"
          aria-label="Seçilen taslak"
        >
          {error && (
            <Banner kind="error">
              {error}
              <button className="pa-text-button" onClick={() => fetchDrafts()}>
                Tekrar dene
              </button>
            </Banner>
          )}
          {busy && !batchBusy && (
            <Banner>
              Yeni taslaklar hazırlanıyor. İşlem tamamlanınca liste
              güncellenecek.
            </Banner>
          )}
          {poller.error && (
            <Banner kind={poller.status === 'failed' ? 'error' : 'warning'}>
              {poller.error}
            </Banner>
          )}
          {current ? (
            <>
              <span className="pa-eyebrow">
                {current.source_name || 'Taslak inceleme'}
              </span>
              <h2>{current.news_title || 'Kendi sesinle son dokunuş.'}</h2>
              <DraftReview
                key={current.id}
                draft={current}
                disabled={busy}
                onSave={(id, content) => update(id, 'edit', content)}
                onApprove={(id) => update(id, 'approve')}
                onReject={(id) => update(id, 'reject')}
                onRegenerate={current.news_id ? regenerate : undefined}
                onPublish={publish}
              />
            </>
          ) : loading ? (
            <LoadingState label="İnceleme alanı hazırlanıyor" />
          ) : (
            <EmptyState
              title="Her taslak son bir bakışı hak eder."
              description="İncelemek için listeden bir taslak seç."
            />
          )}
        </section>
      </div>
      <Notice message={notice.notice} onClose={notice.dismiss} />
    </div>
  )
}
