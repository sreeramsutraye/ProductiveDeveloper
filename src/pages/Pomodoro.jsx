import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { Play, Pause, RotateCcw, Coffee, BookOpen, Settings, Check } from 'lucide-react'

const MODES = {
  work:  { label: 'Focus',       duration: 25 * 60, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/30', ring: 'stroke-primary-500' },
  short: { label: 'Short Break', duration: 5 * 60,  color: 'text-green-600 dark:text-green-400',    bg: 'bg-green-50 dark:bg-green-900/30',    ring: 'stroke-green-500'   },
  long:  { label: 'Long Break',  duration: 15 * 60, color: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-50 dark:bg-purple-900/30',  ring: 'stroke-purple-500'  },
}

function pad(n) { return String(n).padStart(2, '0') }

// ---------------------------------------------------------------------------
// Sound helpers — lazy AudioContext so we only create after user gesture
// ---------------------------------------------------------------------------
let _audioCtx = null
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new AudioContext()
  if (_audioCtx.state === 'suspended') _audioCtx.resume()
  return _audioCtx
}

function beep(freq, startOffset, duration) {
  try {
    const ctx = getAudioCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.25, ctx.currentTime + startOffset)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startOffset + duration)
    osc.start(ctx.currentTime + startOffset)
    osc.stop(ctx.currentTime + startOffset + duration + 0.05)
  } catch (_) { /* AudioContext blocked in some environments */ }
}

function playStartSound()    { beep(880, 0, 0.12) }
function playCompleteSound() {
  beep(660, 0,    0.12)
  beep(880, 0.18, 0.12)
  beep(1100, 0.36, 0.55)
}

// ---------------------------------------------------------------------------

