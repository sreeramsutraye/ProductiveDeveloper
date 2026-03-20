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
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ todos: 0, completedTodos: 0, journals: 0, pomodoroSessions: 0 })
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
      const [todosRes, journalsRes, pomodoroRes] = await Promise.all([
        supabase.from('todos').select('id, title, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('pomodoro_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      const todos = todosRes.data || []
      setRecentTodos(todos)
      setStats({
        todos: todos.length,
        completedTodos: todos.filter(t => t.status === 'done').length,
        journals: journalsRes.count || 0,
        pomodoroSessions: pomodoroRes.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [user])

  const tools = [
    {
      to: '/pomodoro',
      icon: Timer,
      label: 'Pomodoro Timer',
      desc: 'Focus with timed work sessions',
      color: 'bg-orange-50 text-orange-600',
      stat: `${stats.pomodoroSessions} sessions`,
    },
    {
      to: '/todos',
      icon: CheckSquare,
      label: 'To-Do List',
      desc: 'Manage tasks and track progress',
      color: 'bg-green-50 text-green-600',
      stat: `${stats.completedTodos} completed`,
    },
    {
      to: '/journal',
      icon: BookOpen,
      label: 'Dev Journal',
      desc: 'Log your daily progress',
      color: 'bg-purple-50 text-purple-600',
      stat: `${stats.journals} entries`,
    },
  ]

  const statusColors = {
    todo: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-600',
  }
  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || 'Developer'} 👋
        </h1>
        <p className="text-gray-500 mt-1 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tasks', value: stats.todos, icon: CheckSquare, color: 'text-primary-600' },
          { label: 'Completed', value: stats.completedTodos, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Journal Entries', value: stats.journals, icon: BookOpen, color: 'text-purple-600' },
          { label: 'Pomodoro Sessions', value: stats.pomodoroSessions, icon: Timer, color: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center">
            <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
            <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tools grid */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Tools</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {tools.map(({ to, icon: Icon, label, desc, color, stat }) => (
          <Link
            key={to}
            to={to}
            className="card hover:shadow-md transition-all group flex flex-col"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{label}</h3>
            <p className="text-sm text-gray-500 flex-1">{desc}</p>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
              <span className="text-xs text-gray-400">{stat}</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent todos */}
      {recentTodos.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            <Link to="/todos" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="card space-y-3">
            {recentTodos.map(todo => (
              <div key={todo.id} className="flex items-center gap-3 py-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[todo.status] || statusColors.todo}`}>
                  {statusLabels[todo.status] || todo.status}
                </span>
                <span className="text-sm text-gray-700 flex-1 truncate">{todo.title}</span>
                <span className="text-xs text-gray-400">
                  {new Date(todo.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
