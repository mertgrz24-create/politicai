import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Brand, Banner } from '@/components/ui/Primitives'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await signIn(email, password)
      if (result.error) setError(result.error)
      else navigate('/', { replace: true })
    } catch {
      setError('Giriş yapılamadı. Bağlantını kontrol edip tekrar dene.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="pa-app pa-login">
      <div className="pa-login-story">
        <Brand />
        <div>
          <span className="pa-eyebrow">Kelimelerin bir karşılığı var.</span>
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
        <span className="pa-small">PoliticAI · İletişim çalışma alanı</span>
      </div>
      <main className="pa-login-form">
        <form onSubmit={handleSubmit}>
          <span className="pa-eyebrow">Yeniden merhaba</span>
          <h2>Çalışma alanına gir.</h2>
          <p>Gündemi ve inceleme bekleyen taslaklarını buradan takip et.</p>
          <label className="pa-field" htmlFor="login-email">
            E-posta adresi
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
              placeholder="ornek@mail.com"
              disabled={loading}
            />
          </label>
          <label className="pa-field" htmlFor="login-password">
            Şifre
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </label>
          {error && <Banner kind="error">{error}</Banner>}
          <button className="pa-button" type="submit" disabled={loading}>
            {loading ? 'Giriş yapılıyor…' : 'Çalışma alanına gir'}
            {loading ? (
              <Loader2 className="pa-spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
          </button>
          <p className="pa-login-note">
            Taslaklar, sen onaylamadan yayınlanmaz.
          </p>
        </form>
      </main>
    </div>
  )
}
