import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { decodeJwt } from 'jose'
import { apiPost, tokenStorage } from '@/lib/api'

export interface AuthUser {
  email: string
  sub: string
  exp: number
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function parseToken(token: string): AuthUser | null {
  try {
    const payload = decodeJwt(token)
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null
    return {
      email: String(payload.sub ?? ''),
      sub: String(payload.sub ?? ''),
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = tokenStorage.get()
    if (stored) {
      const decoded = parseToken(stored)
      if (decoded) {
        setUser(decoded)
        setToken(stored)
      } else {
        tokenStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const res = await apiPost<{ token: string; expires_at: string }>(
        '/webhook/auth/login',
        { email, password },
        false,
      )
      const decoded = parseToken(res.token)
      if (!decoded) return { error: 'Geçersiz token alındı.' }
      tokenStorage.set(res.token)
      setToken(res.token)
      setUser(decoded)
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Giriş başarısız.' }
    }
  }

  const signOut = () => {
    tokenStorage.clear()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
