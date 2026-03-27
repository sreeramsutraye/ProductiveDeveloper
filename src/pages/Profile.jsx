import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getStreak, COLORS, dateStr } from '../lib/habits'
import ProfileSetup from '../components/ProfileSetup'
import {
  Sun, Moon, LogOut, Edit2, Timer, BookOpen,
  Flame, Wind, Users, Zap, Camera
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [stats, setStats]     = useState(null)
  const [habits, setHabits]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [statsRes, habitsRes, logsRes] = await Promise.all([
        supabase.rpc('get_user_stats', { target_user_id: user.id }),
        supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false).order('created_at'),
        supabase.from('habit_logs').select('habit_id, completed_date')
          .eq('user_id', user.id).gte('completed_date', dateStr(89)),
      ])

      const logsByHabit = {}
      for (const log of logsRes.data || []) {
        if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = []
        logsByHabit[log.habit_id].push(log.completed_date)
      }

      setStats(statsRes.data)
      setHabits((habitsRes.data || []).map(h => ({
        ...h,
        streak: getStreak(logsByHabit[h.id] || []),
      })))
      setLoading(false)
    }
    load()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleEditClose = async () => {
    setEditing(false)
    await refreshProfile()
  }

  if (!profile) return null

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name)}&background=7c3aed&color=fff&size=200`
  const maxStreak = habits.length ? Math.max(...habits.map(h => h.streak)) : 0

  return (
    <div className="max-w-2xl mx-auto page-enter">

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Edit Profile</h2>
            <ProfileSetup editMode onClose={handleEditClose} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-start gap-4 sm:gap-6 mb-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={profile.avatar_url || fallback}
              alt={profile.display_name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-primary-100 dark:ring-primary-900/50 shadow-lg"
              onError={(e) => { e.target.src = fallback }}
            />
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center shadow-md">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
                {profile.display_name}
              </h1>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
              >
                <Edit2 className="w-3 h-3" />Edit
              </button>
            </div>
            <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1">@{profile.username}</p>
            {profile.designation && (
              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium mb-2">
                {profile.designation}
              </span>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{profile.bio}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2">
          {[
            { label: 'Friends',    value: loading ? '—' : (stats?.friends_count ?? 0) },
            { label: 'Habits',     value: loading ? '—' : (stats?.habits_count ?? 0) },
            { label: 'Top Streak', value: loading ? '—' : (maxStreak > 0 ? `${maxStreak}d` : '—') },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center py-3 px-2">
              <p className="text-xl font-extrabold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity stats */}
      <div className="px-4 sm:px-6 mb-6">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Activity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Focus Sessions',  value: stats?.pomodoro_count,   icon: Timer,    color: 'text-orange-500' },
            { label: 'Breathe',         value: stats?.breathe_count,    icon: Wind,     color: 'text-cyan-500' },
            { label: 'Journal Entries', value: stats?.journals_count,   icon: BookOpen, color: 'text-purple-500' },
            { label: 'Habit Check-ins', value: stats?.habit_logs_total, icon: Zap,      color: 'text-emerald-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-3 sm:p-4">
              <Icon className={`w-5 h-5 mb-1.5 ${color}`} />
              <p className="text-xl font-extrabold text-gray-900 dark:text-gray-100">{loading ? '—' : (value ?? 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Habits grid */}
      <div className="px-4 sm:px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Habits</h2>
          <span className="text-xs text-gray-400">{habits.length} active</span>
        </div>
        {habits.length === 0 ? (
          <div className="card p-6 text-center">
            <Flame className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No habits yet — start building your streaks!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {habits.map(h => {
              const c = COLORS[h.color] || COLORS.blue
              return (
                <div key={h.id} className={`card p-4 ${c.light}`}>
                  <div className="text-2xl mb-2">{h.emoji}</div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">{h.name}</p>
                  {h.streak > 0 ? (
                    <p className={`text-xs font-semibold mt-1 ${c.text}`}>🔥 {h.streak} day streak</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">No streak yet</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Preferences & sign out */}
      <div className="px-4 sm:px-6 pb-10 space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Preferences</h2>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors"
        >
          {theme === 'dark'
            ? <Sun className="w-5 h-5 text-yellow-400" />
            : <Moon className="w-5 h-5 text-indigo-500" />}
          {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </button>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
