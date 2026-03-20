import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, CheckSquare, Filter, Tag, Calendar } from 'lucide-react'

const STATUSES = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'review', label: 'Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-600' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-red-500' },
]

function StatusBadge({ status }) {
  const s = STATUSES.find(s => s.value === status) || STATUSES[0]
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
}

export default function TodoList() {
  const { user } = useAuth()
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTodos(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const addTodo = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from('todos').insert({
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
    })
    setForm({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '' })
    setAdding(false)
    setSaving(false)
    load()
  }

  const updateStatus = async (id, status) => {
    await supabase.from('todos').update({ status }).eq('id', id)
    setTodos(todos.map(t => t.id === id ? { ...t, status } : t))
  }

  const deleteTodo = async (id) => {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(todos.filter(t => t.id !== id))
  }

  const filtered = filterStatus === 'all' ? todos : todos.filter(t => t.status === filterStatus)

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = todos.filter(t => t.status === s.value).length
    return acc
  }, {})

  const priorityColor = (p) => PRIORITIES.find(x => x.value === p)?.color || 'text-gray-400'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">To-Do List</h1>
          <p className="text-sm text-gray-500 mt-0.5">{todos.length} tasks total</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(filterStatus === s.value ? 'all' : s.value)}
            className={`card p-3 text-left transition-all hover:shadow-md ${filterStatus === s.value ? 'ring-2 ring-primary-400' : ''}`}
          >
            <p className="text-xl font-bold text-gray-900">{counts[s.value] || 0}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="card mb-6 border-primary-200 bg-primary-50/30">
          <h3 className="font-semibold text-gray-900 mb-4">New Task</h3>
          <div className="space-y-3">
            <input
              autoFocus
              placeholder="Task title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
              onKeyDown={e => e.key === 'Enter' && addTodo()}
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="textarea"
              rows={2}
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input">
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={addTodo} disabled={saving || !form.title.trim()} className="btn-primary">
                {saving ? 'Saving...' : 'Add Task'}
              </button>
              <button onClick={() => { setAdding(false); setForm({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '' }) }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Filter:</span>
        <button
          onClick={() => setFilterStatus('all')}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterStatus === 'all' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({todos.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterStatus === s.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s.label} ({counts[s.value] || 0})
          </button>
        ))}
      </div>

      {/* Todo list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <CheckSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">
            {filterStatus === 'all' ? 'No tasks yet. Add your first task!' : `No tasks with status "${STATUSES.find(s => s.value === filterStatus)?.label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(todo => (
            <div
              key={todo.id}
              className={`card py-4 flex items-start gap-4 transition-all hover:shadow-md ${todo.status === 'done' ? 'opacity-70' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusBadge status={todo.status} />
                  <span className={`text-xs font-medium ${priorityColor(todo.priority)}`}>
                    {PRIORITIES.find(p => p.value === todo.priority)?.label} priority
                  </span>
                  {todo.due_date && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due {new Date(todo.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className={`font-medium text-gray-900 ${todo.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                  {todo.title}
                </p>
                {todo.description && (
                  <p className="text-sm text-gray-500 mt-1">{todo.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Created {new Date(todo.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={todo.status}
                  onChange={e => updateStatus(todo.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
                >
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
