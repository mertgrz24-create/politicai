import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import NewsPage from '@/pages/NewsPage'
import QueuePage from '@/pages/QueuePage'
import PersonaFormPage from '@/pages/PersonaFormPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="settings/persona" element={<PersonaFormPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
