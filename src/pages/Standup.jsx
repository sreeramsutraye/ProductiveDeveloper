import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Copy, Check, ChevronDown, ChevronRight, Calendar, Zap, X } from 'lucide-react'

const FORMATS = [
  { key: 'plain', label: 'Plain Text' },
  { key: 'markdown', label: 'Markdown' },
  { key: 'slack', label: 'Slack' },
]

const SECTIONS = [
  { key: 'yesterday', label: 'Yesterday', emoji: '📅', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', placeholder: 'What did you complete?' },
  { key: 'today', label: 'Today', emoji: '🎯', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', placeholder: 'What will you work on?' },
  { key: 'blockers', label: 'Blockers', emoji: '🚧', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', placeholder: 'Any impediments?' },
]

function todayStr() { return new Date().toISOString().split('T')[0] }

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function newItem(text = '') { return { id: Math.random().toString(36).slice(2), text } }

const EMPTY_STANDUP = () => ({
  yesterday: [newItem()],
  today: [newItem()],
  blockers: [newItem()],
})

export default function Standup() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [standup, setStandup] = useState(EMPTY_STANDUP())
  const [standupId, setStandupId] = useState(null)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [format, setFormat] = useState('plain')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importTodos, setImportTodos] = useState([])
  const [selectedImport, setSelectedImport] = useState({})
  const saveTimer = useRef(null)
  const standupRef = useRef(standup)
  standupRef.current = standup

  const loadStandup = useCallback(async (d) => {
    clearTimeout(saveTimer.current)
    setSaveStatus('saved')
    const { data } = await supabase
      .from('standups').select('*').eq('user_id', user.id).eq('date', d).maybeSingle()

    if (data) {
      setStandupId(data.id)
      setStandup({
        yesterday: data.yesterday?.length ? data.yesterday : [newItem()],
        today: data.today?.length ? data.today : [newItem()],
        blockers: data.blockers?.length ? data.blockers : [newItem()],
      })
    } else {
      setStandupId(null)
      // Auto-fill Yesterday from previous day's Today
      const prev = new Date(d + 'T00:00:00')
      prev.setDate(prev.getDate() - 1)
      const prevStr = prev.toISOString().split('T')[0]
      const { data: prevData } = await supabase
        .from('standups').select('today').eq('user_id', user.id).eq('date', prevStr).maybeSingle()
      const prevItems = (prevData?.today || []).filter(i => i.text?.trim())
      setStandup({
        yesterday: prevItems.length ? prevItems.map(i => newItem(i.text)) : [newItem()],
        today: [newItem()],
        blockers: [newItem()],
      })
    }
  }, [user.id])

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('standups').select('id, date, yesterday, today, blockers')
      .eq('user_id', user.id).order('date', { ascending: false }).limit(14)
    setHistory(data || [])
  }, [user.id])

  useEffect(() => { loadStandup(date) }, [date, loadStandup])
  useEffect(() => { loadHistory() }, [loadHistory])

  const doSave = useCallback(async (data, id) => {
    setSaveStatus('saving')
    const payload = {
      user_id: user.id,
      date,
      yesterday: data.yesterday.filter(i => i.text.trim()),
      today: data.today.filter(i => i.text.trim()),
      blockers: data.blockers.filter(i => i.text.trim()),
      updated_at: new Date().toISOString(),
    }
    if (id) {
      await supabase.from('standups').update(payload).eq('id', id)
      setSaveStatus('saved')
    } else {
      const { data: res } = await supabase.from('standups').upsert({ ...payload }, { onConflict: 'user_id,date' }).select().single()
      if (res) setStandupId(res.id)
      setSaveStatus('saved')
    }
    loadHistory()
  }, [user.id, date, loadHistory])

  const scheduleSave = (updated) => {
    setSaveStatus('unsaved')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      doSave(updated, standupId)
    }, 1200)
  }

  const updateSection = (section, items) => {
    const updated = { ...standup, [section]: items }
    setStandup(updated)
    scheduleSave(updated)
  }

  const addItem = (section) => {
    updateSection(section, [...standup[section], newItem()])
  }

  const updateItem = (section, id, text) => {
    updateSection(section, standup[section].map(i => i.id === id ? { ...i, text } : i))
  }

  const removeItem = (section, id) => {
    const filtered = standup[section].filter(i => i.id !== id)
    updateSection(section, filtered.length ? filtered : [newItem()])
  }

  // Import from todos
  const openImport = async () => {
    const { data } = await supabase
      .from('todos').select('id, title, status')
      .eq('user_id', user.id)
      .in('status', ['done', 'in_progress', 'review'])
      .order('created_at', { ascending: false })
      .limit(20)
    setImportTodos(data || [])
    setSelectedImport({})
    setShowImport(true)
  }

  const applyImport = () => {
    const toYest = importTodos.filter(t => selectedImport[t.id] === 'yesterday').map(t => newItem(t.title))
    const toToday = importTodos.filter(t => selectedImport[t.id] === 'today').map(t => newItem(t.title))
    const existing = (section) => standup[section].filter(i => i.text.trim())
    const merged = {
      yesterday: [...existing('yesterday'), ...toYest].length ? [...existing('yesterday'), ...toYest] : [newItem()],
      today: [...existing('today'), ...toToday].length ? [...existing('today'), ...toToday] : [newItem()],
      blockers: standup.blockers,
    }
    setStandup(merged)
    scheduleSave(merged)
    setShowImport(false)
  }

  // Output generation
  const filledItems = (section) => standup[section].filter(i => i.text.trim()).map(i => i.text.trim())

  const generateOutput = () => {
    const label = formatDate(date)
    const ys = filledItems('yesterday')
    const td = filledItems('today')
    const bl = filledItems('blockers')

    if (format === 'markdown') {
      return [
        `## Daily Standup — ${label}`,
        '',
        `**Yesterday:**`,
        ...(ys.length ? ys.map(i => `- ${i}`) : ['- Nothing to report']),
        '',
        `**Today:**`,
        ...(td.length ? td.map(i => `- ${i}`) : ['- Nothing planned']),
        '',
        `**Blockers:**`,
        ...(bl.length ? bl.map(i => `- ${i}`) : ['- None 🎉']),
      ].join('\n')
    }
    if (format === 'slack') {
      return [
        `*Daily Standup — ${label}*`,
        '',
        `*Yesterday:*`,
        ...(ys.length ? ys.map(i => `• ${i}`) : ['• Nothing to report']),
        '',
        `*Today:*`,
        ...(td.length ? td.map(i => `• ${i}`) : ['• Nothing planned']),
        '',
        `*Blockers:*`,
        ...(bl.length ? bl.map(i => `• ${i}`) : ['• None 🎉']),
      ].join('\n')
    }
    return [
      `Daily Standup — ${label}`,
      '',
      `Yesterday:`,
      ...(ys.length ? ys.map(i => `  • ${i}`) : ['  • Nothing to report']),
      '',
      `Today:`,
      ...(td.length ? td.map(i => `  • ${i}`) : ['  • Nothing planned']),
      '',
      `Blockers:`,
      ...(bl.length ? bl.map(i => `  • ${i}`) : ['  • None 🎉']),
    ].join('\n')
  }

  const copyOutput = async () => {
    await navigator.clipboard.writeText(generateOutput())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const statusLabel = { done: 'Done', in_progress: 'In Progress', review: 'Review' }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Daily <span className="gradient-text">Standup</span></h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Auto-generate and share your team update.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            saveStatus === 'saved' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
            saveStatus === 'saving' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⟳ Saving...' : '● Unsaved'}
          </span>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={e => setDate(e.target.value)}
            className="input !w-auto text-sm"
          />
        </div>
      </div>

      {/* Import button */}
      <button onClick={openImport} className="btn-secondary mb-5 sm:mb-6 text-sm">
        <Zap className="w-4 h-4 text-yellow-500" />
        Import from Todos
      </button>

      {/* Three sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {SECTIONS.map(({ key, label, emoji, color, bg, border, placeholder }) => (
          <div key={key} className={`rounded-2xl border ${border} ${bg} p-4`}>
            <div className={`flex items-center justify-between mb-3 ${color}`}>
              <h3 className="font-bold flex items-center gap-1.5 text-sm sm:text-base">
                <span>{emoji}</span> {label}
              </h3>
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                {standup[key].filter(i => i.text.trim()).length} item{standup[key].filter(i => i.text.trim()).length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-1.5">
              {standup[key].map((item, idx) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <span className="text-gray-300 dark:text-gray-600 text-xs w-4 flex-shrink-0 text-right">{idx + 1}.</span>
                  <input
                    value={item.text}
                    onChange={e => updateItem(key, item.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addItem(key) }
                      if (e.key === 'Backspace' && !item.text && standup[key].length > 1) {
                        e.preventDefault(); removeItem(key, item.id)
                      }
                    }}
                    placeholder={placeholder}
                    className="flex-1 text-sm bg-white/80 dark:bg-gray-800/80 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-gray-300 dark:focus:border-gray-500 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 transition-colors"
                  />
                  {standup[key].length > 1 && (
                    <button
                      onClick={() => removeItem(key, item.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 flex-shrink-0 p-0.5 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => addItem(key)}
              className={`mt-3 text-xs font-medium flex items-center gap-1 ${color} opacity-60 hover:opacity-100 transition-opacity`}
            >
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>
        ))}
      </div>

      {/* Export panel */}
      <div className="card mb-5 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Export Standup</h3>
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl w-fit">
            {FORMATS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFormat(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  format === key ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-52 overflow-y-auto leading-relaxed">
          {generateOutput()}
        </pre>

        <div className="flex gap-2 mt-3">
          <button
            onClick={copyOutput}
            className={`btn-primary transition-all ${copied ? '!bg-green-600 hover:!bg-green-600' : ''}`}
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <button
          onClick={() => setShowHistory(h => !h)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Past Standups
            {history.length > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-normal">
                {history.length}
              </span>
            )}
          </h3>
          {showHistory ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>

        {showHistory && (
          <div className="mt-4 space-y-1">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No past standups yet</p>
            ) : history.map(h => {
              const yCount = (h.yesterday || []).length
              const tCount = (h.today || []).length
              const bCount = (h.blockers || []).length
              return (
                <button
                  key={h.id}
                  onClick={() => { setDate(h.date); setShowHistory(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group ${
                    h.date === date ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${h.date === todayStr() ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {h.date === todayStr() && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Today</span>
                    )}
                  </div>
                  <div className="flex gap-2.5 text-xs text-gray-400 dark:text-gray-500">
                    <span title="Yesterday">📅 {yCount}</span>
                    <span title="Today">🎯 {tCount}</span>
                    <span title="Blockers">🚧 {bCount}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowImport(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl p-5 sm:p-6 z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Import from Todos</h3>
              <button onClick={() => setShowImport(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Pick tasks and assign them to Yesterday or Today.</p>

            {importTodos.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No recent in-progress or done tasks found</p>
            ) : (
              <div className="space-y-2 mb-5">
                {importTodos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{todo.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{statusLabel[todo.status] || todo.status}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {['yesterday', 'today'].map(section => (
                        <button
                          key={section}
                          onClick={() => setSelectedImport(prev => ({
                            ...prev,
                            [todo.id]: prev[todo.id] === section ? undefined : section,
                          }))}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors capitalize ${
                            selectedImport[todo.id] === section
                              ? section === 'yesterday'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {section}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={applyImport}
                disabled={!Object.values(selectedImport).some(Boolean)}
                className="btn-primary flex-1"
              >
                Import Selected ({Object.values(selectedImport).filter(Boolean).length})
              </button>
              <button onClick={() => setShowImport(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
