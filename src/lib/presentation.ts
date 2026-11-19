import type { DraftStatus, DraftVariant } from '@/types'

// Publishing remains disabled until a real X integration is implemented.
export const X_PUBLISH_ENABLED = false
export interface DraftListItem {
  id: string
  news_id: string | null
  job_id?: string | null
  content: string
  variant_label: DraftVariant | null
  status: DraftStatus
  moderation_flags: string[]
  created_at: string
  news_title?: string | null
  source_name?: string | null
}
export const toneLabels: Record<DraftVariant, string> = {
  sert: 'Sert',
  uzlasmaci: 'Uzlaşmacı',
  espriyle: 'Espriyle',
}
export const draftStatusLabels: Record<DraftStatus, string> = {
  pending: 'İnceleme bekliyor',
  edited: 'Düzenlendi',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  published: 'Yayın kaydı oluşturuldu',
}
export function formatDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value || Number.isNaN(new Date(value).getTime()))
    return 'Tarih belirtilmedi'
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(new Date(value))
}
export const todayLabel = () =>
  new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date())
export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback
export const charCount = (text: string) => Array.from(text).length
