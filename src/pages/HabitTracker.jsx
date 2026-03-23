import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Check, Trophy, Archive, Edit3, X, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'

const EMOJIS = ['✅','💪','📚','🏃','🧘','💧','🍎','😴','💻','✍️','🎯','🔥','⭐','🎵','🌿','🧠','🤸','🚴','🏋️','🧹','🌅','🙏','📝','🎨']

const COLORS = {
  blue:   { swatch: 'bg-blue-500',   cell: 'bg-blue-400 dark:bg-blue-500',   light: 'bg-blue-50 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-400',   ring: 'ring-blue-400' },
  green:  { swatch: 'bg-green-500',  cell: 'bg-green-400 dark:bg-green-500',  light: 'bg-green-50 dark:bg-green-900/30',  text: 'text-green-600 dark:text-green-400',  ring: 'ring-green-400' },
  purple: { swatch: 'bg-purple-500', cell: 'bg-purple-400 dark:bg-purple-500', light: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-400' },
  orange: { swatch: 'bg-orange-500', cell: 'bg-orange-400 dark:bg-orange-500', light: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-400' },
  red:    { swatch: 'bg-red-500',    cell: 'bg-red-400 dark:bg-red-500',    light: 'bg-red-50 dark:bg-red-900/30',    text: 'text-red-600 dark:text-red-400',    ring: 'ring-red-400' },
  pink:   { swatch: 'bg-pink-500',   cell: 'bg-pink-400 dark:bg-pink-500',   light: 'bg-pink-50 dark:bg-pink-900/30',   text: 'text-pink-600 dark:text-pink-400',   ring: 'ring-pink-400' },
  yellow: { swatch: 'bg-yellow-400', cell: 'bg-yellow-300 dark:bg-yellow-500', light: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-400' },
  teal:   { swatch: 'bg-teal-500',   cell: 'bg-teal-400 dark:bg-teal-500',   light: 'bg-teal-50 dark:bg-teal-900/30',   text: 'text-teal-600 dark:text-teal-400',   ring: 'ring-teal-400' },
}

function dateStr(daysAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

const TODAY = dateStr(0)

function getStreak(dates) {
  if (!dates.length) return 0
  const sorted = [...dates].sort().reverse()
  if (sorted[0] !== TODAY && sorted[0] !== dateStr(1)) return 0
  let streak = 0
  let expected = sorted[0]
  for (const d of sorted) {
    if (d === expected) {
      streak++
      const prev = new Date(expected + 'T00:00:00')
      prev.setDate(prev.getDate() - 1)
      expected = prev.toISOString().split('T')[0]
    } else break
  }
  return streak
}

function getBestStreak(dates) {
  if (!dates.length) return 0
  const sorted = [...dates].sort()
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i] + 'T00:00:00') - new Date(sorted[i - 1] + 'T00:00:00')) / 86400000
    if (diff === 1) { cur++; best = Math.max(best, cur) }
    else cur = 1
  }
  return Math.max(best, cur)
}

function getRate(dates, days = 30) {
  const cutoff = dateStr(days - 1)
  return Math.round((dates.filter(d => d >= cutoff).length / days) * 100)
}

