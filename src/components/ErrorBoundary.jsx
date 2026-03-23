import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl mb-5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            An unexpected error occurred. Try refreshing the page — if it keeps happening, contact support.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl p-4 mb-6 overflow-auto max-h-40">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-500 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-indigo-600 transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
