import { Link } from 'react-router-dom'
import { Inbox, Newspaper } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="max-w-xs text-center">
        <h1 className="mb-2 text-lg font-semibold text-white">PoliticAI</h1>
        <p className="mb-6 text-sm text-gray-500">
          Metrikler ve özet istatistikler Faz 6'da burada olacak.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/news"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <Newspaper size={14} />
            Haberleri Gör &amp; Tweet Üret
          </Link>
          <Link
            to="/queue"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-700"
          >
            <Inbox size={14} />
            Onay Kuyruğu
          </Link>
        </div>
      </div>
    </div>
  )
}
