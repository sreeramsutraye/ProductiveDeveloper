import { useAuth } from '../context/AuthContext'
import { Code2, Timer, CheckSquare, BookOpen } from 'lucide-react'

const features = [
  { icon: Timer, label: 'Pomodoro Timer', desc: 'Stay focused with timed work sessions' },
  { icon: CheckSquare, label: 'To-Do List', desc: 'Track tasks with custom statuses' },
  { icon: BookOpen, label: 'Developer Journal', desc: 'Log your daily progress and thoughts' },
]

export default function Login() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-200">
            <Code2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ProductiveDeveloper</h1>
          <p className="text-gray-500 mt-2">Your all-in-one developer productivity suite</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to access your workspace</p>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            By signing in, you agree to our terms of service
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white/70 backdrop-blur rounded-xl p-3 text-center border border-gray-100">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Icon className="w-4 h-4 text-primary-600" />
              </div>
              <p className="text-xs font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
