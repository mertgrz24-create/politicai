import { useEffect, useState, type ReactNode } from 'react'
import { CircleAlert, FileText, X, Check, RefreshCw } from 'lucide-react'
import { toneLabels } from '@/lib/presentation'
import type { DraftVariant } from '@/types'

export function Brand() {
  return (
    <span className="pa-brand">
      <span className="pa-brand-mark">
        p<span>.</span>
      </span>
      <span>
        PoliticAI<small>İletişim çalışma alanı</small>
      </span>
    </span>
  )
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="pa-page-header">
      <div>
        <span className="pa-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="pa-header-actions">{actions}</div>}
    </header>
  )
}
export function Banner({
  children,
  kind = 'info',
}: {
  children: ReactNode
  kind?: 'info' | 'error' | 'warning' | 'success'
}) {
  return (
    <div
      className={`pa-banner pa-banner-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {kind === 'success' ? <Check size={18} /> : <CircleAlert size={18} />}
      <div>{children}</div>
    </div>
  )
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="pa-empty">
      <FileText size={30} strokeWidth={1.4} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function LoadingState({
  label = 'İçerik yükleniyor',
}: {
  label?: string
}) {
  return (
    <div className="pa-loading" role="status">
      <span className="pa-small">{label}…</span>
      {[1, 2, 3].map((id) => (
        <div className="pa-skeleton" key={id} />
      ))}
    </div>
  )
}
export function RefreshButton({
  loading,
  onClick,
}: {
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      className="pa-button pa-secondary"
      disabled={loading}
      onClick={onClick}
    >
      <RefreshCw size={16} className={loading ? 'pa-spin' : ''} />
      Yenile
    </button>
  )
}
export function ToneBadge({ tone }: { tone: DraftVariant | null }) {
  return tone ? (
    <span className={`pa-tone pa-tone-${tone}`}>
      <span className="pa-dot" />
      {toneLabels[tone]}
    </span>
  ) : (
    <span className="pa-tone">Taslak</span>
  )
}
export function useNotice() {
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])
  return { notice, notify: setNotice, dismiss: () => setNotice('') }
}
export function Notice({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return message ? (
    <div className="pa-toast" role="status">
      <Check size={18} />
      <span>{message}</span>
      <button
        className="pa-icon-button"
        aria-label="Bildirimi kapat"
        onClick={onClose}
      >
        <X size={18} />
      </button>
    </div>
  ) : null
}
