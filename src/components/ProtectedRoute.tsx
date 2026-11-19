import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { ReactElement } from 'react'
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="pa-app pa-empty" role="status">
        <p>Çalışma alanı açılıyor…</p>
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  return children
}
