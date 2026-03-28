import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  Timer,
  CheckSquare,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Calendar,
  Flame,
  Mic,
  Wind,
  Sparkles,
} from 'lucide-react'
import FunFact from '../components/FunFact'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ todos: 0, completedTodos: 0, journals: 0, pomodoroSessions: 0, breatheSessions: 0 })
  const [recentTodos, setRecentTodos] = useState([])
  const [loading, setLoading] = useState(true)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    async function load() {
      const [todosRes, journalsRes, pomodoroRes, breatheRes] = await Promise.all([
        supabase.from('todos').select('id, title, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('pomodoro_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('breathe_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      const todos = todosRes.data || []
      setRecentTodos(todos)
      setStats({
        todos: todos.length,
        completedTodos: todos.filter(t => t.status === 'done').length,
        journals: journalsRes.count || 0,
        pomodoroSessions: pomodoroRes.count || 0,
        breatheSessions: breatheRes.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [user])

  const statCards = [
    {
      label: 'Total Tasks',
      value: stats.todos,
      icon: CheckSquare,
      gradient: 'from-primary-500 to-indigo-500',
      bg: 'from-primary-50 to-indigo-50 dark:from-primary-900/30 dark:to-indigo-900/30',
      text: 'text-primary-700 dark:text-primary-300',
    },
    {
      label: 'Completed',
      value: stats.completedTodos,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'Journal Entries',
      value: stats.journals,
      icon: BookOpen,
      gradient: 'from-purple-500 to-fuchsia-500',
      bg: 'from-purple-50 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/30',
      text: 'text-purple-700 dark:text-purple-300',
    },
    {
      label: 'Focus Sessions',
      value: stats.pomodoroSessions,
      icon: Timer,
      gradient: 'from-orange-500 to-amber-500',
      bg: 'from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30',
      text: 'text-orange-700 dark:text-orange-300',
    },
    {
      label: 'Breathe Sessions',
      value: stats.breatheSessions,
      icon: Wind,
      gradient: 'from-cyan-500 to-teal-500',
      bg: 'from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/30',
      text: 'text-cyan-700 dark:text-cyan-300',
    },
  ]

  const tools = [
    {
      to: '/habits',
      icon: Flame,
      label: 'Habit Tracker',
      desc: 'Build daily consistency with streaks and progress tracking',
      color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
      stat: 'Track streaks',
      badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300',
    },
    {
      to: '/standup',
      icon: Mic,
      label: 'Daily Standup',
      desc: 'Auto-generate and share your daily standup update',
      color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
      stat: 'Auto-saves',
      badge: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    },
    {
      to: '/pomodoro',
      icon: Timer,
      label: 'Pomodoro Timer',
      desc: 'Deep focus with timed work sessions and break reminders',
      color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      stat: `${stats.pomodoroSessions} sessions`,
      badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    },
    {
      to: '/todos',
      icon: CheckSquare,
      label: 'Task Manager',
      desc: 'Manage tasks with custom statuses and priorities',
      color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      stat: `${stats.completedTodos} completed`,
      badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    },
    {
      to: '/journal',
      icon: BookOpen,
      label: 'Dev Journal',
      desc: 'Reflect on your day, log wins and learnings',
      color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      stat: `${stats.journals} entries`,
      badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    },
    {
      to: '/breathe',
      icon: Wind,
      label: 'Breathe',
      desc: 'Guided breathing to reset your focus and calm your mind',
      color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
      stat: `${stats.breatheSessions} sessions`,
      badge: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
    },
  ]

  const statusColors = {
    todo: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    in_progress: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    review: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    done: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    blocked: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300',
  }
  const statusLabels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done', blocked: 'Blocked' }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <p className="text-sm font-medium text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
          {greeting()},{' '}
          <span className="gradient-text">
            {user?.user_metadata?.full_name?.split(' ')[0] || 'Developer'}
          </span>{' '}
          👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Here's what's happening with your productivity today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, gradient, bg, text }) => (
          <div key={label} className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${bg} border border-transparent transition-transform duration-200 hover:-translate-y-0.5`}>
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} mb-3 shadow-sm`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className={`text-2xl sm:text-3xl font-extrabold ${text}`}>{loading ? '—' : value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Tools */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Your Tools</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{tools.length} tools</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {tools.map(({ to, icon: Icon, label, desc, color, stat, badge }) => (
          <Link
            key={to}
            to={to}
            className="card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col p-4 sm:p-5"
          >
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${color}`}>
              <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm sm:text-base">{label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 leading-relaxed">{desc}</p>
            <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>{stat}</span>
              <ArrowRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent todos */}
      {recentTodos.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Recent Tasks</h2>
            <Link to="/todos" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="card space-y-2 sm:space-y-3 p-4 sm:p-5">
            {recentTodos.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 sm:gap-3 py-1 min-w-0">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${statusColors[todo.status] || statusColors.todo}`}>
                  {statusLabels[todo.status] || todo.status}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{todo.title}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 hidden sm:block">
                  {new Date(todo.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <FunFact />
    </div>
  )
}
