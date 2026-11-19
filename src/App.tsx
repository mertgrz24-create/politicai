import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import NewsPage from '@/pages/NewsPage'
import QueuePage from '@/pages/QueuePage'
import PersonaFormPage from '@/pages/PersonaFormPage'
import HistoryPage from '@/pages/HistoryPage'
import { EmptyState } from '@/components/ui/Primitives'

const DesignPreview = import.meta.env.DEV
  ? lazy(() => import('@/design-preview/DesignPreview'))
  : null
const router = createBrowserRouter([
  ...(DesignPreview
    ? [
        {
          path: '/design-preview',
          element: (
            <Suspense
              fallback={<p role="status">Tasarım önizlemesi yükleniyor…</p>}
            >
              <DesignPreview />
            </Suspense>
          ),
        },
      ]
    : []),
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'news', element: <NewsPage /> },
      { path: 'queue', element: <QueuePage /> },
      { path: 'settings/persona', element: <PersonaFormPage /> },
      { path: 'history', element: <HistoryPage /> },
      {
        path: '*',
        element: (
          <EmptyState
            title="Bu sayfa bulunamadı"
            description="Çalışma alanına dönerek gündemi ve taslaklarını inceleyebilirsin."
            action={
              <Link className="pa-button" to="/">
                Günlük özete dön
              </Link>
            }
          />
        ),
      },
    ],
  },
])
export default function App() {
  return <RouterProvider router={router} />
}