export default function Pomodoro() {
  const { user }  = useAuth()
  const { theme } = useTheme()
  const [mode, setMode] = useState('work')
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [customDurations, setCustomDurations] = useState({ work: 25, short: 5, long: 15 })
  const [history, setHistory] = useState([])

  // Refs used inside interval/event handlers to avoid stale closures
  const intervalRef    = useRef(null)
  const endTimeRef     = useRef(null)   // absolute timestamp (ms) when timer fires
  const completedRef   = useRef(false)  // guard against double-complete
  const modeRef        = useRef(mode)
  const customDurRef   = useRef(customDurations)
  const loadHistoryRef = useRef(null)

  useEffect(() => { modeRef.current = mode },            [mode])
  useEffect(() => { customDurRef.current = customDurations }, [customDurations])

  const totalDuration = customDurations[mode] * 60

  // -------------------------------------------------------------------------
  // DB
  // -------------------------------------------------------------------------
  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistory(data || [])
  }, [user.id])

  loadHistoryRef.current = loadHistory

  useEffect(() => { loadHistory() }, [loadHistory])

  // -------------------------------------------------------------------------
  // Session complete handler — stored in ref so interval always calls latest
  // -------------------------------------------------------------------------
  const handleSessionComplete = useCallback(async () => {
    playCompleteSound()
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro complete!', {
        body: modeRef.current === 'work'
          ? 'Great focus session. Time for a break!'
          : 'Break is over. Ready to focus?',
        silent: true,
      })
    }
    if (modeRef.current === 'work') {
      setSessions(s => s + 1)
      await supabase.from('pomodoro_sessions').insert({
        user_id: user.id,
        duration_minutes: customDurRef.current.work,
        mode: 'work',
      })
      loadHistoryRef.current?.()
    }
  }, [user.id])

  const handleSessionCompleteRef = useRef(handleSessionComplete)
  useEffect(() => { handleSessionCompleteRef.current = handleSessionComplete }, [handleSessionComplete])

  // -------------------------------------------------------------------------
  // Reset when mode / custom durations change
  // -------------------------------------------------------------------------
  useEffect(() => {
    setRunning(false)
    setTimeLeft(customDurations[mode] * 60)
    endTimeRef.current  = null
    completedRef.current = false
    clearInterval(intervalRef.current)
  }, [mode, customDurations])

  // -------------------------------------------------------------------------
  // Core timer — timestamp-based so background throttling doesn't matter
  // -------------------------------------------------------------------------
  const tick = useCallback(() => {
    if (!endTimeRef.current) return
    const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
    setTimeLeft(remaining)

    if (remaining <= 0 && !completedRef.current) {
      completedRef.current = true
      clearInterval(intervalRef.current)
      setRunning(false)
      endTimeRef.current = null
      handleSessionCompleteRef.current()
    }
  }, [])

  useEffect(() => {
    if (running) {
      // Record absolute end time from current timeLeft
      endTimeRef.current  = Date.now() + timeLeft * 1000
      completedRef.current = false
      intervalRef.current  = setInterval(tick, 500)
    } else {
      clearInterval(intervalRef.current)
      // Keep endTimeRef so pause/resume works, but null it if fully stopped
      if (timeLeft === customDurations[mode] * 60) endTimeRef.current = null
    }
    return () => clearInterval(intervalRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // When tab becomes visible again: recalculate immediately from wall clock
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !endTimeRef.current) return
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true
        clearInterval(intervalRef.current)
        setRunning(false)
        endTimeRef.current = null
        handleSessionCompleteRef.current()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // -------------------------------------------------------------------------
  // Controls
  // -------------------------------------------------------------------------
  const toggleRunning = () => {
    if (!running) playStartSound()
    setRunning(r => !r)
  }

  const reset = () => {
    setRunning(false)
    endTimeRef.current  = null
    completedRef.current = false
    setTimeLeft(customDurations[mode] * 60)
  }

  // Request notification permission on first render
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // -------------------------------------------------------------------------
  // Derived display values
  // -------------------------------------------------------------------------
  const mins        = Math.floor(timeLeft / 60)
  const secs        = timeLeft % 60
  const progress    = 1 - timeLeft / totalDuration
  const circumference = 2 * Math.PI * 90
  const offset      = circumference * (1 - progress)
  const modeConfig  = MODES[mode]
  const trackColor  = theme === 'dark' ? '#374151' : '#f3f4f6'

  // Update browser tab title with countdown
  useEffect(() => {
    if (running) {
      document.title = `${pad(mins)}:${pad(secs)} — ${modeConfig.label} | Pomodoro`
    } else {
      document.title = 'Pomodoro | ProductiveDeveloper'
    }
    return () => { document.title = 'ProductiveDeveloper' }
  }, [running, mins, secs, modeConfig.label])

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Pomodoro <span className="gradient-text">Timer</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Deep focus. Timed breaks. Ship more.</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary text-sm">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="card mb-5 sm:mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Custom Durations (minutes)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { key: 'work',  label: 'Focus' },
              { key: 'short', label: 'Short Break' },
              { key: 'long',  label: 'Long Break' },
            ].map(({ key, label }) => (
              <div key={key} className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0">
                <label className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 sm:mb-1 w-28 sm:w-auto flex-shrink-0">{label}</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={customDurations[key]}
                  onChange={e => setCustomDurations(d => ({ ...d, [key]: Number(e.target.value) }))}
                  className="input flex-1 sm:flex-none"
                />
              </div>
            ))}
          </div>
          <button onClick={() => setShowSettings(false)} className="btn-primary mt-4">
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Timer card */}
        <div className="card flex flex-col items-center p-4 sm:p-6">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl mb-6 sm:mb-8 w-full">
            {Object.entries(MODES).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  mode === key
                    ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Circle timer */}
          <div className="relative w-40 h-40 sm:w-52 sm:h-52 mb-5 sm:mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke={trackColor} strokeWidth="10" />
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
              <span className={`text-4xl sm:text-5xl font-bold tabular-nums ${modeConfig.color}`}>
                {pad(mins)}:{pad(secs)}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{modeConfig.label}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary w-12 h-12 justify-center p-0">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={toggleRunning}
              className={`btn-primary w-24 h-12 justify-center text-base font-semibold ${
                mode === 'work' ? '' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {running
                ? <><Pause className="w-5 h-5" /> Pause</>
                : <><Play  className="w-5 h-5" /> Start</>
              }
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-5 sm:mt-6">
            Sessions today: <strong className="text-gray-900 dark:text-gray-100">{sessions}</strong>
          </p>
        </div>

        {/* History */}
        <div className="card p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Sessions</h3>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <Coffee className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No sessions yet. Start focusing!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(session => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Focus Session</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {new Date(session.created_at).toLocaleDateString()} · {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0 ml-2">{session.duration_minutes}m</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="card mt-4 sm:mt-6 bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800 p-4 sm:p-6">
        <h3 className="font-semibold text-primary-900 dark:text-primary-300 mb-2 text-sm sm:text-base">Pomodoro Tips</h3>
        <ul className="text-sm text-primary-700 dark:text-primary-400 space-y-1 list-disc list-inside">
          <li>Work for 25 minutes, then take a 5-minute break</li>
          <li>After 4 sessions, take a 15-minute long break</li>
          <li>Remove all distractions during focus sessions</li>
          <li>Track your daily sessions to measure productivity</li>
        </ul>
      </div>
    </div>
  )
}