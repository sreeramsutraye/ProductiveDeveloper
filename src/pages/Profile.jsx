import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { Sun, Moon, Mail, Calendar, LogOut, Timer, CheckSquare, BookOpen, TrendingUp, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ todos: 0, completedTodos: 0, journals: 0, pomodoroSessions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [todosRes, completedRes, journalsRes, pomodoroRes] = await Promise.all([
        supabase.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'done'),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('pomodoro_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      setStats({
        todos: todosRes.count || 0,
        completedTodos: completedRes.count || 0,
        journals: journalsRes.count || 0,
        pomodoroSessions: pomodoroRes.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const statCards = [
    { label: 'Total Tasks', value: stats.todos, icon: CheckSquare, gradient: 'from-primary-500 to-indigo-500', bg: 'from-primary-50 to-indigo-50 dark:from-primary-900/30 dark:to-indigo-900/30', text: 'text-primary-700 dark:text-primary-300' },
    { label: 'Completed', value: stats.completedTodos, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', bg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
    { label: 'Journal Entries', value: stats.journals, icon: BookOpen, gradient: 'from-purple-500 to-fuchsia-500', bg: 'from-purple-50 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/30', text: 'text-purple-700 dark:text-purple-300' },
    { label: 'Focus Sessions', value: stats.pomodoroSessions, icon: Timer, gradient: 'from-orange-500 to-amber-500', bg: 'from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30', text: 'text-orange-700 dark:text-orange-300' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto page-enter">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">Account</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Your <span className="gradient-text">Profile</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Avatar + info card */}
      <div className="card mb-5 p-5 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative flex-shrink-0">
            <img
              src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'U')}&background=7c3aed&color=fff&size=96`}
              alt="Avatar"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-primary-200 dark:ring-primary-800"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white dark:border-gray-800" title="Active" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </h2>
            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
            {memberSince && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-1">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                Member since {memberSince}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Productivity Stats</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map(({ label, value, icon: Icon, gradient, bg, text }) => (
          <div key={label} className={`rounded-2xl p-4 bg-gradient-to-br ${bg} transition-transform duration-200 hover:-translate-y-0.5`}>
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} mb-2.5 shadow-sm`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className={`text-2xl font-extrabold ${text}`}>{loading ? '—' : value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Preferences */}
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Preferences</p>
      <div className="card mb-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Appearance</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Currently in <span className="font-medium capitalize">{theme}</span> mode
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all active:scale-95 font-medium text-sm flex-shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-all active:scale-95"
      >
        <LogOut className="w-4 h-4" />
        Sign out of workspace
      </button>
    </div>
  )
}
