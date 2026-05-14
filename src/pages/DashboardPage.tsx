import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="max-w-xs text-center">
        <h1 className="mb-2 text-lg font-semibold text-white">Dashboard</h1>
        <p className="mb-6 text-sm text-gray-500">
          Onay kuyruğu ve metrikler Faz 3–4'te burada olacak.
        </p>
        <Link
          to="/settings/persona"
          className="inline-flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
        >
          <Settings size={14} />
          Persona Ayarlarını Yapılandır
        </Link>
      </div>
    </div>
  )
}
