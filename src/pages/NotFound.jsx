import { Link } from 'react-router-dom'
import { Home, Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center page-enter">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/40 dark:to-indigo-900/40 rounded-3xl mb-6">
          <Compass className="w-10 h-10 text-primary-600 dark:text-primary-400" />
        </div>
        <p className="text-8xl font-black gradient-text mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Page not found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
          Looks like this route doesn't exist. Head back to your dashboard and keep shipping.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-500 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-indigo-600 transition-all shadow-sm hover:shadow-primary-500/30 hover:shadow-md"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
