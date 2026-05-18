import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Send, Edit2, RefreshCw, X, Check, Loader2,
  AlertTriangle, Inbox, CheckCircle2, XCircle,
} from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { useJobPoller } from '@/lib/hooks/useJobPoller'
import type { DraftStatus } from '@/types'

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID

// ── Types ─────────────────────────────────────────────────────────────────────

interface DraftItem {
  id: string
  content: string
  variant_label: 'sert' | 'uzlasmaci' | 'espriyle'
  status: DraftStatus
  moderation_flags: string[]
  news_id: string | null
  news_title: string | null
  source_name: string | null
  created_at: string
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BADGE: Record<DraftItem['variant_label'], string> = {
  sert:       'border border-red-800/60 bg-red-900/40 text-red-300',
  uzlasmaci:  'border border-green-800/60 bg-green-900/40 text-green-300',
  espriyle:   'border border-amber-800/60 bg-amber-900/40 text-amber-300',
}

const BADGE_LABEL: Record<DraftItem['variant_label'], string> = {
  sert:      'Sert',
  uzlasmaci: 'Uzlaşmacı',
  espriyle:  'Espriyle',
}

const SELECTABLE: DraftStatus[] = ['pending', 'edited']

// ── Sub-components ─────────────────────────────────────────────────────────────

function VariantBadge({ label }: { label: DraftItem['variant_label'] }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${BADGE[label]}`}>
      {BADGE_LABEL[label]}
    </span>
  )
}

function StatusChip({ status }: { status: DraftStatus }) {
  if (status === 'pending') return null
  const map: Partial<Record<DraftStatus, { label: string; cls: string }>> = {
    edited:    { label: 'Düzenlendi', cls: 'text-amber-400' },
    approved:  { label: 'Onaylandı',  cls: 'text-green-400' },
    rejected:  { label: 'Reddedildi', cls: 'text-red-400'   },
  }
  const cfg = map[status]
  if (!cfg) return null
  return <span className={`text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
}

function ModerationWarning({ flags }: { flags: string[] }) {
  if (!flags.length) return null
  return (
    <div className="flex items-start gap-1.5 rounded bg-amber-900/20 px-2 py-1.5">
      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400" />
      <span className="text-xs text-amber-300">{flags.join(' · ')}</span>
    </div>
  )
}

interface DraftCardProps {
  draft: DraftItem
  selected: boolean
  actionLoading: boolean
  editState: { active: boolean; content: string } | undefined
  regeneratingThis: boolean
  onSelect: (id: string) => void
  onAction: (id: string, action: 'approve' | 'reject' | 'edit', content?: string) => void
  onPublish: (id: string) => void
  onRegenerate: (draft: DraftItem) => void
  onEditStart: (id: string, current: string) => void
  onEditChange: (id: string, val: string) => void
  onEditCancel: (id: string) => void
}

function DraftCard({
  draft, selected, actionLoading, editState, regeneratingThis,
  onSelect, onAction, onPublish, onRegenerate,
  onEditStart, onEditChange, onEditCancel,
}: DraftCardProps) {
  const hasMod = draft.moderation_flags.length > 0
  const isSelectable = SELECTABLE.includes(draft.status)
  const isRejected = draft.status === 'rejected'
  const isApproved = draft.status === 'approved'
  const isEditing = editState?.active ?? false
  const charCount = (isEditing ? editState?.content : draft.content)?.length ?? 0

  const borderCls = hasMod
    ? 'border-l-4 border-l-amber-400'
    : draft.status === 'edited'   ? 'border-l-4 border-l-amber-500'
    : draft.status === 'approved' ? 'border-l-4 border-l-green-500'
    : 'border-l border-l-gray-800'

  return (
    <div
      className={`rounded-lg border border-gray-800 bg-gray-900 p-4 transition-opacity ${
        isRejected ? 'opacity-40' : ''
      } ${borderCls}`}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center gap-2">
        {isSelectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(draft.id)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-blue-500"
          />
        ) : (
          <div className="h-4 w-4 shrink-0" />
        )}
        <VariantBadge label={draft.variant_label} />
        <div className="flex-1" />
        <StatusChip status={draft.status} />
        {actionLoading && <Loader2 size={14} className="animate-spin text-gray-500" />}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-3">
          <textarea
            value={editState?.content ?? ''}
            onChange={e => onEditChange(draft.id, e.target.value)}
            maxLength={320}
            rows={4}
            className="w-full resize-none rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-[15px] leading-relaxed text-gray-200 outline-none focus:border-gray-500"
            autoFocus
          />
          <p className={`mt-1 text-right text-xs ${charCount > 280 ? 'text-red-400' : 'text-gray-600'}`}>
            {charCount}/280
          </p>
        </div>
      ) : (
        <p className="mb-3 text-[15px] leading-relaxed text-gray-200">{draft.content}</p>
      )}

      {/* Moderation flags */}
      {hasMod && !isEditing && (
        <div className="mb-3">
          <ModerationWarning flags={draft.moderation_flags} />
        </div>
      )}

      {/* News ref */}
      {draft.news_title && (
        <p className="mb-3 truncate text-xs text-gray-600">
          <span className="text-gray-700">{draft.source_name} · </span>
          {draft.news_title}
        </p>
      )}

      {/* Char count (view mode) */}
      {!isEditing && (
        <p className="mb-3 text-xs text-gray-700">{draft.content.length} karakter</p>
      )}

      {/* Actions */}
      {isEditing ? (
        <div className="flex gap-2">
          <button
            onClick={() => onAction(draft.id, 'edit', editState?.content)}
            disabled={actionLoading || charCount === 0 || charCount > 280}
            className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-100 disabled:opacity-50"
          >
            <Check size={12} /> Kaydet
          </button>
          <button
            onClick={() => onEditCancel(draft.id)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300"
          >
            <X size={12} /> İptal
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!isRejected && !isApproved && (
            <button
              onClick={() => onPublish(draft.id)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <Send size={11} /> Yayınla
            </button>
          )}
          {!isRejected && (
            <button
              onClick={() => onEditStart(draft.id, draft.content)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-md bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            >
              <Edit2 size={11} /> Düzenle
            </button>
          )}
          {!isRejected && draft.news_id && (
            <button
              onClick={() => onRegenerate(draft)}
              disabled={actionLoading || regeneratingThis}
              className="flex items-center gap-1.5 rounded-md bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-50"
            >
              {regeneratingThis
                ? <Loader2 size={11} className="animate-spin" />
                : <RefreshCw size={11} />
              }
              Yeniden Üret
            </button>
          )}
          {!isRejected ? (
            <button
              onClick={() => onAction(draft.id, 'reject')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-500 hover:text-red-400 disabled:opacity-50"
            >
              <XCircle size={11} /> Reddet
            </button>
          ) : (
            <button
              onClick={() => onAction(draft.id, 'approve')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-50"
            >
              <CheckCircle2 size={11} /> Geri Al
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [editStates, setEditStates] = useState<Record<string, { active: boolean; content: string }>>({})
  const [batchLoading, setBatchLoading] = useState(false)
  const [regeneratingDraftId, setRegeneratingDraftId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const poller = useJobPoller()

  // ── Toast helpers ──────────────────────────────────────────────────────────

  function addToast(message: string, type: Toast['type']) {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchDrafts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setFetchErr('')
    try {
      const data = await apiGet<{ drafts: DraftItem[] }>(
        `/webhook/drafts?client_id=${CLIENT_ID}`
      )
      setDrafts(data.drafts ?? [])
    } catch (err) {
      setFetchErr(err instanceof Error ? err.message : 'Taslaklar yüklenemedi.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDrafts()
    intervalRef.current = setInterval(() => fetchDrafts(true), 10_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchDrafts])

  // ── Poller: Yeniden Üret tamamlandı ───────────────────────────────────────

  useEffect(() => {
    if (!poller.polling && poller.status === 'saved') {
      setRegeneratingDraftId(null)
      fetchDrafts(true)
      addToast('Yeniden üretildi — 3 yeni taslak hazır', 'success')
      poller.reset()
    } else if (!poller.polling && poller.status === 'failed') {
      setRegeneratingDraftId(null)
      addToast(poller.error ?? 'Yeniden üretim başarısız', 'error')
      poller.reset()
    }
  }, [poller.polling, poller.status])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection ──────────────────────────────────────────────────────────────

  const selectableDrafts = drafts.filter(d => SELECTABLE.includes(d.status))

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === selectableDrafts.length && selectableDrafts.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableDrafts.map(d => d.id)))
    }
  }

  function clearSelection() { setSelected(new Set()) }

  // ── Single actions ─────────────────────────────────────────────────────────

  async function handleAction(id: string, action: 'approve' | 'reject' | 'edit', content?: string) {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      await apiPost('/webhook/draft/update', { draft_id: id, action, content })
      setDrafts(prev => prev.map(d =>
        d.id !== id ? d : {
          ...d,
          status: action === 'edit' ? 'edited' : action === 'approve' ? 'approved' : 'rejected',
          content: action === 'edit' && content ? content : d.content,
        }
      ))
      if (action === 'edit') {
        setEditStates(prev => ({ ...prev, [id]: { active: false, content: content ?? '' } }))
      }
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'İşlem başarısız', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  async function handlePublish(id: string) {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      await apiPost('/webhook/publish', { draft_id: id })
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'approved' } : d))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
      addToast('Onaylandı — Twitter bağlandığında yayınlanacak', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'İşlem başarısız', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // ── Batch action ───────────────────────────────────────────────────────────

  async function handleBatchPublish() {
    if (selected.size === 0) return
    setBatchLoading(true)
    try {
      const ids = Array.from(selected)
      await apiPost('/webhook/draft/batch', { draft_ids: ids, action: 'approve' })
      setDrafts(prev => prev.map(d => selected.has(d.id) ? { ...d, status: 'approved' } : d))
      addToast(
        `${ids.length} taslak onaylandı — Twitter bağlandığında yayınlanacak`,
        'success'
      )
      clearSelection()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Toplu işlem başarısız', 'error')
    } finally {
      setBatchLoading(false)
    }
  }

  // ── Regenerate ─────────────────────────────────────────────────────────────

  async function handleRegenerate(draft: DraftItem) {
    if (!draft.news_id || !CLIENT_ID) return
    setRegeneratingDraftId(draft.id)
    try {
      const res = await apiPost<{ job_id: string }>('/webhook/generate', {
        news_id: draft.news_id,
        client_id: CLIENT_ID,
      })
      poller.start(res.job_id)
    } catch (err) {
      setRegeneratingDraftId(null)
      addToast(err instanceof Error ? err.message : 'Yeniden üretim başlatılamadı', 'error')
    }
  }

  // ── Edit state helpers ─────────────────────────────────────────────────────

  function editStart(id: string, current: string) {
    setEditStates(prev => ({ ...prev, [id]: { active: true, content: current } }))
  }

  function editChange(id: string, val: string) {
    setEditStates(prev => ({ ...prev, [id]: { ...prev[id], content: val } }))
  }

  function editCancel(id: string) {
    setEditStates(prev => ({ ...prev, [id]: { active: false, content: '' } }))
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const pendingCount = drafts.filter(d => d.status === 'pending' || d.status === 'edited').length
  const allSelected = selectableDrafts.length > 0 && selected.size === selectableDrafts.length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-6 pb-12 pt-0">

      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 -mx-6 flex h-14 items-center gap-3 border-b border-gray-800 bg-gray-950/95 px-6 backdrop-blur">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            disabled={selectableDrafts.length === 0}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 accent-blue-500 disabled:opacity-30"
          />
          <span className="text-sm text-gray-400">
            {selected.size > 0 ? `${selected.size} seçili` : 'Hepsini Seç'}
          </span>
        </label>

        {pendingCount > 0 && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
            {pendingCount} bekliyor
          </span>
        )}

        <div className="flex-1" />

        {selected.size > 0 && (
          <button
            onClick={clearSelection}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Seçimi Temizle
          </button>
        )}

        <button
          onClick={handleBatchPublish}
          disabled={selected.size === 0 || batchLoading}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            selected.size > 0
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'cursor-not-allowed bg-gray-800 text-gray-600'
          }`}
        >
          {batchLoading
            ? <Loader2 size={14} className="animate-spin" />
            : <Send size={14} />
          }
          {selected.size > 0 ? `${selected.size} Tweet'i Yayınla` : 'Yayınla'}
        </button>
      </div>

      {/* Page title row */}
      <div className="flex items-center gap-2 py-5">
        <Inbox size={18} className="text-gray-500" />
        <h1 className="font-semibold text-white">Onay Kuyruğu</h1>
        {!loading && drafts.length > 0 && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
            {drafts.length}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => fetchDrafts()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Regen status */}
      {poller.polling && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-purple-800/50 bg-purple-900/10 px-4 py-3 text-sm text-purple-300">
          <Loader2 size={14} className="animate-spin" />
          Yeniden üretiliyor...
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-gray-600" />
        </div>
      ) : fetchErr ? (
        <div className="rounded-lg border border-red-800/60 bg-red-900/10 px-4 py-3 text-sm text-red-400">
          {fetchErr}
        </div>
      ) : drafts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-gray-600">Kuyruk boş.</p>
          <p className="mt-1 text-xs text-gray-700">
            Haberler sayfasından bir haber seçip "Tweet Üret" butonuna bas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              selected={selected.has(draft.id)}
              actionLoading={!!actionLoading[draft.id]}
              editState={editStates[draft.id]}
              regeneratingThis={regeneratingDraftId === draft.id}
              onSelect={toggleSelect}
              onAction={handleAction}
              onPublish={handlePublish}
              onRegenerate={handleRegenerate}
              onEditStart={editStart}
              onEditChange={editChange}
              onEditCancel={editCancel}
            />
          ))}
        </div>
      )}

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg ${
                t.type === 'success'
                  ? 'bg-gray-800 text-gray-200'
                  : 'bg-red-900/80 text-red-200'
              }`}
            >
              {t.type === 'success'
                ? <CheckCircle2 size={14} className="text-green-400" />
                : <XCircle size={14} className="text-red-400" />
              }
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