function Heatmap({ dates, color }) {
  const logSet = new Set(dates)
  const cells = Array.from({ length: 84 }, (_, i) => {
    const d = dateStr(83 - i)
    return { date: d, done: logSet.has(d), future: d > TODAY }
  })
  const weeks = []
  for (let i = 0; i < 84; i += 7) weeks.push(cells.slice(i, i + 7))
  const c = COLORS[color] || COLORS.blue
  return (
    <div className="flex gap-0.5 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {week.map((cell, di) => (
            <div
              key={di}
              title={`${cell.date}${cell.done ? ' ✓' : ''}`}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] flex-shrink-0 transition-colors ${
                cell.done ? c.cell : 'bg-gray-100 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function HabitTracker() {
  const { user } = useAuth()
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('today')
  const [expanded, setExpanded] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', emoji: '✅', color: 'blue' })
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState({})

  const load = useCallback(async () => {
    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('archived', false).order('created_at'),
      supabase.from('habit_logs').select('habit_id, completed_date').eq('user_id', user.id).gte('completed_date', dateStr(89)),
    ])
    setHabits(habitsRes.data || [])
    setLogs(logsRes.data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const logsFor = (habitId) => logs.filter(l => l.habit_id === habitId).map(l => l.completed_date)
  const todayDone = (habitId) => logs.some(l => l.habit_id === habitId && l.completed_date === TODAY)

  const toggleToday = async (habit) => {
    if (toggling[habit.id]) return
    setToggling(t => ({ ...t, [habit.id]: true }))
    const done = todayDone(habit.id)
    if (done) {
      await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('completed_date', TODAY)
      setLogs(prev => prev.filter(l => !(l.habit_id === habit.id && l.completed_date === TODAY)))
    } else {
      await supabase.from('habit_logs').upsert({ habit_id: habit.id, user_id: user.id, completed_date: TODAY })
      setLogs(prev => [...prev, { habit_id: habit.id, completed_date: TODAY }])
    }
    setToggling(t => ({ ...t, [habit.id]: false }))
  }

  const saveHabit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { user_id: user.id, name: form.name.trim(), description: form.description.trim() || null, emoji: form.emoji, color: form.color }
    if (editingHabit) {
      await supabase.from('habits').update(payload).eq('id', editingHabit.id)
    } else {
      await supabase.from('habits').insert(payload)
    }
    setSaving(false)
    closeForm()
    load()
  }

  const archiveHabit = async (id) => {
    if (!confirm('Archive this habit? You can still see your logs.')) return
    await supabase.from('habits').update({ archived: true }).eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  const openEdit = (habit) => {
    setForm({ name: habit.name, description: habit.description || '', emoji: habit.emoji, color: habit.color })
    setEditingHabit(habit)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingHabit(null)
    setForm({ name: '', description: '', emoji: '✅', color: 'blue' })
  }

  const doneToday = habits.filter(h => todayDone(h.id)).length
  const progress = habits.length ? Math.round((doneToday / habits.length) * 100) : 0

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Habit <span className="gradient-text">Tracker</span></h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Build streaks. Stay consistent. Win every day.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Habit</span>
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl mb-5 sm:mb-6 w-fit">
        {[['today', "Today's Habits"], ['all', 'All Habits']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              view === v ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : habits.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-4">🌱</div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">No habits yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Create your first habit to start building consistency</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Add Your First Habit
          </button>
        </div>
      ) : view === 'today' ? (
        <>
          {/* Progress */}
          <div className="card mb-5 sm:mb-6 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">Today's Progress</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{doneToday} / {habits.length} <span className="font-normal text-gray-400">({progress}%)</span></p>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {doneToday === habits.length && habits.length > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">🎉 All habits done! Amazing work today!</p>
            )}
          </div>

          {/* Habit cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {habits.map(habit => {
              const done = todayDone(habit.id)
              const streak = getStreak(logsFor(habit.id))
              const c = COLORS[habit.color] || COLORS.blue
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleToday(habit)}
                  disabled={toggling[habit.id]}
                  className={`card p-4 sm:p-5 text-left transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-70 ${
                    done ? `border-2 ${c.ring} ring-1 ${c.light}` : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl leading-none">{habit.emoji}</span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      done ? c.swatch : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {done && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <p className={`font-semibold mb-0.5 text-left ${done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {habit.name}
                  </p>
                  {habit.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1 text-left">{habit.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">
                      {streak > 0 ? `🔥 ${streak} day${streak > 1 ? 's' : ''}` : '—'}
                    </span>
                    <span className={`text-xs font-medium ${done ? c.text : 'text-gray-400 dark:text-gray-500'}`}>
                      {done ? 'Done ✓' : 'Tap to complete'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        /* All habits */
        <div className="space-y-3 sm:space-y-4">
          {habits.map(habit => {
            const habitLogs = logsFor(habit.id)
            const streak = getStreak(habitLogs)
            const best = getBestStreak(habitLogs)
            const rate = getRate(habitLogs)
            const c = COLORS[habit.color] || COLORS.blue
            const isExpanded = expanded[habit.id]
            const done = todayDone(habit.id)
            return (
              <div key={habit.id} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${c.light}`}>
                    {habit.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{habit.name}</p>
                          {done && <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Done</span>}
                        </div>
                        {habit.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{habit.description}</p>}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={() => openEdit(habit)} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => archiveHabit(habit.id)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors" title="Archive">
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setExpanded(e => ({ ...e, [habit.id]: !e[habit.id] }))} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 sm:gap-5 mt-2 flex-wrap">
                      <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">🔥 {streak} streak</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Trophy className="w-3 h-3 text-yellow-500" /> {best} best
                      </span>
                      <span className={`text-xs font-medium ${c.text} flex items-center gap-0.5`}>
                        <BarChart2 className="w-3 h-3" /> {rate}% / 30d
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{habitLogs.length} total</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last 12 weeks</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-[2px] bg-gray-100 dark:bg-gray-700 inline-block" /> Miss
                        <span className={`w-2.5 h-2.5 rounded-[2px] ${c.cell} inline-block`} /> Done
                      </div>
                    </div>
                    <Heatmap dates={habitLogs} color={habit.color} />
                    <button
                      onClick={() => toggleToday(habit)}
                      className={`mt-4 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
                        done
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          : `${c.light} ${c.text} hover:opacity-80`
                      }`}
                    >
                      {done ? 'Mark Incomplete' : 'Mark Done Today'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeForm} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{editingHabit ? 'Edit Habit' : 'New Habit'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Habit Name *</label>
                <input
                  autoFocus
                  placeholder="e.g. Morning run, Read 30 mins..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveHabit()}
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Description (optional)</label>
                <input
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input"
                />
              </div>

              {/* Emoji picker */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Icon</label>
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, emoji: em }))}
                      className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                        form.emoji === em ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(COLORS).map(([name, c]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: name }))}
                      className={`w-8 h-8 rounded-full ${c.swatch} transition-all ${
                        form.color === name ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-gray-500 scale-110' : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className={`flex items-center gap-3 p-3 rounded-xl ${(COLORS[form.color] || COLORS.blue).light}`}>
                <span className="text-2xl">{form.emoji}</span>
                <p className={`font-semibold ${(COLORS[form.color] || COLORS.blue).text}`}>{form.name || 'Habit name'}</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={saveHabit} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                  {saving ? 'Saving...' : (editingHabit ? 'Update Habit' : 'Create Habit')}
                </button>
                <button onClick={closeForm} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
