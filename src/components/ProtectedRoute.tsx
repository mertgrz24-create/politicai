import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { ReactElement } from 'react'

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Yükleniyor...</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}
