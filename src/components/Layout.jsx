import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  LayoutDashboard,
  Timer,
  CheckSquare,
  BookOpen,
  LogOut,
  Code2,
  Menu,
  Sun,
  Moon,
  UserCircle,
  Flame,
  Mic,
  Wind,
} from 'lucide-react'
import { useState } from 'react'

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/habits', icon: Flame, label: 'Habits' },
  { to: '/standup', icon: Mic, label: 'Standup' },
  { to: '/todos', icon: CheckSquare, label: 'Todos' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
]

const extraNav = [
  { to: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { to: '/breathe',  icon: Wind,  label: 'Breathe'  },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const NavItem = ({ to, icon: Icon, label, end }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-primary-500/20 to-indigo-500/10 dark:from-primary-500/20 dark:to-indigo-500/10 text-primary-700 dark:text-primary-300 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-gray-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
          {label}
          {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400" />}
        </>
      )}
    </NavLink>
  )

  const Sidebar = ({ mobile = false }) => (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 w-64`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/30">
          <Code2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-none">Productive</p>
          <p className="text-xs bg-gradient-to-r from-primary-600 to-indigo-500 dark:from-primary-400 dark:to-indigo-400 bg-clip-text text-transparent font-semibold">Developer</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainNav.map(item => <NavItem key={item.to} {...item} />)}
        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-700">
          {extraNav.map(item => <NavItem key={item.to} {...item} />)}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-0.5 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>

        <NavLink
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
              isActive ? 'bg-primary-50 dark:bg-primary-900/40' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`
          }
        >
          <img
            src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'U')}&background=7c3aed&color=fff`}
            alt="Avatar"
            className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-primary-200 dark:ring-primary-800"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
          <UserCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        </NavLink>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 z-50 w-64">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 -ml-1" aria-label="Open menu">
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">ProductiveDev</span>
          </div>
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 -mr-1" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-stretch">
        {mainNav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] sm:text-xs font-medium transition-colors min-w-0 ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                <span className="truncate w-full text-center px-0.5">{label}</span>
                {isActive && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500 dark:bg-primary-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
