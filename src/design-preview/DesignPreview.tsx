import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  Menu,
  Newspaper,
  Pencil,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { demoHistory, previewNews, statusLabels, tones } from './fixtures'
import type { PreviewDraft, PreviewNews, Tone } from './fixtures'
import './preview.css'
import './warm-editor.css'

type Screen = 'workspace' | 'overview' | 'persona' | 'history' | 'login'
type Scenario = 'normal' | 'empty' | 'loading' | 'connection' | 'generation'
const navigation = [
  { id: 'overview', label: 'Günlük özet', icon: LayoutDashboard },
  { id: 'workspace', label: 'Editör masası', icon: Newspaper },
  { id: 'history', label: 'Geçmiş', icon: History },
  { id: 'persona', label: 'İletişim profili', icon: Settings2 },
] as const
const scenarios: { value: Scenario; label: string }[] = [
  { value: 'normal', label: 'Normal görünüm' },
  { value: 'empty', label: 'Boş liste' },
  { value: 'loading', label: 'Yükleniyor' },
  { value: 'connection', label: 'Bağlantı hatası' },
  { value: 'generation', label: 'Üretim hatası' },
]
const time = (date: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))

export default function DesignPreview() {
  const [params, setParams] = useSearchParams()
  const variant = params.get('layout') === 'b' ? 'b' : 'a'
  const screenValue = params.get('screen')
  const screen: Screen = [
    'workspace',
    'overview',
    'persona',
    'history',
    'login',
  ].includes(screenValue ?? '')
    ? (screenValue as Screen)
    : 'workspace'
  const [items, setItems] = useState<PreviewNews[]>(() =>
    structuredClone(previewNews),
  )
  const [selectedId, setSelectedId] = useState(items[0].id)
  const [tone, setTone] = useState<Tone>('uzlasmaci')
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState(0)
  const [editor, setEditor] = useState<{
    id: string
    original: string
    value: string
  } | null>(null)
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null)
  const [toast, setToast] = useState('')
  const [sourceOpen, setSourceOpen] = useState(variant === 'a')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [profile, setProfile] = useState({
    identity: 'Deniz Yılmaz',
    role: 'Yerel yönetim temsilcisi',
    address: 'Değerli hemşehrilerim',
    themes: 'Ulaşım, eğitim, kent yaşamı',
    blocked: 'Kişisel hakaret, doğrulanmamış iddialar',
    count: '3',
  })
  const [profileSaved, setProfileSaved] = useState(profile)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const editorRef = useRef<HTMLElement>(null)
  const dirty = !!editor && editor.value !== editor.original
  const profileDirty = JSON.stringify(profile) !== JSON.stringify(profileSaved)
  const news = items.find((item) => item.id === selectedId) ?? items[0]
  const activeDraft =
    news.drafts.find((draft) => draft.tone === tone) ?? news.drafts[0]
  const query = params.get('q') ?? ''
  const source = params.get('source') ?? 'all'
  const period = params.get('period') ?? 'all'
  const processed = params.get('processed') ?? 'all'
  const filtered = items.filter(
    (item) =>
      (!query ||
        `${item.title} ${item.description}`
          .toLocaleLowerCase('tr')
          .includes(query.toLocaleLowerCase('tr'))) &&
      (source === 'all' || item.source === source) &&
      (period !== 'today' || item.date.startsWith('2026-10-15')) &&
      (processed === 'all' || item.processed === (processed === 'yes')),
  )
  const approved = items
    .flatMap((item) => item.drafts)
    .filter((draft) => draft.status === 'approved').length
  const pending = items
    .flatMap((item) => item.drafts)
    .filter(
      (draft) => draft.status === 'pending' || draft.status === 'edited',
    ).length

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 5000)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!dirty && !profileDirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, profileDirty])
  function updateParam(key: string, value: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value && value !== 'all') next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }
  function protect(action: () => void) {
    if (dirty || (screen === 'persona' && profileDirty))
      setDiscardAction(() => action)
    else action()
  }
  function navigate(next: Screen, changes: Record<string, string> = {}) {
    protect(() => {
      setEditor(null)
      setParams(
        (current) => {
          const nextParams = new URLSearchParams(current)
          nextParams.set('screen', next)
          Object.entries(changes).forEach(([key, value]) =>
            nextParams.set(key, value),
          )
          return nextParams
        },
        { replace: true },
      )
      setMobileNav(false)
    })
  }
  function selectNews(id: string) {
    protect(() => {
      setEditor(null)
      setSelectedId(id)
      setTone('uzlasmaci')
      document.getElementById('dp-review')?.scrollIntoView({ block: 'start' })
    })
  }
  function changeDraft(id: string, patch: Partial<PreviewDraft>) {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        drafts: item.drafts.map((draft) =>
          draft.id === id ? { ...draft, ...patch } : draft,
        ),
      })),
    )
  }
  function edit(draft: PreviewDraft) {
    protect(() => {
      setTone(draft.tone)
      setEditor({ id: draft.id, original: draft.content, value: draft.content })
      requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ block: 'start' })
        editorRef.current?.querySelector('textarea')?.focus()
      })
    })
  }
  function generate() {
    if (generating) return
    protect(() => {
      setEditor(null)
      setGenerating(true)
      setStep(0)
      const id = news.id
      timers.current.push(
        setTimeout(() => setStep(1), 700),
        setTimeout(() => setStep(2), 1500),
        setTimeout(() => {
          setGenerating(false)
          if (scenario === 'generation') {
            setToast('Üretim tamamlanamadı. Tekrar deneyebilirsin.')
            return
          }
          setItems((current) =>
            current.map((item) =>
              item.id === id
                ? {
                    ...item,
                    processed: true,
                    drafts: structuredClone(
                      previewNews.find((original) => original.id === id)!
                        .drafts,
                    ),
                  }
                : item,
            ),
          )
          setToast('Üç örnek taslak hazır. İncelemek için bir üslup seç.')
        }, 2400),
      )
    })
  }
  function approve(draft: PreviewDraft) {
    protect(() => {
      setEditor(null)
      changeDraft(draft.id, { status: 'approved' })
      setToast('Taslak onaylandı. X bağlantısı olmadığı için yayınlanmadı.')
    })
  }
  function resetDemo() {
    protect(() => {
      timers.current.forEach(clearTimeout)
      setGenerating(false)
      setItems(structuredClone(previewNews))
      setSelectedId(previewNews[0].id)
      setEditor(null)
      setScenario('normal')
      setProfile(profileSaved)
      setToast('Örnek çalışma alanı sıfırlandı.')
    })
  }

  const nav = (
    <>
      {navigation.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`dp-nav-item ${screen === id ? 'is-active' : ''}`}
          aria-current={screen === id ? 'page' : undefined}
          onClick={() => navigate(id)}
        >
          <Icon size={19} />
          <span>{label}</span>
          {id === 'workspace' && (
            <span className="dp-nav-count">{pending}</span>
          )}
        </button>
      ))}
    </>
  )
  const filters = (
    <div className={`dp-filters ${filtersOpen ? 'is-open' : ''}`}>
      <label>
        Kaynak
        <select
          value={source}
          onChange={(event) => updateParam('source', event.target.value)}
        >
          <option value="all">Tüm kaynaklar</option>
          <option>Kent Bülteni</option>
          <option>Yerel Gündem</option>
        </select>
      </label>
      <label>
        Tarih
        <select
          value={period}
          onChange={(event) => updateParam('period', event.target.value)}
        >
          <option value="all">Tüm tarihler</option>
          <option value="today">Bugün</option>
        </select>
      </label>
      <label>
        Durum
        <select
          value={processed}
          onChange={(event) => updateParam('processed', event.target.value)}
        >
          <option value="all">Tüm haberler</option>
          <option value="no">İşlenmemiş</option>
          <option value="yes">Taslak üretildi</option>
        </select>
      </label>
      {(query ||
        source !== 'all' ||
        period !== 'all' ||
        processed !== 'all') && (
        <button
          className="dp-text-button"
          onClick={() =>
            setParams(
              (current) => {
                const next = new URLSearchParams(current)
                ;['q', 'source', 'period', 'processed'].forEach((key) =>
                  next.delete(key),
                )
                return next
              },
              { replace: true },
            )
          }
        >
          Filtreleri temizle
        </button>
      )}
    </div>
  )
  const newsList = (
    <section className="dp-news-list" aria-label="Haber listesi">
      <div className="dp-section-label">
        <span>Haber akışı</span>
        <span>{scenario === 'empty' ? 0 : filtered.length} haber</span>
      </div>
      <label className="dp-search">
        <Search size={18} />
        <span className="dp-sr-only">Haberlerde ara</span>
        <input
          placeholder="Haberlerde ara…"
          value={query}
          onChange={(event) => updateParam('q', event.target.value)}
        />
        <kbd>⌕</kbd>
      </label>
      <button
        className="dp-filter-toggle"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        <SlidersHorizontal size={16} /> Filtreler <ChevronDown size={15} />
      </button>
      {filters}
      {scenario === 'loading' ? (
        <div
          className="dp-skeletons"
          role="status"
          aria-label="Haberler yükleniyor"
        >
          {[1, 2, 3].map((id) => (
            <div className="dp-skeleton" key={id} />
          ))}
          <span>Haberler yükleniyor…</span>
        </div>
      ) : scenario === 'connection' ? (
        <div className="dp-empty">
          <CircleAlert />
          <h3>Haberlere ulaşılamadı</h3>
          <p>Bağlantını kontrol edip yeniden dene.</p>
          <button className="dp-button" onClick={() => setScenario('normal')}>
            Tekrar dene
          </button>
        </div>
      ) : scenario === 'empty' || !filtered.length ? (
        <div className="dp-empty">
          <Search />
          <h3>
            {scenario === 'empty'
              ? 'Henüz haber yok'
              : 'Eşleşen haber bulunamadı'}
          </h3>
          <p>
            {scenario === 'empty'
              ? 'Yeni haberler geldiğinde burada görünecek.'
              : 'Başka bir kelimeyle ara veya filtreleri temizle.'}
          </p>
          {scenario === 'empty' && (
            <button className="dp-button" onClick={() => setScenario('normal')}>
              Örnek haberleri göster
            </button>
          )}
        </div>
      ) : (
        <div className="dp-news-rows">
          {filtered.map((item) => (
            <button
              className={`dp-news-row ${selectedId === item.id ? 'is-selected' : ''}`}
              key={item.id}
              disabled={generating}
              aria-pressed={selectedId === item.id}
              onClick={() => selectNews(item.id)}
            >
              <span className="dp-meta">
                <span>{item.source}</span>
                <span>
                  {item.date.startsWith('2026-10-15') ? time(item.date) : 'Dün'}
                </span>
              </span>
              <strong>{item.title}</strong>
              <span className="dp-news-description">{item.description}</span>
              <span className="dp-row-bottom">
                <span>{item.category}</span>
                <span>
                  {item.processed ? (
                    <>
                      <Check size={13} /> Taslak hazır
                    </>
                  ) : (
                    <>
                      <span className="dp-dot" /> Yeni haber
                    </>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="dp-list-foot">
        <span className="dp-dot" /> Örnek akış · 15 Ekim 2026
      </div>
    </section>
  )
  const draftCard = (draft: PreviewDraft, compact = false) => (
    <article
      key={draft.id}
      className={`dp-draft-card ${compact ? 'is-compact' : ''} ${draft.status === 'approved' ? 'is-approved' : ''}`}
    >
      <div className="dp-draft-top">
        <span className={`dp-tone dp-tone-${draft.tone}`}>
          <span className="dp-dot" />
          {tones[draft.tone]}
        </span>
        <span className="dp-small">{statusLabels[draft.status]}</span>
      </div>
      <p className="dp-tweet">{draft.content}</p>
      {!!draft.flags.length && (
        <div className="dp-warning">
          <CircleAlert size={16} />
          <span>{draft.flags.join(' ')}</span>
        </div>
      )}
      <div className="dp-draft-bottom">
        <span className="dp-small">
          {Array.from(draft.content).length} / 280 karakter
        </span>
        <button
          className="dp-text-button"
          disabled={generating}
          onClick={() => edit(draft)}
        >
          <Pencil size={15} /> Düzenle
        </button>
      </div>
      {compact && (
        <button
          className={`dp-button ${draft.status === 'approved' ? 'dp-secondary' : ''}`}
          disabled={
            generating ||
            draft.status === 'approved' ||
            draft.status === 'rejected'
          }
          onClick={() => approve(draft)}
        >
          <Check size={16} />
          {draft.status === 'approved' ? 'Onaylandı' : 'Taslağı onayla'}
        </button>
      )}
    </article>
  )
  const review = (
    <section
      className="dp-review"
      id="dp-review"
      aria-label="Seçili haber ve taslaklar"
    >
      <div className="dp-review-heading">
        <span className="dp-eyebrow">
          {news.category} <span> / </span> {news.source}
        </span>
        <span className="dp-small">15 Ekim 2026</span>
      </div>
      <h2>{news.title}</h2>
      <button
        className="dp-source-toggle"
        aria-expanded={sourceOpen}
        onClick={() => setSourceOpen(!sourceOpen)}
      >
        <FileText size={15} /> Kaynak haber özeti{' '}
        <ChevronDown size={15} className={sourceOpen ? 'is-rotated' : ''} />
      </button>
      {sourceOpen && (
        <div className="dp-source">
          <p>{news.description}</p>
          <span className="dp-small">
            Tasarım için hazırlanmış örnek haber.
          </span>
        </div>
      )}
      <div className="dp-generation-head">
        <div>
          <h3>Bir haber, üç farklı anlatım.</h3>
          <p>Üslubu karşılaştır, kendi cümleni bul.</p>
        </div>
        <button
          className="dp-button dp-secondary"
          disabled={generating}
          onClick={generate}
        >
          <Sparkles size={16} />
          {generating
            ? 'Üretiliyor…'
            : news.processed
              ? 'Yeniden üret'
              : 'Taslak üret'}
        </button>
      </div>
      {generating && (
        <div className="dp-progress" role="status">
          <span className="dp-small">
            {
              [
                'Haber hazırlanıyor',
                'Üç üslupta taslak yazılıyor',
                'İçerik kontrol ediliyor',
              ][step]
            }
          </span>
          <progress max="3" value={step + 1} />
          <span className="dp-small">Örnek üretim</span>
        </div>
      )}
      {scenario === 'generation' && !generating && (
        <div className="dp-error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Üretim tamamlanamadı</strong>
            <p>
              Örnek servis yanıt vermedi. Yeniden deneyebilir veya hazır
              taslakları inceleyebilirsin.
            </p>
            <button
              className="dp-text-button"
              onClick={() => {
                setScenario('normal')
                setToast(
                  'Hata senaryosu kapatıldı. Yeniden üretim denenebilir.',
                )
              }}
            >
              Hata senaryosunu kapat
            </button>
          </div>
        </div>
      )}
      {variant === 'a' ? (
        <>
          <div className="dp-tabs" role="tablist" aria-label="Taslak üslubu">
            {news.drafts.map((draft, index) => (
              <button
                key={draft.id}
                id={`tab-${draft.tone}`}
                role="tab"
                aria-selected={tone === draft.tone}
                aria-controls={`panel-${draft.tone}`}
                tabIndex={tone === draft.tone ? 0 : -1}
                onKeyDown={(event) => {
                  if (
                    ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(
                      event.key,
                    )
                  ) {
                    event.preventDefault()
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? 2
                          : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
                    protect(() => {
                      setEditor(null)
                      setTone(news.drafts[next].tone)
                      document
                        .getElementById(`tab-${news.drafts[next].tone}`)
                        ?.focus()
                    })
                  }
                }}
                onClick={() =>
                  protect(() => {
                    setEditor(null)
                    setTone(draft.tone)
                  })
                }
              >
                {tones[draft.tone]}
                {draft.status === 'approved' && <Check size={14} />}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`panel-${tone}`}
            aria-labelledby={`tab-${tone}`}
          >
            {draftCard(activeDraft)}
          </div>
          <div className="dp-review-actions">
            <button
              className="dp-text-button"
              disabled={generating || activeDraft.status === 'rejected'}
              onClick={() =>
                protect(() => {
                  setEditor(null)
                  changeDraft(activeDraft.id, { status: 'rejected' })
                  setToast('Taslak reddedildi.')
                })
              }
            >
              <X size={16} /> Reddet
            </button>
            <button
              className="dp-button"
              disabled={
                generating ||
                activeDraft.status === 'approved' ||
                activeDraft.status === 'rejected'
              }
              onClick={() => approve(activeDraft)}
            >
              <Check size={17} />
              {activeDraft.status === 'approved'
                ? 'Onaylandı'
                : 'Taslağı onayla'}
            </button>
          </div>
        </>
      ) : (
        <div className="dp-comparison">
          {news.drafts.map((draft) => draftCard(draft, true))}
        </div>
      )}
      <div className="dp-publish-note">
        <Inbox size={17} />
        <div>
          <strong>Son söz sende.</strong>
          <p>
            Onaylanan taslaklar yayınlanmaya hazır olur. X hesabı bu önizlemeye
            bağlı değil; hiçbir içerik yayınlanmaz.
          </p>
        </div>
      </div>
      <button
        className="dp-text-button dp-publish-disabled"
        disabled
        title="X hesabı bağlı değil"
      >
        X’te yayınla · Hesap bağlı değil
      </button>
      {editor && (
        <section
          className="dp-editor"
          ref={editorRef}
          aria-labelledby="dp-editor-title"
        >
          <div className="dp-editor-heading">
            <div>
              <span className="dp-eyebrow">Metin atölyesi</span>
              <h3 id="dp-editor-title">Kendi sesinle son dokunuş.</h3>
            </div>
            <button
              className="dp-icon-button"
              aria-label="Düzenlemeyi kapat"
              onClick={() => protect(() => setEditor(null))}
            >
              <X size={19} />
            </button>
          </div>
          <label htmlFor="dp-editor-text">Taslak metni</label>
          <textarea
            id="dp-editor-text"
            rows={6}
            value={editor.value}
            onChange={(event) =>
              setEditor({ ...editor, value: event.target.value })
            }
            aria-invalid={
              !editor.value.trim() || Array.from(editor.value).length > 280
            }
            aria-describedby="dp-char-count"
          />
          <div
            id="dp-char-count"
            className={`dp-char-count ${Array.from(editor.value).length > 280 ? 'is-invalid' : ''}`}
          >
            {Array.from(editor.value).length} / 280 karakter
            {!editor.value.trim() && ' · Metin boş bırakılamaz'}
            {Array.from(editor.value).length > 280 &&
              ' · Karakter sınırı aşıldı'}
          </div>
          <div className="dp-post-preview">
            <span className="dp-avatar">DY</span>
            <div>
              <strong>{profile.identity}</strong>
              <span className="dp-small"> @denizyilmaz · Önizleme</span>
              <p>{editor.value || 'Metnin burada görünecek.'}</p>
            </div>
          </div>
          {news.drafts
            .find((draft) => draft.id === editor.id)
            ?.flags.map((flag) => (
              <div className="dp-warning" key={flag}>
                <CircleAlert size={16} />
                {flag}
              </div>
            ))}
          <div className="dp-editor-actions">
            <span className="dp-small">
              {dirty ? 'Kaydedilmemiş değişiklikler' : 'Metin güncel'}
            </span>
            <button
              className="dp-button"
              disabled={
                !editor.value.trim() || Array.from(editor.value).length > 280
              }
              onClick={() => {
                changeDraft(editor.id, {
                  content: editor.value.trim(),
                  status: 'edited',
                })
                setEditor(null)
                setToast(
                  'Metin kaydedildi. Yayınlamadan önce onayını bekliyor.',
                )
              }}
            >
              <Check size={16} /> Değişiklikleri kaydet
            </button>
          </div>
        </section>
      )}
    </section>
  )

  return (
    <div className={`dp-root dp-layout-${variant}`}>
      <a className="dp-skip" href="#dp-main">
        İçeriğe geç
      </a>
      <header className="dp-preview-bar">
        <div>
          <span className="dp-preview-indicator" />
          <strong>Tasarım önizlemesi</strong>
          <span className="dp-preview-description">
            Örnek içerik · Gerçek yayın yapılmaz
          </span>
        </div>
        <div className="dp-layout-switch" aria-label="Tasarım alternatifi">
          <button
            disabled={generating}
            aria-pressed={variant === 'a'}
            onClick={() =>
              protect(() => {
                setEditor(null)
                setSourceOpen(true)
                updateParam('layout', 'a')
              })
            }
          >
            A <span>Editör masası</span>
          </button>
          <button
            disabled={generating}
            aria-pressed={variant === 'b'}
            onClick={() =>
              protect(() => {
                setEditor(null)
                setSourceOpen(false)
                setParams(
                  (current) => {
                    const next = new URLSearchParams(current)
                    next.set('layout', 'b')
                    next.set('screen', 'workspace')
                    return next
                  },
                  { replace: true },
                )
              })
            }
          >
            B <span>Karşılaştırma</span>
          </button>
        </div>
        <label className="dp-scenario">
          <span className="dp-sr-only">Görünüm durumu</span>
          <select
            value={scenario}
            onChange={(event) => setScenario(event.target.value as Scenario)}
          >
            {scenarios.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="dp-shell">
        {screen !== 'login' && (
          <aside className="dp-sidebar">
            <a
              className="dp-brand"
              href="/design-preview"
              onClick={(event) => {
                event.preventDefault()
                navigate('overview')
              }}
            >
              <span className="dp-brand-mark">
                p<span>.</span>
              </span>
              <span>
                PoliticAI
                <span className="dp-brand-sub">İletişim çalışma alanı</span>
              </span>
            </a>
            <button
              className="dp-mobile-menu dp-icon-button"
              aria-label="Gezinme menüsü"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={22} />
            </button>
            <div className="dp-sidebar-inner">
              <div className="dp-client">
                <span className="dp-avatar">DY</span>
                <div>
                  <strong>{profile.identity}</strong>
                  <span>Örnek hesap</span>
                </div>
              </div>
              <span className="dp-nav-label">ÇALIŞMA ALANI</span>
              <nav
                aria-label="Ana gezinme"
                className={mobileNav ? 'is-open' : ''}
              >
                {nav}
              </nav>
              <div className="dp-sidebar-bottom">
                <div className="dp-connection">
                  <span className="dp-dot" />
                  <div>
                    <strong>X hesabı bağlı değil</strong>
                    <span>Yayın için hesap bağlantısı gerekli</span>
                  </div>
                </div>
                <button
                  className="dp-nav-item"
                  onClick={() => navigate('login')}
                >
                  <ArrowLeft size={18} /> Giriş ekranını incele
                </button>
              </div>
            </div>
          </aside>
        )}
        <main id="dp-main" className="dp-main" tabIndex={-1}>
          {screen === 'workspace' && (
            <>
              <header className="dp-page-header">
                <div>
                  <span className="dp-eyebrow">
                    15 Ekim Perşembe · Örnek gün
                  </span>
                  <h1>
                    {variant === 'a'
                      ? 'Gündemden, senin sesine.'
                      : 'Üç anlatım. Bir karar.'}
                  </h1>
                  <p>
                    {variant === 'a'
                      ? 'Haberi incele, üslubunu seç ve söylemek istediğini netleştir.'
                      : 'Aynı haberin üç taslağını yan yana incele, en uygun anlatımı seç.'}
                  </p>
                </div>
                <button
                  className="dp-round-link"
                  aria-label="Taslakları incele"
                  onClick={() =>
                    document
                      .getElementById('dp-review')
                      ?.scrollIntoView({ block: 'start' })
                  }
                >
                  <ArrowDown size={22} />
                </button>
              </header>
              <div className="dp-workspace">
                {newsList}
                {scenario !== 'normal' && scenario !== 'generation' ? (
                  <section className="dp-waiting">
                    <FileText size={32} />
                    <h2>Her iyi metin, bir haberle başlar.</h2>
                    <p>İncelemek için haber akışından bir kaynak seç.</p>
                  </section>
                ) : (
                  review
                )}
              </div>
            </>
          )}
          {screen === 'overview' && (
            <div className="dp-support-page">
              <span className="dp-eyebrow">15 Ekim 2026 · Perşembe</span>
              <h1>Güne bir adım önden başla.</h1>
              <p className="dp-lead">
                Bugünün gündemi ve sıradaki işler, tek bir yerde.
              </p>
              <div className="dp-summary-grid">
                {[
                  {
                    label: 'İnceleme bekleyen taslak',
                    value: pending,
                    icon: Inbox,
                    action: () => navigate('workspace'),
                  },
                  {
                    label: 'Yeni haber',
                    value: items.filter((item) => !item.processed).length,
                    icon: Newspaper,
                    action: () => navigate('workspace', { processed: 'no' }),
                  },
                  {
                    label: 'Onaylanan taslak',
                    value: approved,
                    icon: Check,
                    action: () => navigate('workspace'),
                  },
                ].map(({ label, value, icon: Icon, action }) => (
                  <button
                    key={label}
                    className="dp-summary-item"
                    onClick={action}
                  >
                    <Icon size={20} />
                    <strong>{value}</strong>
                    <span>{label}</span>
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
              <div className="dp-failure-summary">
                <CircleAlert size={19} />
                <div>
                  <strong>
                    {scenario === 'generation'
                      ? '1 başarısız örnek işlem'
                      : 'Başarısız işlem yok'}
                  </strong>
                  <p>
                    {scenario === 'generation'
                      ? 'Üretimi yeniden denemek için haberin taslaklarını aç.'
                      : 'Üretim hatası senaryosunu üst çubuktan deneyebilirsin.'}
                  </p>
                </div>
                {scenario === 'generation' && (
                  <button
                    className="dp-text-button"
                    onClick={() => navigate('workspace')}
                  >
                    İşlemi incele <ArrowRight size={16} />
                  </button>
                )}
              </div>
              <section className="dp-overview-feature">
                <span className="dp-eyebrow">Bugünün odağı</span>
                <h2>{items[0].title}</h2>
                <p>{items[0].description}</p>
                <button
                  className="dp-button"
                  onClick={() => {
                    selectNews(items[0].id)
                    navigate('workspace')
                  }}
                >
                  Haberi incele <ArrowRight size={17} />
                </button>
              </section>
              <div className="dp-next-step">
                <Clock3 size={22} />
                <div>
                  <h3>Yayın öncesi son adım</h3>
                  <p>
                    X hesabı bağlı değil. Taslaklarını hazırlayıp
                    onaylayabilirsin; yayın için hesap bağlantısı gerekir.
                  </p>
                </div>
              </div>
            </div>
          )}
          {screen === 'persona' && (
            <div className="dp-support-page">
              <span className="dp-eyebrow">İletişim profili</span>
              <h1>Kelimeler değişir. Sesin kalır.</h1>
              <p className="dp-lead">
                Taslakların seni nasıl temsil etmesini istediğini belirle.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setProfileSaved(profile)
                  setToast(
                    'İletişim profili bu önizleme oturumu için kaydedildi.',
                  )
                }}
              >
                <section className="dp-profile-section">
                  <div>
                    <span className="dp-eyebrow">Kimlik ve hitap</span>
                    <h2>Kimin adına konuşuyoruz?</h2>
                    <p>Üretilen metinler için temel bağlam.</p>
                  </div>
                  <div className="dp-form-fields">
                    <label>
                      Ad soyad
                      <input
                        required
                        value={profile.identity}
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            identity: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Görev / kimlik
                      <input
                        required
                        value={profile.role}
                        onChange={(event) =>
                          setProfile({ ...profile, role: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Hitap biçimi
                      <input
                        value={profile.address}
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            address: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </section>
                <section className="dp-profile-section">
                  <div>
                    <span className="dp-eyebrow">Üslup ve sınırlar</span>
                    <h2>Neye odaklanalım?</h2>
                    <p>Konuları ve içerik sınırlarını açıkça tanımla.</p>
                  </div>
                  <div className="dp-form-fields">
                    <label>
                      Öncelikli temalar
                      <input
                        value={profile.themes}
                        onChange={(event) =>
                          setProfile({ ...profile, themes: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Kaçınılacak ifadeler ve konular
                      <textarea
                        rows={3}
                        value={profile.blocked}
                        onChange={(event) =>
                          setProfile({
                            ...profile,
                            blocked: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Günlük taslak hedefi
                      <input
                        type="number"
                        min={1}
                        max={17}
                        required
                        value={profile.count}
                        onChange={(event) =>
                          setProfile({ ...profile, count: event.target.value })
                        }
                      />
                    </label>
                  </div>
                </section>
                <footer className="dp-form-footer">
                  <span className="dp-small">
                    {profileDirty
                      ? 'Kaydedilmemiş değişiklikler var'
                      : 'Örnek profil güncel'}
                  </span>
                  <button className="dp-button" type="submit">
                    <Check size={17} /> Profili kaydet
                  </button>
                </footer>
              </form>
            </div>
          )}
          {screen === 'history' && (
            <div className="dp-support-page">
              <span className="dp-eyebrow">İletişim arşivi</span>
              <h1>Söylediklerin, bir arada.</h1>
              <p className="dp-lead">
                Örnek yayın kayıtları. Bu önizlemede gerçek yayın yapılmaz.
              </p>
              <div className="dp-history-filter">
                <label>
                  Dönem
                  <select
                    value={params.get('historyPeriod') ?? 'week'}
                    onChange={(event) =>
                      updateParam('historyPeriod', event.target.value)
                    }
                  >
                    <option value="day">Son 24 saat</option>
                    <option value="week">Son 7 gün</option>
                    <option value="all">Tüm kayıtlar</option>
                  </select>
                </label>
                <span className="dp-small">Örnek tarih: 15 Ekim 2026</span>
              </div>
              {params.get('historyPeriod') === 'day' ? (
                <div className="dp-empty">
                  <History size={28} />
                  <h3>Son 24 saatte kayıt yok</h3>
                  <p>Geçmiş örneklerini görmek için son 7 günü seç.</p>
                </div>
              ) : (
                demoHistory.map((item) => (
                  <article className="dp-history-entry" key={item.id}>
                    <div className="dp-history-date">
                      <span>{item.date}</span>
                      <span className="dp-small">{item.tone}</span>
                    </div>
                    <div>
                      <span className="dp-demo-label">
                        <Check size={14} /> Örnek yayın kaydı
                      </span>
                      <p className="dp-tweet">{item.content}</p>
                      <span className="dp-small">Kaynak: {item.source}</span>
                    </div>
                  </article>
                ))
              )}
              <p className="dp-small dp-history-note">
                Etkileşim verisi bağlı değil. Beğeni ve görüntülenme sayısı
                gösterilmiyor.
              </p>
            </div>
          )}
          {screen === 'login' && (
            <div className="dp-login">
              <div className="dp-login-story">
                <span className="dp-brand">
                  <span className="dp-brand-mark">
                    p<span>.</span>
                  </span>{' '}
                  PoliticAI
                </span>
                <div>
                  <span className="dp-eyebrow">
                    Kelimelerin bir karşılığı var.
                  </span>
                  <h1>
                    Gündemi takip et.
                    <br />
                    Kendi sesinle
                    <br />
                    <em>sözünü söyle.</em>
                  </h1>
                  <p>
                    Haberden taslağa, incelemeden onaya.
                    <br />
                    İletişimini tek bir çalışma alanından yönet.
                  </p>
                </div>
                <span className="dp-small">
                  PoliticAI · İletişim çalışma alanı
                </span>
              </div>
              <div className="dp-login-form">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    navigate('overview')
                    setToast(
                      'Örnek çalışma alanı açıldı. Kimlik bilgileri gönderilmedi.',
                    )
                  }}
                >
                  <span className="dp-eyebrow">Yeniden merhaba</span>
                  <h2>Çalışma alanına gir.</h2>
                  <p>
                    Bu bir tasarım önizlemesidir. Örnek bilgilerle devam
                    edebilirsin.
                  </p>
                  <label>
                    E-posta adresi
                    <input
                      type="email"
                      defaultValue="deniz@example.com"
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Şifre
                    <input
                      type="password"
                      defaultValue="ornek-parola"
                      required
                      autoComplete="off"
                    />
                  </label>
                  <button className="dp-button" type="submit">
                    Önizlemeye gir <ArrowRight size={17} />
                  </button>
                  <button
                    className="dp-text-button"
                    type="button"
                    onClick={() => navigate('workspace')}
                  >
                    Giriş yapmadan tasarıma dön
                  </button>
                </form>
              </div>
            </div>
          )}
          {screen !== 'login' && (
            <footer className="dp-page-footer">
              <span>
                PoliticAI <span> / </span>{' '}
                {variant === 'a' ? 'Editör masası' : 'Karşılaştırma alanı'}
              </span>
              <button className="dp-text-button" onClick={resetDemo}>
                Örnekleri sıfırla
              </button>
              <span>Tüm içerikler örnektir.</span>
            </footer>
          )}
        </main>
      </div>
      {toast && (
        <div className="dp-toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            className="dp-icon-button"
            aria-label="Bildirimi kapat"
            onClick={() => setToast('')}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {discardAction && (
        <DiscardDialog
          onCancel={() => setDiscardAction(null)}
          onDiscard={() => {
            setEditor(null)
            setProfile(profileSaved)
            discardAction()
            setDiscardAction(null)
          }}
        />
      )}
    </div>
  )
}

function DiscardDialog({
  onCancel,
  onDiscard,
}: {
  onCancel: () => void
  onDiscard: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      className="dp-discard"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      aria-labelledby="dp-discard-title"
    >
      <CircleAlert size={26} />
      <h2 id="dp-discard-title">Değişiklikler kaydedilmedi</h2>
      <p>Devam edersen son düzenlemelerin kaybolacak.</p>
      <div>
        <button autoFocus className="dp-button dp-secondary" onClick={onCancel}>
          Düzenlemeye dön
        </button>
        <button className="dp-button" onClick={onDiscard}>
          Değişiklikleri bırak
        </button>
      </div>
    </dialog>
  )
}
