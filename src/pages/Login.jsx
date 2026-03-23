import { useAuth } from '../context/AuthContext'
import { Code2, Timer, CheckSquare, BookOpen, Flame, Mic, Zap } from 'lucide-react'

const features = [
  { icon: Flame,      label: 'Habit Tracker',   desc: 'Build streaks & daily consistency' },
  { icon: Mic,        label: 'Daily Standup',    desc: 'Auto-generate team updates' },
  { icon: Timer,      label: 'Pomodoro Timer',   desc: 'Deep focus with timed sessions' },
  { icon: CheckSquare,label: 'Task Manager',     desc: 'Track tasks with custom statuses' },
  { icon: BookOpen,   label: 'Dev Journal',      desc: 'Reflect & log your daily wins' },
  { icon: Zap,        label: 'Quick Stats',      desc: 'At-a-glance productivity dashboard' },
]

export default function Login() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-80 h-80 bg-primary-700/30 rounded-full blur-3xl pointer-events-none animate-glow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl pointer-events-none animate-glow" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-lg page-enter">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl mb-5 shadow-2xl shadow-primary-900/60 animate-float">
            <Code2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-none mb-3">
            Code Better.<br />
            <span className="bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
              Ship Faster.
            </span>
          </h1>
          <p className="text-gray-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
            The all-in-one productivity suite built for developers who ship.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-gray-400 mb-6">Sign in to access your workspace</p>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 rounded-xl font-semibold text-gray-800 shadow-lg"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-gray-600 text-center mt-5">
            By signing in, you agree to our terms of service
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2 hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500/30 to-indigo-500/30 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
