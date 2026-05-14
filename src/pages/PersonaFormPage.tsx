import { useState, useEffect, KeyboardEvent } from 'react'
import { X, Plus, Save, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'
import type { Persona, VoiceExample } from '@/types'

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID

const DEFAULT_PERSONA: Omit<Persona, 'id' | 'client_id' | 'created_at' | 'updated_at'> = {
  identity: 'Muhafazakâr Türk Siyasetçi',
  ideology: 'conservative',
  themes: ['ekonomi', 'aile', 'güvenlik', 'şehir hizmetleri', 'eğitim'],
  banned_words: ['laik', 'darbeci', 'terörist', 'provokatör'],
  banned_topics: ['din karşıtı içerik', 'parti içi çatışma', 'rakip aday isimleri'],
  address_form: 'Aziz milletim',
  voice_examples: [
    { tone: 'sert', example: 'Bu millet teslim olmaz! Ekonomimize yönelik saldırılara karşı dik durmak millete borcumuzdur.' },
    { tone: 'uzlasmaci', example: 'Ülkemizin geleceği için birlik ve beraberlik şart. Her vatandaşımızın refahı bizim önceliğimizdir.' },
    { tone: 'espriyle', example: 'Muhalefet yine çöküyor dedi, biz yine çalışmaya devam ettik. Sonuçlar ortada.' },
  ],
  reference_prompt:
    "You are a professional social media manager for a conservative, religious, and pro-government Turkish politician. Your task is to write Twitter posts in Turkish about current events. The politician's style: formal yet accessible, uses religious references occasionally, focuses on national unity and economic development, defends government policies while acknowledging challenges, never attacks opponents personally but can criticize policies. Rules: max 280 chars, no hashtag spam (max 2), no emojis unless natural, factual basis required, no speculation.",
  max_chars: 280,
  daily_tweet_count: 3,
}

// --- TagInput ---
interface TagInputProps {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}

function TagInput({ label, values, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setDraft('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">{label}</label>
      <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-md border border-gray-700 bg-gray-800/60 px-2.5 py-2 focus-within:border-gray-500">
        {values.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== tag))}
              className="text-gray-400 hover:text-gray-200"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-gray-600">Enter veya virgül ile ekle</p>
    </div>
  )
}

// --- VoiceExampleEditor ---
interface VoiceExampleEditorProps {
  examples: VoiceExample[]
  onChange: (v: VoiceExample[]) => void
}

const TONE_LABELS: Record<VoiceExample['tone'], string> = {
  sert: 'Sert',
  uzlasmaci: 'Uzlaşmacı',
  espriyle: 'Espriyle',
}

const TONE_COLORS: Record<VoiceExample['tone'], string> = {
  sert: 'bg-red-900/40 text-red-300 border-red-800/60',
  uzlasmaci: 'bg-green-900/40 text-green-300 border-green-800/60',
  espriyle: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/60',
}

