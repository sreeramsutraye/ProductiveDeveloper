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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Journal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Document your daily progress and learnings</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        )}
      </div>

      {/* Entry form */}
      {adding && (
        <div className="card mb-6 border-purple-200 bg-purple-50/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{editing ? 'Edit Entry' : 'New Journal Entry'}</h3>
            <button onClick={() => { setAdding(false); resetForm() }} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-500" />
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
              <label className="text-xs text-gray-500 mb-2 block">How are you feeling?</label>
              <div className="flex gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setForm(f => ({ ...f, mood: m.value }))}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all ${
                      form.mood === m.value
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-xs text-gray-600">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      form.tags.includes(tag)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
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
              rows={5}
            />

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">What went well?</label>
                <textarea
                  placeholder="Wins and achievements..."
                  value={form.what_went_well}
                  onChange={e => setForm(f => ({ ...f, what_went_well: e.target.value }))}
                  className="textarea"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">What to improve?</label>
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
                {editing ? 'Update Entry' : 'Save Entry'}
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
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">No journal entries yet</p>
          <p className="text-sm text-gray-400">Start documenting your daily progress</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => {
            const mood = MOODS.find(m => m.value === entry.mood)
            const isExpanded = expanded[entry.id]
            return (
              <div key={entry.id} className="card hover:shadow-md transition-all">
                {/* Entry header */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {mood && <span title={mood.label}>{mood.emoji}</span>}
                      <p className="font-semibold text-gray-900">{entry.title}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString('en-US', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </p>
                    {entry.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(entry)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleExpand(entry.id)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Preview or full content */}
                {!isExpanded ? (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{entry.content}</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                    </div>
                    {(entry.what_went_well || entry.what_to_improve) && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {entry.what_went_well && (
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1.5">What went well</p>
                            <p className="text-sm text-green-800 whitespace-pre-wrap">{entry.what_went_well}</p>
                          </div>
                        )}
                        {entry.what_to_improve && (
                          <div className="bg-orange-50 rounded-xl p-3">
                            <p className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1.5">To improve</p>
                            <p className="text-sm text-orange-800 whitespace-pre-wrap">{entry.what_to_improve}</p>
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
