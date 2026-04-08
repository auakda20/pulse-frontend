import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, BarChart2, BookOpen, FileText, LogOut, Zap } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Meu dia' },
  { to: '/team',      icon: Users,           label: 'Time' },
  { to: '/history',   icon: BarChart2,        label: 'Histórico' },
  { to: '/log',       icon: BookOpen,         label: 'Registro' },
  { to: '/notes',     icon: FileText,         label: 'Notas' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('pulse_user') || '{}')

  function logout() {
    localStorage.removeItem('pulse_token')
    localStorage.removeItem('pulse_user')
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] border-r border-border bg-surface flex flex-col z-40"
      style={{ boxShadow: '1px 0 0 rgba(255,255,255,0.03)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap size={14} className="text-primary" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Pulse</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: user.color || '#6366f1' }}
          >
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user.name}</div>
            <div className="text-muted text-[11px] truncate">{user.email}</div>
          </div>
        </div>
        <button onClick={logout} className="nav-item w-full text-red/60 hover:text-red hover:bg-red/5">
          <LogOut size={15} strokeWidth={1.75} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
