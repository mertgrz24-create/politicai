import { useAuth } from '@/contexts/AuthContext'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Inbox, Newspaper } from 'lucide-react'
import { apiGet } from '@/lib/api'
import {
  errorMessage,
  formatDate,
  todayLabel,
  type DraftListItem,
} from '@/lib/presentation'
import {
  Banner,
  EmptyState,
  LoadingState,
  PageHeader,
  RefreshButton,
} from '@/components/ui/Primitives'
import type { NewsItem } from '@/types'

export default function DashboardPage() {
  const CLIENT_ID = useAuth().user?.client_id
  const [news, setNews] = useState<NewsItem[] | null>(null)
  const [drafts, setDrafts] = useState<DraftListItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const results = await Promise.allSettled([
      apiGet<{ news: NewsItem[] }>('/api/news-list'),
      CLIENT_ID
        ? apiGet<{ drafts: DraftListItem[] }>(
            `/api/drafts?client_id=${encodeURIComponent(CLIENT_ID)}`,
          )
        : Promise.reject(new Error('İletişim hesabı henüz yapılandırılmadı.')),
    ])
    const issues: string[] = []
    if (results[0].status === 'fulfilled') setNews(results[0].value.news ?? [])
    else {
      setNews(null)
      issues.push(errorMessage(results[0].reason, 'Haberler alınamadı.'))
    }
    if (results[1].status === 'fulfilled')
      setDrafts(results[1].value.drafts ?? [])
    else {
      setDrafts(null)
      issues.push(errorMessage(results[1].reason, 'Taslaklar alınamadı.'))
    }
    setErrors(issues)
    setLoading(false)
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  const newCount = news?.filter(
    (item) =>
      !item.processed &&
      Date.now() - new Date(item.fetched_at).getTime() >= 0 &&
      Date.now() - new Date(item.fetched_at).getTime() < 86400000,
  ).length
  const pending = drafts?.filter((draft) =>
    ['pending', 'edited'].includes(draft.status),
  ).length
  const approved = drafts?.filter((draft) => draft.status === 'approved').length
  const recent = [...(news ?? [])].sort(
    (a, b) =>
      new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime(),
  )
  return (
    <div>
      <PageHeader
        eyebrow={todayLabel()}
        title="Güne bir adım önden başla."
        description="Bugünün gündemi ve sıradaki işler, tek bir yerde."
        actions={<RefreshButton loading={loading} onClick={load} />}
      />
      <div className="pa-content pa-content-narrow">
        {errors.length > 0 && (
          <Banner kind="error">
            <strong>Bazı bilgiler yüklenemedi.</strong>
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </Banner>
        )}
        {loading ? (
          <LoadingState label="Günlük özet hazırlanıyor" />
        ) : (
          <>
            <div className="pa-summary-grid">
              {[
                {
                  label: 'İnceleme bekleyen taslak',
                  value: pending,
                  icon: Inbox,
                  to: '/queue?status=pending',
                },
                {
                  label: 'Son 24 saatte yeni haber',
                  value: newCount,
                  icon: Newspaper,
                  to: '/news?processed=no&period=day',
                },
                {
                  label: 'Onaylanan taslak',
                  value: approved,
                  icon: Check,
                  to: '/queue?status=approved',
                },
              ].map(({ label, value, icon: Icon, to }) => (
                <Link className="pa-summary" key={label} to={to}>
                  <Icon size={20} />
                  <strong>{value ?? '—'}</strong>
                  <span>{label}</span>
                  <ArrowRight size={18} />
                </Link>
              ))}
            </div>
            {recent[0] ? (
              <>
                <section className="pa-overview-feature">
                  <span className="pa-eyebrow">
                    Gündemden bir haber · {recent[0].source_name}
                  </span>
                  <h2>{recent[0].title}</h2>
                  <p>
                    {recent[0].description ||
                      'Haberi inceleyerek iletişim profiline uygun taslaklar hazırlayabilirsin.'}
                  </p>
                  <Link
                    className="pa-button"
                    to={`/news?news_id=${encodeURIComponent(recent[0].id)}`}
                  >
                    Haberi incele <ArrowRight size={17} />
                  </Link>
                </section>
                <section className="pa-latest" aria-label="Son haberler">
                  <h3>Haber akışından</h3>
                  {recent.slice(1, 4).map((item) => (
                    <Link
                      key={item.id}
                      to={`/news?news_id=${encodeURIComponent(item.id)}`}
                    >
                      <div>
                        <span className="pa-small">
                          {item.source_name} · {formatDate(item.published_at)}
                        </span>
                        {item.title}
                      </div>
                      <ArrowRight size={18} />
                    </Link>
                  ))}
                </section>
              </>
            ) : (
              <EmptyState
                title="Gündem burada şekillenecek."
                description="Haber akışı güncellendiğinde kaynakları burada görebilir, kendi sesinle taslaklar hazırlayabilirsin."
                action={
                  <Link className="pa-button" to="/news">
                    Editör masasına git
                  </Link>
                }
              />
            )}
          </>
        )}
        <div className="pa-publish-note">
          <Inbox size={20} />
          <div>
            <strong>Her içerik senin onayınla.</strong>
            <p>
              Hazırlanan taslakları incele, gerekli düzenlemeleri yap ve son
              kararını ver.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
