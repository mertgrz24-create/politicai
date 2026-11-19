import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { apiGet, apiPost } from '@/lib/api'

export interface AuthUser { email: string; sub: string; exp: number; client_id: string }
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  sessionError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}
const AuthContext = createContext<AuthContextType | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  useEffect(() => {
    localStorage.removeItem('politicai_token')
    let active = true
    void apiGet<{ user: AuthUser }>('/api/auth/me')
      .then(data => { if (active) setUser(data.user) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!user) return
    const timer = setTimeout(() => setUser(null), Math.max(0, user.exp * 1000 - Date.now()))
    return () => clearTimeout(timer)
  }, [user])
  async function signIn(email: string, password: string) {
    try {
      const data = await apiPost<{ user: AuthUser }>('/api/auth/login', { email, password })
      setUser(data.user)
      setSessionError(null)
      return { error: null }
    } catch (error) { return { error: error instanceof Error ? error.message : 'Giriş başarısız.' } }
  }
  async function signOut() {
    try {
      await apiPost('/api/auth/logout', {})
      setUser(null)
      setSessionError(null)
    } catch { setSessionError('Çıkış yapılamadı. Bağlantını kontrol edip tekrar dene.') }
  }
  return <AuthContext.Provider value={{ user, loading, signIn, signOut, sessionError }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider gerekli.')
  return context
}
