import { useAuth } from '@/contexts/AuthContext'
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { X, Plus, Save, Loader2, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import { charCount, errorMessage } from '@/lib/presentation'
import {
  Banner,
  EmptyState,
  LoadingState,
  Notice,
  PageHeader,
  ToneBadge,
  useNotice,
} from '@/components/ui/Primitives'
import { useUnsavedChanges } from '@/contexts/WorkspaceContext'
import type { Persona, VoiceExample } from '@/types'

const DEFAULT_PERSONA: Omit<
  Persona,
  'id' | 'client_id' | 'created_at' | 'updated_at'
> = {
  identity: 'Muhafazakâr Türk Siyasetçi',
  ideology: 'conservative',
  themes: ['ekonomi', 'aile', 'güvenlik', 'şehir hizmetleri', 'eğitim'],
  banned_words: ['laik', 'darbeci', 'terörist', 'provokatör'],
  banned_topics: [
    'din karşıtı içerik',
    'parti içi çatışma',
    'rakip aday isimleri',
  ],
  address_form: 'Aziz milletim',
  voice_examples: [
    {
      tone: 'sert',
      example:
        'Bu millet teslim olmaz! Ekonomimize yönelik saldırılara karşı dik durmak millete borcumuzdur.',
    },
    {
      tone: 'uzlasmaci',
      example:
        'Ülkemizin geleceği için birlik ve beraberlik şart. Her vatandaşımızın refahı bizim önceliğimizdir.',
    },
    {
      tone: 'espriyle',
      example:
        'Muhalefet yine çöküyor dedi, biz yine çalışmaya devam ettik. Sonuçlar ortada.',
    },
  ],
  reference_prompt:
    "You are a professional social media manager for a conservative, religious, and pro-government Turkish politician. Your task is to write Twitter posts in Turkish about current events. The politician's style: formal yet accessible, uses religious references occasionally, focuses on national unity and economic development, defends government policies while acknowledging challenges, never attacks opponents personally but can criticize policies. Rules: max 280 chars, no hashtag spam (max 2), no emojis unless natural, factual basis required, no speculation.",
  max_chars: 280,
  daily_tweet_count: 3,
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  function commit() {
    const value = draft.trim()
    if (value && !values.includes(value)) onChange([...values, value])
    setDraft('')
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Backspace' && !draft)
      onChange(values.slice(0, -1))
  }
  return (
    <div className="pa-field">
      <label htmlFor={id}>{label}</label>
      <div className="pa-tag-input">
        {values.map((tag) => (
          <span className="pa-tag" key={tag}>
            {tag}
            <button
              type="button"
              className="pa-icon-button"
              aria-label={`${tag} etiketini kaldır`}
              onClick={() => onChange(values.filter((value) => value !== tag))}
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={keyDown}
          onBlur={commit}
          placeholder={placeholder}
        />
      </div>
      <p className="pa-small">Enter veya virgül ile ekle.</p>
    </div>
  )
}
type FormState = typeof DEFAULT_PERSONA
export default function PersonaFormPage() {
  const CLIENT_ID = useAuth().user?.client_id
  const [form, setForm] = useState<FormState>(DEFAULT_PERSONA)
  const [baseline, setBaseline] = useState(JSON.stringify(DEFAULT_PERSONA))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const notice = useNotice()
  useUnsavedChanges(!loading && JSON.stringify(form) !== baseline, () => {
    setForm(JSON.parse(baseline) as FormState)
  })
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    if (!CLIENT_ID) {
      setLoading(false)
      return
    }
    try {
      const data = await apiGet<Persona>(
        `/api/persona?client_id=${encodeURIComponent(CLIENT_ID)}`,
      )
      if (data?.identity) {
        const next: FormState = {
          identity: data.identity,
          ideology: data.ideology ?? '',
          themes: data.themes ?? [],
          banned_words: data.banned_words ?? [],
          banned_topics: data.banned_topics ?? [],
          address_form: data.address_form ?? '',
          voice_examples: data.voice_examples ?? [],
          reference_prompt: data.reference_prompt ?? '',
          max_chars: data.max_chars ?? 280,
          daily_tweet_count: data.daily_tweet_count ?? 3,
        }
        setForm(next)
        setBaseline(JSON.stringify(next))
      }
    } catch (err) {
      setLoadError(errorMessage(err, 'İletişim profili yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }
  function updateVoice(index: number, patch: Partial<VoiceExample>) {
    field(
      'voice_examples',
      form.voice_examples.map((example, i) =>
        i === index ? { ...example, ...patch } : example,
      ),
    )
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!CLIENT_ID || saving || loadError) return
    if (
      !form.identity.trim() ||
      !Number.isInteger(form.max_chars) ||
      form.max_chars < 1 ||
      form.max_chars > 280 ||
      !Number.isInteger(form.daily_tweet_count) ||
      form.daily_tweet_count < 1 ||
      form.daily_tweet_count > 17 ||
      form.voice_examples.some(
        (example) =>
          !example.example.trim() || charCount(example.example) > 280,
      )
    ) {
      setError(
        'Kimlik, sayısal sınırlar ve ses örneklerini kontrol et. Örnek metinler 1–280 karakter olmalı.',
      )
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiPost('/api/persona/upsert', {
        ...form,
        client_id: CLIENT_ID,
      })
      setBaseline(JSON.stringify(form))
      notice.notify('İletişim profili kaydedildi.')
    } catch (err) {
      setError(
        errorMessage(err, 'Profil kaydedilemedi. Yazdıkların korunuyor.'),
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <div>
      <PageHeader
        eyebrow="İletişim profili"
        title="Kelimeler değişir. Sesin kalır."
        description="Taslakların seni nasıl temsil etmesini istediğini belirle."
      />
      <div className="pa-content pa-content-narrow">
        {!CLIENT_ID && (
          <Banner kind="warning">
            İletişim hesabı henüz yapılandırılmadı. Profil kaydetmek için hesap
            ayarlarının tamamlanması gerekiyor.
          </Banner>
        )}
        {loadError && (
          <Banner kind="error">
            {loadError}
            <p>Mevcut profilini korumak için kayıt geçici olarak kapalı.</p>
            <button className="pa-text-button" onClick={load}>
              Tekrar dene
            </button>
          </Banner>
        )}
        {loading ? (
          <LoadingState label="İletişim profili yükleniyor" />
        ) : loadError ? (
          <EmptyState
            title="Profil yüklenemedi."
            description="Mevcut ayarlarını korumak için form açılmadı. Bağlantını kontrol edip yeniden dene."
          />
        ) : (
          <form onSubmit={save}>
            <fieldset disabled={saving || !!loadError} className="pa-fieldset">
              <section className="pa-profile-section">
                <div>
                  <span className="pa-eyebrow">Kimlik ve hitap</span>
                  <h2>Kimin adına konuşuyoruz?</h2>
                  <p>
                    Üretilen metinlerin temel bağlamını ve hitap biçimini
                    tanımla.
                  </p>
                </div>
                <div className="pa-fields">
                  <label className="pa-field">
                    Kimlik / unvan
                    <input
                      required
                      value={form.identity}
                      onChange={(event) =>
                        field('identity', event.target.value)
                      }
                      placeholder="Görevin veya unvanın"
                    />
                  </label>
                  <label className="pa-field">
                    Hitap biçimi
                    <input
                      value={form.address_form ?? ''}
                      onChange={(event) =>
                        field('address_form', event.target.value)
                      }
                      placeholder="Okuyucularına nasıl sesleniyorsun?"
                    />
                  </label>
                  <label className="pa-field">
                    İletişim yaklaşımı
                    <input
                      value={form.ideology}
                      onChange={(event) =>
                        field('ideology', event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>
              <section className="pa-profile-section">
                <div>
                  <span className="pa-eyebrow">Odak ve sınırlar</span>
                  <h2>Neye odaklanalım?</h2>
                  <p>
                    Öncelikli temaları ve taslaklarda kaçınılacak ifadeleri
                    belirle.
                  </p>
                </div>
                <div className="pa-fields">
                  <TagInput
                    label="Öncelikli temalar"
                    values={form.themes}
                    onChange={(values) => field('themes', values)}
                    placeholder="Tema ekle…"
                  />
                  <TagInput
                    label="Kaçınılacak kelimeler"
                    values={form.banned_words}
                    onChange={(values) => field('banned_words', values)}
                    placeholder="Kelime ekle…"
                  />
                  <TagInput
                    label="Kaçınılacak konular"
                    values={form.banned_topics}
                    onChange={(values) => field('banned_topics', values)}
                    placeholder="Konu ekle…"
                  />
                </div>
              </section>
              <section className="pa-profile-section">
                <div>
                  <span className="pa-eyebrow">Üslup örnekleri</span>
                  <h2>Sesini örneklerle anlat.</h2>
                  <p>Kendi cümlelerin, üretilecek taslaklara yön verir.</p>
                </div>
                <div className="pa-fields">
                  {form.voice_examples.map((example, index) => (
                    <div className="pa-voice" key={index}>
                      <div className="pa-actions">
                        <label
                          className="pa-sr-only"
                          htmlFor={`voice-tone-${index}`}
                        >
                          {index + 1}. örneğin üslubu
                        </label>
                        <select
                          id={`voice-tone-${index}`}
                          value={example.tone}
                          onChange={(event) =>
                            updateVoice(index, {
                              tone: event.target.value as VoiceExample['tone'],
                            })
                          }
                        >
                          <option value="sert">Sert</option>
                          <option value="uzlasmaci">Uzlaşmacı</option>
                          <option value="espriyle">Espriyle</option>
                        </select>
                        <ToneBadge tone={example.tone} />
                        <button
                          type="button"
                          className="pa-icon-button"
                          aria-label={`${index + 1}. ses örneğini kaldır`}
                          onClick={() =>
                            field(
                              'voice_examples',
                              form.voice_examples.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      <label className="pa-field">
                        {index + 1}. örnek metin
                        <textarea
                          rows={4}
                          value={example.example}
                          onChange={(event) =>
                            updateVoice(index, { example: event.target.value })
                          }
                          placeholder="Kendi üslubunla bir örnek metin…"
                          required
                          aria-invalid={charCount(example.example) > 280}
                        />
                      </label>
                      <p
                        className={`pa-char-count ${charCount(example.example) > 280 ? 'pa-invalid' : ''}`}
                      >
                        {charCount(example.example)} / 280 karakter
                      </p>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="pa-button pa-secondary"
                    onClick={() =>
                      field('voice_examples', [
                        ...form.voice_examples,
                        { tone: 'uzlasmaci', example: '' },
                      ])
                    }
                  >
                    <Plus size={17} />
                    Ses örneği ekle
                  </button>
                </div>
              </section>
              <section className="pa-profile-section">
                <div>
                  <span className="pa-eyebrow">Metin tercihleri</span>
                  <h2>Sınırları sen belirle.</h2>
                  <p>
                    Uzunluğu, günlük hedefi ve ek yazım yönergelerini ayarla.
                  </p>
                </div>
                <div className="pa-fields">
                  <div className="pa-two-fields">
                    <label className="pa-field">
                      Karakter sınırı
                      <input
                        type="number"
                        min={1}
                        max={280}
                        required
                        value={form.max_chars}
                        onChange={(event) =>
                          field('max_chars', Number(event.target.value))
                        }
                      />
                    </label>
                    <label className="pa-field">
                      Günlük taslak hedefi
                      <input
                        type="number"
                        min={1}
                        max={17}
                        required
                        value={form.daily_tweet_count}
                        onChange={(event) =>
                          field('daily_tweet_count', Number(event.target.value))
                        }
                      />
                    </label>
                  </div>
                  <details className="pa-advanced">
                    <summary>Gelişmiş yazım yönergeleri</summary>
                    <label className="pa-field">
                      Ek üslup yönergeleri
                      <textarea
                        rows={7}
                        value={form.reference_prompt ?? ''}
                        onChange={(event) =>
                          field('reference_prompt', event.target.value)
                        }
                      />
                    </label>
                    <p className="pa-small">
                      Bu yönergeler taslak üretiminde kullanılan temel metne
                      eklenir.
                    </p>
                  </details>
                </div>
              </section>
            </fieldset>
            {error && <Banner kind="error">{error}</Banner>}
            <footer className="pa-form-footer">
              <span className="pa-small">
                {JSON.stringify(form) !== baseline
                  ? 'Kaydedilmemiş değişiklikler var'
                  : 'Profil güncel'}
              </span>
              <button
                type="submit"
                className="pa-button"
                disabled={saving || !CLIENT_ID || !!loadError}
              >
                {saving ? (
                  <Loader2 size={17} className="pa-spin" />
                ) : (
                  <Save size={17} />
                )}
                {saving ? 'Kaydediliyor…' : 'Profili kaydet'}
              </button>
            </footer>
          </form>
        )}
      </div>
      <Notice message={notice.notice} onClose={notice.dismiss} />
    </div>
  )
}
