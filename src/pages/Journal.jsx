import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp, Edit3, Save, X } from 'lucide-react'

const MOODS = [
  { value: 'great', emoji: '🚀', label: 'Great' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
  { value: 'stressed', emoji: '😤', label: 'Stressed' },
]

const TAGS = ['bug-fix', 'feature', 'learning', 'meeting', 'review', 'deployment', 'idea', 'blocked']

export default function Journal() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [editing, setEditing] = useState(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    mood: 'good',
    tags: [],
    what_went_well: '',
    what_to_improve: '',
  })

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const saveEntry = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      content: form.content.trim(),
      mood: form.mood,
      tags: form.tags,
      what_went_well: form.what_went_well.trim() || null,
      what_to_improve: form.what_to_improve.trim() || null,
    }
    if (editing) {
      await supabase.from('journal_entries').update(payload).eq('id', editing)
      setEditing(null)
    } else {
      await supabase.from('journal_entries').insert(payload)
      setAdding(false)
    }
    resetForm()
    load()
  }

  const deleteEntry = async (id) => {
    if (!confirm('Delete this journal entry?')) return
    await supabase.from('journal_entries').delete().eq('id', id)
    setEntries(entries.filter(e => e.id !== id))
  }

  const startEdit = (entry) => {
    setForm({
      title: entry.title,
      content: entry.content,
      mood: entry.mood || 'good',
      tags: entry.tags || [],
      what_went_well: entry.what_went_well || '',
      what_to_improve: entry.what_to_improve || '',
    })
    setEditing(entry.id)
    setAdding(true)
  }

  const resetForm = () => {
    setForm({ title: '', content: '', mood: 'good', tags: [], what_went_well: '', what_to_improve: '' })
    setEditing(null)
  }

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Dev <span className="gradient-text">Journal</span></h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Reflect, document wins, and grow every day.</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            <span>New Entry</span>
          </button>
        )}
      </div>

      {/* Entry form */}
      {adding && (
        <div className="card mb-5 sm:mb-6 border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-900/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
              {editing ? 'Edit Entry' : 'New Journal Entry'}
            </h3>
            <button onClick={() => { setAdding(false); resetForm() }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <input
              autoFocus
              placeholder="Entry title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="input"
            />

            {/* Mood */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">How are you feeling?</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setForm(f => ({ ...f, mood: m.value }))}
                    className={`flex flex-col items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl border transition-all flex-shrink-0 ${
                      form.mood === m.value
                        ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className="text-lg sm:text-xl">{m.emoji}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      form.tags.includes(tag)
                        ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="What did you work on today? *"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="textarea"
              rows={4}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">What went well?</label>
                <textarea
                  placeholder="Wins and achievements..."
                  value={form.what_went_well}
                  onChange={e => setForm(f => ({ ...f, what_went_well: e.target.value }))}
                  className="textarea"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">What to improve?</label>
                <textarea
                  placeholder="Areas to work on..."
                  value={form.what_to_improve}
                  onChange={e => setForm(f => ({ ...f, what_to_improve: e.target.value }))}
                  className="textarea"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveEntry}
                disabled={!form.title.trim() || !form.content.trim()}
                className="btn-primary"
              >
                <Save className="w-4 h-4" />
                {editing ? 'Update' : 'Save Entry'}
              </button>
              <button onClick={() => { setAdding(false); resetForm() }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-200 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 mb-1">No journal entries yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Start documenting your daily progress</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {entries.map(entry => {
            const mood = MOODS.find(m => m.value === entry.mood)
            const isExpanded = expanded[entry.id]
            return (
              <div key={entry.id} className="card hover:shadow-md transition-all p-4 sm:p-6">
                {/* Entry header */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {mood && <span title={mood.label}>{mood.emoji}</span>}
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{entry.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                    {entry.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(entry)} className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleExpand(entry.id)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isExpanded ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">{entry.content}</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.content}</p>
                    </div>
                    {(entry.what_went_well || entry.what_to_improve) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {entry.what_went_well && (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-1.5">What went well</p>
                            <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{entry.what_went_well}</p>
                          </div>
                        )}
                        {entry.what_to_improve && (
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                            <p className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-1.5">To improve</p>
                            <p className="text-sm text-orange-800 dark:text-orange-300 whitespace-pre-wrap">{entry.what_to_improve}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
