import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Play, Pause, RotateCcw, Coffee, BookOpen, Settings, Check } from 'lucide-react'

const MODES = {
  work: { label: 'Focus', duration: 25 * 60, color: 'text-primary-600', bg: 'bg-primary-50', ring: 'stroke-primary-500' },
  short: { label: 'Short Break', duration: 5 * 60, color: 'text-green-600', bg: 'bg-green-50', ring: 'stroke-green-500' },
  long: { label: 'Long Break', duration: 15 * 60, color: 'text-purple-600', bg: 'bg-purple-50', ring: 'stroke-purple-500' },
}

function pad(n) { return String(n).padStart(2, '0') }

export default function Pomodoro() {
  const { user } = useAuth()
  const [mode, setMode] = useState('work')
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [customDurations, setCustomDurations] = useState({
    work: 25, short: 5, long: 15,
  })
  const [history, setHistory] = useState([])
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const totalDuration = customDurations[mode] * 60

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistory(data || [])
  }, [user.id])

  useEffect(() => { loadHistory() }, [loadHistory])

  useEffect(() => {
    setTimeLeft(customDurations[mode] * 60)
    setRunning(false)
    clearInterval(intervalRef.current)
  }, [mode, customDurations])

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const handleSessionComplete = async () => {
    if (mode === 'work') {
      setSessions(s => s + 1)
      await supabase.from('pomodoro_sessions').insert({
        user_id: user.id,
        duration_minutes: customDurations.work,
        mode: 'work',
      })
      loadHistory()
    }
  }

  const reset = () => {
    setRunning(false)
    setTimeLeft(customDurations[mode] * 60)
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const progress = 1 - timeLeft / totalDuration
  const circumference = 2 * Math.PI * 90
  const offset = circumference * (1 - progress)
  const modeConfig = MODES[mode]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pomodoro Timer</h1>
          <p className="text-sm text-gray-500 mt-0.5">Stay focused, take breaks</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Custom Durations (minutes)</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'work', label: 'Focus' },
              { key: 'short', label: 'Short Break' },
              { key: 'long', label: 'Long Break' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={customDurations[key]}
                  onChange={e => setCustomDurations(d => ({ ...d, [key]: Number(e.target.value) }))}
                  className="input"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="btn-primary mt-4"
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Timer card */}
        <div className="card flex flex-col items-center">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8 w-full">
            {Object.entries(MODES).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  mode === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Circle timer */}
          <div className="relative w-52 h-52 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="#f3f4f6" strokeWidth="10" />
              <circle
                cx="100" cy="100" r="90" fill="none"
                className={modeConfig.ring}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold tabular-nums ${modeConfig.color}`}>
                {pad(mins)}:{pad(secs)}
              </span>
              <span className="text-sm text-gray-500 mt-1">{modeConfig.label}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary w-12 h-12 justify-center p-0">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRunning(r => !r)}
              className={`btn-primary w-20 h-12 justify-center text-base font-semibold ${
                mode === 'work' ? '' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {running
                ? <><Pause className="w-5 h-5" /> Pause</>
                : <><Play className="w-5 h-5" /> Start</>
              }
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Sessions completed today: <strong className="text-gray-900">{sessions}</strong>
          </p>
        </div>

        {/* History */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Sessions</h3>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <Coffee className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No sessions yet. Start focusing!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(session => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Focus Session</p>
                      <p className="text-xs text-gray-400">
                        {new Date(session.created_at).toLocaleDateString()} at{' '}
                        {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{session.duration_minutes}m</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card mt-6 bg-primary-50 border-primary-100">
        <h3 className="font-semibold text-primary-900 mb-2">Pomodoro Tips</h3>
        <ul className="text-sm text-primary-700 space-y-1 list-disc list-inside">
          <li>Work for 25 minutes, then take a 5-minute break</li>
          <li>After 4 sessions, take a 15-minute long break</li>
          <li>Remove all distractions during focus sessions</li>
          <li>Track your daily sessions to measure productivity</li>
        </ul>
      </div>
    </div>
  )
}