function VoiceExampleEditor({ examples, onChange }: VoiceExampleEditorProps) {
  function update(index: number, field: keyof VoiceExample, value: string) {
    const next = examples.map((ex, i) =>
      i === index ? { ...ex, [field]: value } : ex
    )
    onChange(next)
  }

  function add() {
    onChange([...examples, { tone: 'sert', example: '' }])
  }

  function remove(index: number) {
    onChange(examples.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">
        Ses Örnekleri (Few-shot)
      </label>
      <div className="space-y-3">
        {examples.map((ex, i) => (
          <div key={i} className="rounded-md border border-gray-700 bg-gray-800/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <select
                value={ex.tone}
                onChange={(e) => update(i, 'tone', e.target.value as VoiceExample['tone'])}
                className="rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 outline-none focus:border-gray-500"
              >
                <option value="sert">Sert</option>
                <option value="uzlasmaci">Uzlaşmacı</option>
                <option value="espriyle">Espriyle</option>
              </select>
              <span className={`rounded border px-2 py-0.5 text-xs ${TONE_COLORS[ex.tone]}`}>
                {TONE_LABELS[ex.tone]}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-auto text-gray-600 hover:text-gray-400"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <textarea
              value={ex.example}
              onChange={(e) => update(i, 'example', e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Örnek tweet metni..."
              className="w-full resize-none rounded bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:ring-1 focus:ring-gray-600"
            />
            <p className="mt-1 text-right text-xs text-gray-600">{ex.example.length}/280</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300"
      >
        <Plus size={12} />
        Örnek Ekle
      </button>
    </div>
  )
}

// --- PersonaFormPage ---
type FormState = typeof DEFAULT_PERSONA

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function PersonaFormPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_PERSONA)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!CLIENT_ID) {
      setLoading(false)
      return
    }
    apiGet<Persona>(`/webhook/persona?client_id=${CLIENT_ID}`)
      .then((data) => {
        if (data?.identity) {
          const { identity, ideology, themes, banned_words, banned_topics,
                  address_form, voice_examples, reference_prompt,
                  max_chars, daily_tweet_count } = data
          setForm({
            identity, ideology, themes, banned_words, banned_topics,
            address_form: address_form ?? '',
            voice_examples: voice_examples ?? [],
            reference_prompt: reference_prompt ?? '',
            max_chars: max_chars ?? 280,
            daily_tweet_count: daily_tweet_count ?? 3,
          })
        }
      })
      .catch(() => {
        // Kayıt yoksa default değerler kalır — seed-client.sql henüz çalıştırılmamış olabilir
      })
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!CLIENT_ID) {
      setErrorMsg('VITE_CLIENT_ID .env dosyasında tanımlı değil.')
      setSaveStatus('error')
      return
    }
    setSaveStatus('saving')
    setErrorMsg('')
    try {
      await apiPost('/webhook/persona/upsert', { ...form, client_id: CLIENT_ID })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Kayıt başarısız.')
      setSaveStatus('error')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-6 py-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-6 mb-6 flex items-center justify-between border-b border-gray-800 bg-gray-950/95 px-6 py-3 backdrop-blur">
        <h1 className="font-semibold text-white">Persona Ayarları</h1>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 size={13} /> Kaydedildi
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={13} /> {errorMsg || 'Hata'}
            </span>
          )}
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 rounded-md bg-white px-4 py-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Kaydet
          </button>
        </div>
      </div>

      {!CLIENT_ID && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-800/60 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>VITE_CLIENT_ID</strong> .env dosyasında tanımlı değil.{' '}
            <code className="rounded bg-amber-900/40 px-1 py-0.5 text-xs">scripts/seed-client.sql</code>{' '}
            çalıştırıp dönen UUID'yi ekle.
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Kimlik */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">Kimlik / Unvan</label>
          <input
            value={form.identity}
            onChange={(e) => set('identity', e.target.value)}
            placeholder="ör: Bursa Büyükşehir Belediye Başkanı"
            className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-gray-500"
          />
        </div>

        {/* Hitap */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">Hitap Şekli</label>
          <input
            value={form.address_form ?? ''}
            onChange={(e) => set('address_form', e.target.value)}
            placeholder="ör: Aziz milletim"
            className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-gray-500"
          />
        </div>

        {/* Temalar */}
        <TagInput
          label="Gündem Temaları"
          values={form.themes}
          onChange={(v) => set('themes', v)}
          placeholder="ekonomi, aile, güvenlik..."
        />

        {/* Yasaklı kelimeler */}
        <TagInput
          label="Yasaklı Kelimeler"
          values={form.banned_words}
          onChange={(v) => set('banned_words', v)}
          placeholder="kelime ekle..."
        />

        {/* Yasaklı konular */}
        <TagInput
          label="Yasaklı Konular"
          values={form.banned_topics}
          onChange={(v) => set('banned_topics', v)}
          placeholder="konu ekle..."
        />

        {/* Tweet limitleri */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Maks. Karakter</label>
            <input
              type="number"
              min={1}
              max={280}
              value={form.max_chars}
              onChange={(e) => set('max_chars', Number(e.target.value))}
              className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-gray-200 outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Günlük Tweet Hedefi</label>
            <input
              type="number"
              min={1}
              max={17}
              value={form.daily_tweet_count}
              onChange={(e) => set('daily_tweet_count', Number(e.target.value))}
              className="w-full rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-gray-200 outline-none focus:border-gray-500"
            />
            <p className="mt-1 text-xs text-gray-600">Twitter Free tier: maks. 17/gün</p>
          </div>
        </div>

        {/* Ses örnekleri */}
        <VoiceExampleEditor
          examples={form.voice_examples}
          onChange={(v) => set('voice_examples', v)}
        />

        {/* Referans prompt */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-400">
            Referans Sistem Promptu
          </label>
          <textarea
            value={form.reference_prompt ?? ''}
            onChange={(e) => set('reference_prompt', e.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-gray-500"
          />
          <p className="mt-1 text-xs text-gray-600">
            Gemini/Claude için temel sistem promptu — twiter.json'daki orijinal prompt referans alınarak doldurulmuştur.
          </p>
        </div>
      </div>
    </form>
  )
}
