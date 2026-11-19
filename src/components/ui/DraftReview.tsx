import { useState } from 'react'
import { Check, Pencil, RefreshCw, Send, X, Inbox } from 'lucide-react'
import { Banner, ToneBadge } from './Primitives'
import { useUnsavedChanges, useWorkspaceGuard } from '@/contexts/WorkspaceContext'
import {
  charCount,
  draftStatusLabels,
  errorMessage,
  X_PUBLISH_ENABLED,
  type DraftListItem,
} from '@/lib/presentation'

export interface ReviewActions {
  onSave: (id: string, content: string) => Promise<void>
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onRegenerate?: () => Promise<void>
  onPublish?: (id: string) => Promise<void>
}
export default function DraftReview({
  draft,
  onSave,
  onApprove,
  onReject,
  onRegenerate,
  onPublish,
  disabled = false,
}: ReviewActions & { draft: DraftListItem; disabled?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(draft.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { request } = useWorkspaceGuard()
  const dirty = editing && content !== draft.content
  useUnsavedChanges(dirty, () => {
    setEditing(false)
    setContent(draft.content)
  })
  const unavailable = busy || disabled
  const published = draft.status === 'published'
  const rejected = draft.status === 'rejected'
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err, 'İşlem tamamlanamadı. Tekrar dene.'))
    } finally {
      setBusy(false)
    }
  }
  function cancel() {
    request(() => {
      setEditing(false)
      setContent(draft.content)
    })
  }
  return (
    <article className="pa-review-card" aria-label="Taslak inceleme">
      <div className="pa-draft-meta">
        <ToneBadge tone={draft.variant_label} />
        <span className={`pa-status pa-status-${draft.status}`}>
          {draftStatusLabels[draft.status]}
        </span>
      </div>
      {editing ? (
        <div className="pa-editor">
          <div className="pa-section-label">
            <span>Metin atölyesi</span>
            <button
              className="pa-icon-button"
              disabled={busy}
              aria-label="Düzenlemeyi kapat"
              onClick={cancel}
            >
              <X size={18} />
            </button>
          </div>
          <label htmlFor={`draft-${draft.id}`}>Taslak metni</label>
          <textarea
            id={`draft-${draft.id}`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={6}
            autoFocus
            disabled={busy}
            aria-invalid={!content.trim() || charCount(content) > 280}
            aria-describedby={`count-${draft.id}`}
          />
          <p
            className={`pa-char-count ${charCount(content) > 280 ? 'pa-invalid' : ''}`}
            id={`count-${draft.id}`}
          >
            {charCount(content)} / 280 karakter
            {!content.trim() && ' · Metin boş bırakılamaz'}
          </p>
          <div className="pa-post-preview">
            <span className="pa-avatar">P</span>
            <div>
              <strong>Gönderi önizlemesi</strong>
              <p>{content || 'Metnin burada görünecek.'}</p>
            </div>
          </div>
          <div className="pa-actions">
            <button
              className="pa-button pa-secondary"
              disabled={busy}
              onClick={cancel}
            >
              Vazgeç
            </button>
            <button
              className="pa-button"
              disabled={
                unavailable || !content.trim() || charCount(content) > 280
              }
              onClick={() =>
                run(async () => {
                  await onSave(draft.id, content.trim())
                  setEditing(false)
                })
              }
            >
              <Check size={16} />
              {busy ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="pa-tweet">{draft.content}</p>
          <div className="pa-draft-foot">
            <span className="pa-small">
              {charCount(draft.content)} / 280 karakter
            </span>
            {!published && !rejected && (
              <button
                className="pa-text-button"
                disabled={unavailable}
                onClick={() => {
                  setContent(draft.content)
                  setEditing(true)
                }}
              >
                <Pencil size={15} />
                Düzenle
              </button>
            )}
          </div>
        </>
      )}
      {draft.moderation_flags.length > 0 && (
        <Banner kind="warning">
          {draft.moderation_flags.join(' · ')}
          {editing && (
            <p className="pa-small">
              Bu uyarılar üretim sırasındaki kontrole aittir. Düzenlediğin metni
              yeniden incele.
            </p>
          )}
        </Banner>
      )}
      {error && <Banner kind="error">{error}</Banner>}
      {!editing && (
        <div className="pa-review-actions">
          <div>
            {!published && (
              <button
                className="pa-text-button"
                disabled={unavailable}
                onClick={() =>
                  run(() =>
                    rejected ? onApprove(draft.id) : onReject(draft.id),
                  )
                }
              >
                <X size={16} />
                {rejected ? 'Onaylayarak geri al' : 'Reddet'}
              </button>
            )}
            {onRegenerate && !published && !rejected && (
              <button
                className="pa-text-button"
                disabled={unavailable}
                onClick={() => run(onRegenerate)}
              >
                <RefreshCw size={15} />
                Yeniden üret
              </button>
            )}
          </div>
          {!published && !rejected && (
            <button
              className="pa-button"
              disabled={
                unavailable ||
                draft.status === 'approved' ||
                !draft.content.trim() ||
                charCount(draft.content) > 280
              }
              onClick={() => run(() => onApprove(draft.id))}
            >
              <Check size={17} />
              {draft.status === 'approved'
                ? 'Onaylandı'
                : busy
                  ? 'İşleniyor…'
                  : 'Taslağı onayla'}
            </button>
          )}
        </div>
      )}
      <div className="pa-publish-note">
        <Inbox size={18} />
        <div>
          <strong>Son söz sende.</strong>
          <p>
            {X_PUBLISH_ENABLED
              ? 'Onay ve yayın ayrı işlemlerdir. Yayınlamak için son kontrolünü yap.'
              : 'X yayını henüz etkin değil. Taslağını hazırlayıp onaylayabilirsin.'}
          </p>
        </div>
      </div>
      {onPublish && !published && !rejected && (
        <button
          className="pa-button pa-secondary"
          disabled={
            !X_PUBLISH_ENABLED ||
            draft.status !== 'approved' ||
            unavailable ||
            editing
          }
          onClick={() => run(() => onPublish(draft.id))}
        >
          <Send size={16} />
          {X_PUBLISH_ENABLED ? 'X’te yayınla' : 'X yayını etkin değil'}
        </button>
      )}
    </article>
  )
}
