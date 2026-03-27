import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Code2, Check, X, Loader2, User, Briefcase, FileText, AtSign } from 'lucide-react'

const DESIGNATIONS = [
  'Frontend Engineer', 'Backend Engineer', 'Full Stack Developer',
  'Mobile Developer', 'DevOps Engineer', 'Data Engineer',
  'ML / AI Engineer', 'Engineering Manager', 'CTO / Founder', 'Student',
]

// Gate mode always renders on a dark bg (bg-gray-950) so we need explicit dark-glass styles.
// Edit mode renders inside the app's themed modal, so normal .input classes work fine.
const GATE = {
  label:  'block text-sm font-semibold text-gray-200 mb-1.5',
  hint:   'text-xs text-gray-400 mt-1',
  hintOk: 'text-xs text-emerald-400 mt-1',
  hintErr:'text-xs text-red-400 mt-1',
  input:  'w-full px-3 py-2.5 bg-white/8 border border-white/12 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400/70 transition-colors duration-200',
  prefix: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none',
  locked: 'absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500',
  counter:'text-xs text-gray-500 mt-1 text-right',
  error:  'text-sm text-red-300 bg-red-500/15 border border-red-500/25 px-3 py-2 rounded-xl',
  cancel: 'flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-gray-300 hover:bg-white/8 transition-colors',
}

const EDIT = {
  label:  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5',
  hint:   'text-xs text-gray-400 dark:text-gray-500 mt-1',
  hintOk: 'text-xs text-emerald-600 dark:text-emerald-400 mt-1',
  hintErr:'text-xs text-red-500 mt-1',
  input:  'input',
  prefix: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none',
  locked: 'absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500',
  counter:'text-xs text-gray-400 mt-1 text-right',
  error:  'text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl',
  cancel: 'flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
}

export default function ProfileSetup({ editMode = false, onClose }) {
  const { user, profile, refreshProfile } = useAuth()
  const s = editMode ? EDIT : GATE

  const [form, setForm] = useState({
    username:     editMode ? (profile?.username || '')     : '',
    display_name: editMode ? (profile?.display_name || '') : (user?.user_metadata?.full_name || ''),
    designation:  editMode ? (profile?.designation || '')  : '',
    bio:          editMode ? (profile?.bio || '')           : '',
  })
  const [usernameStatus, setUsernameStatus] = useState('idle')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const checkRef              = useRef(null)

  useEffect(() => {
    const val = form.username.trim().toLowerCase()
    if (!val || val.length < 3) { setUsernameStatus('idle'); return }
    if (!/^[a-z0-9_-]{3,30}$/.test(val)) { setUsernameStatus('invalid'); return }
    if (editMode && val === profile?.username) { setUsernameStatus('available'); return }

    setUsernameStatus('checking')
    clearTimeout(checkRef.current)
    checkRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles').select('id').eq('username', val).maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 400)
  }, [form.username, editMode, profile?.username])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (usernameStatus !== 'available') return
    if (!form.display_name.trim()) { setError('Display name is required.'); return }

    setSaving(true)
    const payload = {
      id:           user.id,
      username:     form.username.trim().toLowerCase(),
      display_name: form.display_name.trim(),
      designation:  form.designation.trim() || null,
      bio:          form.bio.trim() || null,
      avatar_url:   profile?.avatar_url || user?.user_metadata?.avatar_url || null,
    }

    const { error: dbErr } = editMode
      ? await supabase.from('profiles').update(payload).eq('id', user.id)
      : await supabase.from('profiles').insert(payload)

    if (dbErr) {
      if (dbErr.code === '23505') setError('That username was just taken — try another.')
      else setError(dbErr.message)
      setSaving(false)
      return
    }

    await refreshProfile()
    setSaving(false)
    if (editMode && onClose) onClose()
  }

  const usernameIndicator = () => {
    if (usernameStatus === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
    if (usernameStatus === 'available') return <Check className="w-4 h-4 text-emerald-400" />
    if (usernameStatus === 'taken')    return <X className="w-4 h-4 text-red-400" />
    if (usernameStatus === 'invalid')  return <X className="w-4 h-4 text-red-400" />
    return null
  }

  const usernameHint = () => {
    if (usernameStatus === 'taken')    return <p className={s.hintErr}>Username is already taken</p>
    if (usernameStatus === 'invalid')  return <p className={s.hintErr}>3–30 chars · lowercase letters, digits, _ or -</p>
    if (usernameStatus === 'available' && form.username) return <p className={s.hintOk}>@{form.username} is available ✓</p>
    return <p className={s.hint}>Lowercase letters, digits, _ or - · 3–30 chars</p>
  }

  const canSubmit = usernameStatus === 'available' && form.display_name.trim() && !saving

  const inner = (
    <div className={editMode ? '' : 'w-full max-w-md'}>
      {/* Header (gate only) */}
      {!editMode && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl mb-4 shadow-xl shadow-primary-900/50 animate-float">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Set up your profile</h1>
          <p className="text-sm text-gray-400">Just a few details — you can always update them later</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label className={s.label}>
            <AtSign className="inline w-3.5 h-3.5 mr-1 opacity-60" />Username
          </label>
          <div className="relative">
            <span className={s.prefix}>@</span>
            <input
              className={`${s.input} pl-7 pr-9`}
              placeholder="your_handle"
              value={form.username}
              onChange={(e) => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
              maxLength={30}
              disabled={editMode}
            />
            {editMode && <span className={s.locked}>locked</span>}
            {!editMode && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">{usernameIndicator()}</span>
            )}
          </div>
          {!editMode && usernameHint()}
        </div>

        {/* Display name */}
        <div>
          <label className={s.label}>
            <User className="inline w-3.5 h-3.5 mr-1 opacity-60" />Display Name
          </label>
          <input
            className={s.input}
            placeholder="Your full name"
            value={form.display_name}
            onChange={set('display_name')}
            maxLength={60}
          />
        </div>

        {/* Designation */}
        <div>
          <label className={s.label}>
            <Briefcase className="inline w-3.5 h-3.5 mr-1 opacity-60" />
            Designation{' '}
            <span className={editMode ? 'text-gray-400 font-normal' : 'text-gray-500 font-normal'}>(optional)</span>
          </label>
          <input
            className={s.input}
            list="designations"
            placeholder="e.g. Frontend Engineer"
            value={form.designation}
            onChange={set('designation')}
            maxLength={60}
          />
          <datalist id="designations">
            {DESIGNATIONS.map(d => <option key={d} value={d} />)}
          </datalist>
        </div>

        {/* Bio */}
        <div>
          <label className={s.label}>
            <FileText className="inline w-3.5 h-3.5 mr-1 opacity-60" />
            Bio{' '}
            <span className={editMode ? 'text-gray-400 font-normal' : 'text-gray-500 font-normal'}>(optional)</span>
          </label>
          <textarea
            className={`${s.input} resize-none`}
            rows={3}
            placeholder="A short line about you..."
            value={form.bio}
            onChange={set('bio')}
            maxLength={300}
          />
          <p className={s.counter}>{form.bio.length}/300</p>
        </div>

        {error && <p className={s.error}>{error}</p>}

        <div className="flex gap-3 pt-1">
          {editMode && (
            <button type="button" onClick={onClose} className={s.cancel}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  )

  if (editMode) return inner

  // Gate mode: full-screen dark overlay
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-primary-700/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-indigo-700/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-8 shadow-2xl">
        {inner}
      </div>
    </div>
  )
}
