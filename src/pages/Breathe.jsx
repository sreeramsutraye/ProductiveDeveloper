import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Wind, Play, Pause, RotateCcw, Settings, Check } from 'lucide-react'

const PHASES = [
  { name: 'Inhale',  duration: 4,  text: 'Breathe in deeply...',  expanded: true,  c1: '#22d3ee', c2: '#3b82f6' },
  { name: 'Hold',    duration: 4,  text: 'Hold your breath...',   expanded: true,  c1: '#3b82f6', c2: '#6366f1' },
  { name: 'Exhale',  duration: 6,  text: 'Breathe out slowly...', expanded: false, c1: '#6366f1', c2: '#8b5cf6' },
  { name: 'Rest',    duration: 2,  text: 'Relax...',              expanded: false, c1: '#8b5cf6', c2: '#a78bfa' },
]

const DURATION_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
]

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

// States: idle | running | paused | completed
function getState(isRunning, completed, sessionTimeLeft, sessionDuration) {
  if (completed) return 'completed'
  if (isRunning) return 'running'
  if (sessionTimeLeft < sessionDuration) return 'paused'
  return 'idle'
}

export default function Breathe() {
  const { user } = useAuth()

  const [phase, setPhase]               = useState(0)
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(PHASES[0].duration)
  const [sessionDuration, setSessionDuration] = useState(60)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(60)
  const [isRunning, setIsRunning]       = useState(false)
  const [completed, setCompleted]       = useState(false)
  const [cyclesCount, setCyclesCount]   = useState(0)
  const [totalSessions, setTotalSessions] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // Refs to avoid stale closures in setInterval
  const phaseIdxRef   = useRef(0)
  const phaseRemRef   = useRef(PHASES[0].duration)
  const totalRemRef   = useRef(60)
  const cyclesRef     = useRef(0)
  const durRef        = useRef(60)

  useEffect(() => {
    supabase
      .from('breathe_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setTotalSessions(count ?? 0))
  }, [user])

  const saveSession = async (cycles) => {
    const { error } = await supabase.from('breathe_sessions').insert({
      user_id: user.id,
      duration: durRef.current,
      cycles_completed: cycles,
    })
    if (!error) setTotalSessions(s => (s ?? 0) + 1)
  }

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      // ── phase tick ──
      phaseRemRef.current -= 1
      setPhaseTimeLeft(phaseRemRef.current)

      if (phaseRemRef.current <= 0) {
        const next = (phaseIdxRef.current + 1) % PHASES.length
        phaseIdxRef.current = next
        phaseRemRef.current = PHASES[next].duration
        setPhase(next)
        setPhaseTimeLeft(phaseRemRef.current)
        if (next === 0) {
          cyclesRef.current += 1
          setCyclesCount(cyclesRef.current)
        }
      }

      // ── session tick ──
      totalRemRef.current -= 1
      setSessionTimeLeft(totalRemRef.current)

      if (totalRemRef.current <= 0) {
        clearInterval(id)
        setIsRunning(false)
        setCompleted(true)
        saveSession(cyclesRef.current)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning]) // eslint-disable-line

  const startSession = () => {
    phaseIdxRef.current = 0
    phaseRemRef.current = PHASES[0].duration
    totalRemRef.current = sessionDuration
    cyclesRef.current   = 0
    durRef.current      = sessionDuration
    setPhase(0)
    setPhaseTimeLeft(PHASES[0].duration)
    setSessionTimeLeft(sessionDuration)
    setCyclesCount(0)
    setCompleted(false)
    setShowSettings(false)
    setIsRunning(true)
  }

  const reset = () => {
    setIsRunning(false)
    setPhase(0)
    setPhaseTimeLeft(PHASES[0].duration)
    setSessionTimeLeft(sessionDuration)
    setCyclesCount(0)
    setCompleted(false)
    phaseIdxRef.current = 0
    phaseRemRef.current = PHASES[0].duration
    totalRemRef.current = sessionDuration
    cyclesRef.current   = 0
  }

  const handleDurationChange = (d) => {
    setSessionDuration(d)
    setSessionTimeLeft(d)
    totalRemRef.current = d
    durRef.current      = d
  }

  const state = getState(isRunning, completed, sessionTimeLeft, sessionDuration)
  const cur   = PHASES[phase]
  const { c1, c2 } = cur

  // Scale transition: match the phase duration for inhale/exhale
  const scaleDuration = phase === 0 ? PHASES[0].duration
                      : phase === 2 ? PHASES[2].duration
                      : 0.3
  const scale = cur.expanded ? 1 : 0.65

  const sessionProgress = 1 - sessionTimeLeft / sessionDuration

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 page-enter select-none">

      {/* ── Header ── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, transition: 'background 1.5s ease-in-out' }}>
          <Wind className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text mb-1">Breathe</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pause. Reset. Refocus.{totalSessions !== null ? ` · ${totalSessions} session${totalSessions !== 1 ? 's' : ''} completed` : ''}
        </p>
      </div>

      {/* ── Completion banner ── */}
      {state === 'completed' && (
        <div className="mb-6 w-full max-w-sm bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-4 text-center animate-fade-in-up">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Session complete!</p>
          </div>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {cyclesCount} breathing cycle{cyclesCount !== 1 ? 's' : ''} · {fmt(sessionDuration)} of mindful breathing
          </p>
        </div>
      )}

      {/* ── Animation area ── */}
      <div className="relative flex items-center justify-center mb-6" style={{ width: 280, height: 280 }}>

        {/* Ambient glow */}
        <div className="absolute rounded-full blur-2xl opacity-25 pointer-events-none transition-all duration-1000"
          style={{
            width:  cur.expanded ? 280 : 180,
            height: cur.expanded ? 280 : 180,
            background: `radial-gradient(circle, ${c1}, ${c2})`,
            transition: `width ${scaleDuration}s ease-in-out, height ${scaleDuration}s ease-in-out, background 1.5s ease-in-out`,
          }}
        />

        {/* Ripple rings — only during inhale */}
        {state === 'running' && phase === 0 && (
          <>
            <div className="absolute rounded-full border-2 animate-ping pointer-events-none"
              style={{ width: 230, height: 230, borderColor: c1, opacity: 0.35 }} />
            <div className="absolute rounded-full border-2 animate-ping pointer-events-none"
              style={{ width: 260, height: 260, borderColor: c1, opacity: 0.2, animationDelay: '0.6s' }} />
          </>
        )}

        {/* Main circle */}
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: 200,
            height: 200,
            background: `radial-gradient(circle at 38% 38%, ${c1}dd, ${c2}ff)`,
            transform: `scale(${scale})`,
            transition: `transform ${scaleDuration}s ease-in-out, background 1.5s ease-in-out`,
            boxShadow: `0 0 50px ${c1}55, 0 0 100px ${c1}25, inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}
        >
          {/* Highlight */}
          <div className="absolute inset-4 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25), transparent 60%)' }} />

          {/* Phase label */}
          <div className="text-center z-10">
            <p className="text-white font-bold text-xl tracking-wide drop-shadow">
              {state === 'idle' ? 'Ready' : state === 'completed' ? 'Done' : cur.name}
            </p>
            {state === 'running' && (
              <p className="text-white/70 text-sm mt-0.5 font-mono tabular-nums">{phaseTimeLeft}s</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Phase instruction ── */}
      <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-300 text-center mb-3 min-h-6 transition-all duration-500">
        {state === 'idle'      && 'Click Start to begin your breathing session'}
        {state === 'paused'    && 'Session paused — click Resume to continue'}
        {state === 'running'   && cur.text}
        {state === 'completed' && 'Take a moment to notice how you feel ✨'}
      </p>

      {/* ── Session countdown ── */}
      {(state === 'running' || state === 'paused') && (
        <p className="text-3xl font-mono font-extrabold text-gray-900 dark:text-gray-100 tabular-nums mb-3">
          {fmt(sessionTimeLeft)}
        </p>
      )}

      {/* ── Progress bar ── */}
      {(state === 'running' || state === 'paused') && (
        <div className="w-full max-w-xs h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${sessionProgress * 100}%`,
              background: `linear-gradient(to right, ${c1}, ${c2})`,
            }}
          />
        </div>
      )}

      {/* ── Phase dots ── */}
      {(state === 'running' || state === 'paused') && (
        <div className="flex items-center gap-3 mb-6">
          {PHASES.map((p, i) => (
            <div key={p.name} className="flex items-center gap-1.5">
              <div className="rounded-full transition-all duration-300"
                style={{
                  width: i === phase ? 8 : 6,
                  height: i === phase ? 8 : 6,
                  background: i === phase ? c1 : '#94a3b8',
                  opacity: i === phase ? 1 : 0.4,
                }}
              />
              <span className={`text-xs font-medium transition-colors ${
                i === phase ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {p.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Controls ── */}
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <>
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-3 rounded-2xl transition-colors border ${
                showSettings
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-100 dark:bg-gray-700 border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={startSession} className="btn-primary px-8 py-3 rounded-2xl flex items-center gap-2 text-base">
              <Play className="w-5 h-5" />
              Start Session
            </button>
          </>
        )}

        {state === 'running' && (
          <>
            <button onClick={() => setIsRunning(false)}
              className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <Pause className="w-5 h-5" />
            </button>
            <button onClick={reset}
              className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}

        {state === 'paused' && (
          <>
            <button onClick={() => setIsRunning(true)} className="btn-primary px-6 py-3 rounded-2xl flex items-center gap-2">
              <Play className="w-5 h-5" />
              Resume
            </button>
            <button onClick={reset}
              className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}

        {state === 'completed' && (
          <button onClick={reset} className="btn-primary px-8 py-3 rounded-2xl flex items-center gap-2 text-base">
            <RotateCcw className="w-5 h-5" />
            Breathe Again
          </button>
        )}
      </div>

      {/* ── Settings panel ── */}
      {showSettings && state === 'idle' && (
        <div className="mt-5 card p-4 sm:p-5 w-full max-w-xs animate-fade-in-up">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Session Duration</h3>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleDurationChange(value)}
                className={`py-2 rounded-xl text-sm font-medium transition-all ${
                  sessionDuration === value
                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <Wind className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pattern: Inhale 4s · Hold 4s · Exhale 6s · Rest 2s
            </p>
          </div>
        </div>
      )}

      {/* ── Cycles counter ── */}
      {(state === 'running' || state === 'paused') && (
        <div className="mt-5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Wind className="w-4 h-4" />
          <span>{cyclesCount} full cycle{cyclesCount !== 1 ? 's' : ''} this session</span>
        </div>
      )}
    </div>
  )
}