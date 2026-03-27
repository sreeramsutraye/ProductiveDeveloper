import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getStreak, COLORS, dateStr } from '../lib/habits'
import {
  ArrowLeft, UserPlus, UserCheck, Clock, UserX,
  Loader2, Timer, BookOpen, Flame, Wind, Users, Zap
} from 'lucide-react'

export default function UserProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile]           = useState(null)
  const [friendship, setFriendship]     = useState(null) // null | {id, status, iAmRequester}
  const [stats, setStats]               = useState(null)
  const [habits, setHabits]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notFound, setNotFound]         = useState(false)

  const isFriend = friendship?.status === 'accepted'
  const isPending = friendship?.status === 'pending'

  const load = useCallback(async () => {
    setLoading(true)

    // Redirect if viewing own profile
    if (userId === user.id) { navigate('/profile', { replace: true }); return }

    // Load profile
    const { data: p, error: pErr } = await supabase
      .from('profiles').select('*').eq('id', userId).maybeSingle()
    if (pErr || !p) { setNotFound(true); setLoading(false); return }
    setProfile(p)

    // Load friendship status
    const { data: f } = await supabase
      .from('friendships')
      .select('id, status, requester, addressee')
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
      .or(`requester.eq.${userId},addressee.eq.${userId}`)
      .maybeSingle()

    let myFriendship = null
    if (f && ((f.requester === user.id && f.addressee === userId) || (f.requester === userId && f.addressee === user.id))) {
      myFriendship = { ...f, iAmRequester: f.requester === user.id }
      setFriendship(myFriendship)
    }

    const accepted = myFriendship?.status === 'accepted'

    // Load stats (works for friends + self)
    if (accepted) {
      const { data: s, error: sErr } = await supabase.rpc('get_user_stats', { target_user_id: userId })
      if (!sErr && s) setStats(s)

      // Load habits + logs
      const [habitsRes, logsRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', userId).eq('archived', false).order('created_at'),
        supabase.from('habit_logs').select('habit_id, completed_date')
          .eq('user_id', userId).gte('completed_date', dateStr(89)),
      ])

      const logsByHabit = {}
      for (const log of logsRes.data || []) {
        if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = []
        logsByHabit[log.habit_id].push(log.completed_date)
      }

      setHabits((habitsRes.data || []).map(h => ({
        ...h,
        streak: getStreak(logsByHabit[h.id] || []),
      })))
    }

    setLoading(false)
  }, [userId, user.id, navigate])

  useEffect(() => { load() }, [load])

  const sendRequest = async () => {
    setActionLoading(true)
    await supabase.from('friendships').insert({ requester: user.id, addressee: userId })
    await load()
    setActionLoading(false)
  }

  const respond = async (status) => {
    setActionLoading(true)
    await supabase.from('friendships').update({ status }).eq('id', friendship.id)
    await load()
    setActionLoading(false)
  }

  const unfriend = async () => {
    setActionLoading(true)
    await supabase.from('friendships').delete().eq('id', friendship.id)
    await load()
    setActionLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  )

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-full gap-4">
      <p className="text-gray-500 dark:text-gray-400">User not found.</p>
      <Link to="/friends" className="btn-primary px-4 py-2 rounded-xl text-sm">Back to Friends</Link>
    </div>
  )

  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name)}&background=7c3aed&color=fff&size=200`

  return (
    <div className="max-w-2xl mx-auto page-enter">
      {/* Back */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="flex items-start gap-4 sm:gap-6 mb-6">
          <img
            src={profile.avatar_url || fallback}
            alt={profile.display_name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-primary-100 dark:ring-primary-900/50 shadow-lg flex-shrink-0"
            onError={(e) => { e.target.src = fallback }}
          />
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 truncate">{profile.display_name}</h1>
            <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1">@{profile.username}</p>
            {profile.designation && (
              <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium mb-2">
                {profile.designation}
              </span>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Friend action */}
        <FriendAction
          friendship={friendship}
          onSend={sendRequest}
          onAccept={() => respond('accepted')}
          onDecline={() => respond('declined')}
          onUnfriend={unfriend}
          loading={actionLoading}
        />
      </div>

      {/* Stats (only for friends) */}
      {isFriend && stats && (
        <div className="px-4 sm:px-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Stats</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Friends',  value: stats.friends_count,  icon: Users,   color: 'text-primary-600 dark:text-primary-400' },
              { label: 'Habits',   value: stats.habits_count,   icon: Flame,   color: 'text-rose-600 dark:text-rose-400' },
              { label: 'Focus',    value: stats.pomodoro_count, icon: Timer,   color: 'text-orange-600 dark:text-orange-400' },
              { label: 'Breathe',  value: stats.breathe_count,  icon: Wind,    color: 'text-cyan-600 dark:text-cyan-400' },
              { label: 'Journals', value: stats.journals_count, icon: BookOpen,color: 'text-purple-600 dark:text-purple-400' },
              { label: 'Logs',     value: stats.habit_logs_total, icon: Zap,   color: 'text-emerald-600 dark:text-emerald-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card text-center p-3">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100">{value ?? '—'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habits (only for friends) */}
      {isFriend && (
        <div className="px-4 sm:px-6 pb-8">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Habits · {habits.length}
          </h2>
          {habits.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">No habits yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {habits.map(h => {
                const c = COLORS[h.color] || COLORS.blue
                return (
                  <div key={h.id} className={`card p-4 ${c.light}`}>
                    <div className="text-2xl mb-2">{h.emoji}</div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{h.name}</p>
                    {h.streak > 0 ? (
                      <p className={`text-xs font-semibold mt-1 ${c.text}`}>🔥 {h.streak} day streak</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">No active streak</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Non-friend locked state */}
      {!isFriend && (
        <div className="px-4 sm:px-6 pb-10 text-center">
          <div className="card p-8">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <UserX className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Profile is private</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {isPending
                ? "Your friend request is pending. Once accepted, you'll see their full profile."
                : "Send a friend request to see their habits, stats, and more."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function FriendAction({ friendship, onSend, onAccept, onDecline, onUnfriend, loading }) {
  if (loading) return (
    <div className="flex gap-2">
      <div className="h-9 w-28 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
    </div>
  )

  if (!friendship) return (
    <button onClick={onSend} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors">
      <UserPlus className="w-4 h-4" />Add Friend
    </button>
  )

  const { status, iAmRequester } = friendship

  if (status === 'accepted') return (
    <div className="flex gap-2">
      <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
        <UserCheck className="w-4 h-4" />Friends
      </span>
      <button onClick={onUnfriend} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors">
        Unfriend
      </button>
    </div>
  )

  if (status === 'pending' && iAmRequester) return (
    <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium">
      <Clock className="w-4 h-4" />Request Sent
    </span>
  )

  if (status === 'pending' && !iAmRequester) return (
    <div className="flex gap-2">
      <button onClick={onAccept} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
        <UserCheck className="w-4 h-4" />Accept
      </button>
      <button onClick={onDecline} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors">
        Decline
      </button>
    </div>
  )

  // declined/cancelled — re-send
  return (
    <button onClick={onSend} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors">
      <UserPlus className="w-4 h-4" />Add Friend
    </button>
  )
}
