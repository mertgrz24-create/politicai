import { useAuth } from '@/contexts/AuthContext'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleAlert, ExternalLink, Loader2 } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { safeHttpUrl } from '@/lib/safeUrl'
import { errorMessage, formatDate } from '@/lib/presentation'
import {
  Banner,
  EmptyState,
  LoadingState,
  PageHeader,
  RefreshButton,
  ToneBadge,
} from '@/components/ui/Primitives'
import type { HistoryItem } from '@/types'

const ranges = [
  { label: 'Son 24 saat', hours: 24 },
  { label: 'Son 7 gün', hours: 168 },
  { label: 'Tüm kayıtlar', hours: 0 },
]
export default function HistoryPage() {
  const CLIENT_ID = useAuth().user?.client_id
  const [posts, setPosts] = useState<HistoryItem[]>([])
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const revision = useRef(0)
  const load = useCallback(async (range: number) => {
    const current = ++revision.current
    if (!CLIENT_ID) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiGet<{ posts: HistoryItem[] }>(
        `/api/history?client_id=${encodeURIComponent(CLIENT_ID)}&hours=${range}`,
      )
      if (current === revision.current) setPosts(data.posts ?? [])
    } catch (err) {
      if (current === revision.current)
        setError(errorMessage(err, 'Geçmiş yüklenemedi.'))
    } finally {
      if (current === revision.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load(hours)
    return () => {
      revision.current++
    }
  }, [hours, load])
  return (
    <div>
      <PageHeader
        eyebrow="İletişim arşivi"
        title="Söylediklerin, bir arada."
        description="Yayın kayıtlarını, kaynak haberleri ve işlem durumlarını buradan takip et."
        actions={
          <RefreshButton loading={loading} onClick={() => load(hours)} />
        }
      />
      <div className="pa-content pa-content-narrow">
        <div className="pa-history-tools" aria-label="Geçmiş dönemi">
          {ranges.map((range) => (
            <button
              key={range.hours}
              className="pa-button pa-secondary"
              aria-pressed={hours === range.hours}
              onClick={() => setHours(range.hours)}
            >
              {range.label}
            </button>
          ))}
        </div>
        {!CLIENT_ID && (
          <Banner kind="warning">
            İletişim hesabı henüz yapılandırılmadığı için geçmiş kayıtları
            yüklenemiyor.
          </Banner>
        )}
        {loading ? (
          <LoadingState label="Geçmiş kayıtları yükleniyor" />
        ) : error ? (
          <Banner kind="error">
            {error}
            <button className="pa-text-button" onClick={() => load(hours)}>
              Tekrar dene
            </button>
          </Banner>
        ) : posts.length === 0 ? (
          <EmptyState
            title="Bu dönemde kayıt yok."
            description="Farklı bir tarih aralığı seçebilir veya onay kuyruğundaki taslaklarını inceleyebilirsin."
            action={
              <Link className="pa-button pa-secondary" to="/queue">
                Onay kuyruğuna git
              </Link>
            }
          />
        ) : (
          <section aria-label="Geçmiş kayıtları">
            {posts.map((item) => {
              const sourceUrl = safeHttpUrl(item.news_link)
              const verified =
                item.status === 'published' && !!item.twitter_post_id
              return (
                <article className="pa-history-entry" key={item.id}>
                  <div className="pa-history-date">
                    <span>{formatDate(item.published_at)}</span>
                    <ToneBadge tone={item.variant_label} />
                  </div>
                  <div>
                    <div className="pa-actions pa-small">
                      {item.status === 'failed' ? (
                        <CircleAlert size={17} />
                      ) : item.status === 'publishing' ? (
                        <Loader2 size={17} className="pa-spin" />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                      <span>
                        {item.status === 'failed'
                          ? 'Yayın başarısız'
                          : item.status === 'publishing'
                            ? 'Yayın işlemi sürüyor'
                            : verified
                              ? 'X’te yayınlandı'
                              : 'Yerel kayıt · X yayını doğrulanmadı'}
                      </span>
                    </div>
                    <p className="pa-tweet">{item.content}</p>
                    {item.error_message && (
                      <Banner kind="error">{item.error_message}</Banner>
                    )}
                    {item.news_title && (
                      <div className="pa-history-source">
                        <span>
                          {item.source_name && `${item.source_name} · `}
                          {item.news_title}
                        </span>
                        {sourceUrl && (
                          <a
                            className="pa-icon-button"
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Kaynak haberi yeni sekmede aç"
                          >
                            <ExternalLink size={17} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
        <p className="pa-small pa-history-note">
          Etkileşim verileri henüz bağlı değil. Beğeni ve görüntülenme sayıları
          gösterilmiyor.
        </p>
      </div>
    </div>
  )
}
