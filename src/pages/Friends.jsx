import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Search, UserPlus, UserCheck, Clock, UserX, Users, Inbox, Loader2, Check, X } from 'lucide-react'

function Avatar({ src, name, size = 10 }) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7c3aed&color=fff&size=96`
  return (
    <img
      src={src || fallback}
      alt={name}
      className={`w-${size} h-${size} rounded-full flex-shrink-0 object-cover ring-2 ring-gray-100 dark:ring-gray-700`}
      onError={(e) => { e.target.src = fallback }}
    />
  )
}

// Derive friendship status between current user and another profile
function getFriendshipStatus(userId, friendships) {
  const f = friendships.find(f =>
    (f.requester === userId) || (f.addressee === userId)
  )
  if (!f) return null
  return { ...f, isSentByMe: f.requester !== userId }
}

export default function Friends() {
  const { user, profile } = useAuth()

  const [tab, setTab]               = useState('friends') // friends | requests | search
  const [friends, setFriends]       = useState([])
  const [requests, setRequests]     = useState([]) // incoming pending
  const [myFriendships, setMyFriendships] = useState([]) // all friendships for status lookup
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading]       = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState({})
  const searchRef = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    // Load all my friendships (any status) for UI state
    const { data: allF } = await supabase
      .from('friendships')
      .select(`
        id, status, requester, addressee,
        req:profiles!requester(id, username, display_name, designation, avatar_url),
        addr:profiles!addressee(id, username, display_name, designation, avatar_url)
      `)
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`)

    const all = allF || []
    setMyFriendships(all)

    // Accepted = friends
    const accepted = all.filter(f => f.status === 'accepted').map(f => ({
      friendship_id: f.id,
      ...( f.requester === user.id ? f.addr : f.req )
    }))
    setFriends(accepted)

    // Incoming pending requests
    const pending = all.filter(f => f.status === 'pending' && f.addressee === user.id).map(f => ({
      friendship_id: f.id,
      ...f.req
    }))
    setRequests(pending)

    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) { setSearchResults([]); return }
    setSearchLoading(true)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, designation, avatar_url')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', user.id)
        .limit(20)
      setSearchResults(data || [])
      setSearchLoading(false)
    }, 350)
  }, [searchQuery, user.id])

  const setAction = (id, val) => setActionLoading(a => ({ ...a, [id]: val }))

  const sendRequest = async (addresseeId) => {
    setAction(addresseeId, true)
    await supabase.from('friendships').insert({ requester: user.id, addressee: addresseeId })
    await loadData()
    setAction(addresseeId, false)
  }

  const respond = async (friendshipId, status) => {
    setAction(friendshipId, true)
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    await loadData()
    setAction(friendshipId, false)
  }

  const unfriend = async (friendshipId) => {
    setAction(friendshipId, true)
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await loadData()
    setAction(friendshipId, false)
  }

  // Get status for a search result
  const statusFor = (targetId) => {
    const f = myFriendships.find(f =>
      (f.requester === user.id && f.addressee === targetId) ||
      (f.addressee === user.id && f.requester === targetId)
    )
    if (!f) return null
    return { status: f.status, id: f.id, iAmRequester: f.requester === user.id }
  }

  const pendingCount = requests.length

  const tabs = [
    { key: 'friends',  label: 'Friends',  icon: Users,  count: friends.length },
    { key: 'requests', label: 'Requests', icon: Inbox,  count: pendingCount },
    { key: 'search',   label: 'Find',     icon: Search, count: null },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto page-enter">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-1">
          <span className="gradient-text">Friends</span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Connect with other developers and see their progress</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count != null && count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                key === 'requests'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          {/* ── Friends tab ── */}
          {tab === 'friends' && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No friends yet"
                  desc='Search for developers to connect with using the "Find" tab.'
                />
              ) : friends.map(f => (
                <FriendCard key={f.id} friend={f} actions={
                  <div className="flex gap-2">
                    <Link to={`/users/${f.id}`} className="text-xs px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors">
                      View Profile
                    </Link>
                    <button
                      onClick={() => unfriend(f.friendship_id)}
                      disabled={actionLoading[f.friendship_id]}
                      className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {actionLoading[f.friendship_id] ? '...' : 'Unfriend'}
                    </button>
                  </div>
                } />
              ))}
            </div>
          )}

          {/* ── Requests tab ── */}
          {tab === 'requests' && (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <EmptyState icon={Inbox} title="No pending requests" desc="When someone sends you a friend request, it will appear here." />
              ) : requests.map(r => (
                <FriendCard key={r.id} friend={r} actions={
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(r.friendship_id, 'accepted')}
                      disabled={actionLoading[r.friendship_id]}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      {actionLoading[r.friendship_id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Accept
                    </button>
                    <button
                      onClick={() => respond(r.friendship_id, 'declined')}
                      disabled={actionLoading[r.friendship_id]}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      Decline
                    </button>
                  </div>
                } />
              ))}
            </div>
          )}

          {/* ── Search tab ── */}
          {tab === 'search' && (
            <div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-10"
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
              </div>

              {!searchQuery.trim() && (
                <EmptyState icon={Search} title="Find developers" desc="Search by username or display name to connect with others." />
              )}

              <div className="space-y-2">
                {searchResults.map(result => {
                  const s = statusFor(result.id)
                  return (
                    <FriendCard key={result.id} friend={result} actions={
                      <SearchAction
                        status={s}
                        onAdd={() => sendRequest(result.id)}
                        loading={!!actionLoading[result.id] || !!actionLoading[s?.id]}
                        userId={result.id}
                      />
                    } />
                  )
                })}
                {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No users found for "{searchQuery}"</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FriendCard({ friend, actions }) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.display_name || 'U')}&background=7c3aed&color=fff&size=96`
  return (
    <div className="card flex items-center gap-3 p-3 sm:p-4 animate-fade-in-up">
      <img
        src={friend.avatar_url || fallback}
        alt={friend.display_name}
        className="w-11 h-11 rounded-full flex-shrink-0 object-cover ring-2 ring-gray-100 dark:ring-gray-600"
        onError={(e) => { e.target.src = fallback }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{friend.display_name}</p>
        <p className="text-xs text-primary-600 dark:text-primary-400 truncate">@{friend.username}</p>
        {friend.designation && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{friend.designation}</p>
        )}
      </div>
      <div className="flex-shrink-0">{actions}</div>
    </div>
  )
}

function SearchAction({ status, onAdd, loading, userId }) {
  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
  if (!status) return (
    <button onClick={onAdd} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors">
      <UserPlus className="w-3.5 h-3.5" />
      Add
    </button>
  )
  if (status.status === 'accepted') return (
    <Link to={`/users/${userId}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
      <UserCheck className="w-3.5 h-3.5" />
      Friends
    </Link>
  )
  if (status.status === 'pending' && status.iAmRequester) return (
    <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
      <Clock className="w-3.5 h-3.5" />
      Pending
    </span>
  )
  if (status.status === 'pending' && !status.iAmRequester) return (
    <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">
      Respond
    </span>
  )
  // declined / cancelled — allow re-sending
  return (
    <button onClick={onAdd} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors">
      <UserPlus className="w-3.5 h-3.5" />
      Add
    </button>
  )
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">{desc}</p>
    </div>
  )
}
