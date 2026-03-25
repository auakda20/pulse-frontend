import { useQuery } from '@tanstack/react-query'
import { teamService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { Clock, Check, Target, Zap, BarChart2 } from 'lucide-react'

const V_LABEL = { studio: 'Studio', originals: 'Originals', auto: 'Auto', agency: 'Agency', geral: 'Geral' }
const V_COLOR = { studio: 'bg-purple-500/10 text-purple-400 border-purple-500/20', originals: 'bg-blue-500/10 text-blue-400 border-blue-500/20', auto: 'bg-green/10 text-green border-green/20', agency: 'bg-yellow/10 text-yellow border-yellow/20', geral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }

function fmtMinutes(min) {
  if (!min && min !== 0) return '—'
  return `${Math.floor(min / 60)}h ${min % 60}min`
}

function StatusDot({ session }) {
  if (!session?.sessions?.length) return <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />
  if (session.openSession) return <span className="w-2 h-2 rounded-full bg-green inline-block animate-pulse" />
  return <span className="w-2 h-2 rounded-full bg-yellow inline-block" />
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function TeamPage() {
  const navigate = useNavigate()
  const { data: team = [], isLoading } = useQuery({
    queryKey:        ['team-today'],
    queryFn:         teamService.today,
    refetchInterval: 60000,
  })

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">⚡ Pulse <span className="text-muted font-normal text-base">— painel do time</span></h1>
          <p className="text-muted text-xs mt-0.5">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/history')} className="btn-ghost text-xs gap-1.5">
            <BarChart2 size={14} /> Histórico
          </button>
          <button onClick={() => navigate('/login')} className="btn-outline text-xs">Meu dia →</button>
        </div>
      </div>

      {isLoading && <div className="text-muted text-sm text-center py-16 animate-pulse">Carregando...</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {team.map(({ user, session, goals, activities }) => {
          const completedGoals = goals.filter(g => g.completed).length
          const isOnline = !!session?.openSession

          return (
            <div key={user.id} className={`card flex flex-col gap-4 ${isOnline ? 'border-green/20' : ''}`}>
              {/* Pessoa */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0" style={{ backgroundColor: user.color }}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <StatusDot session={session} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm">{user.name}</div>
                  <div className="text-muted text-xs flex items-center gap-1">
                    <Clock size={10} />
                    {session?.openSession
                      ? `trabalhando desde ${fmtTime(session.openSession.checkinAt)}`
                      : session?.totalMinutes
                        ? fmtMinutes(session.totalMinutes) + ' hoje'
                        : 'Sem check-in'}
                  </div>
                </div>
              </div>

              {/* Metas */}
              {goals.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
                    <Target size={11} />
                    <span>Metas — {completedGoals}/{goals.length}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {goals.map(g => (
                      <div key={g.id} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${g.completed ? 'bg-green border-green' : 'border-border'}`}>
                          {g.completed && <Check size={8} className="text-white" />}
                        </div>
                        <span className={`text-xs flex-1 truncate ${g.completed ? 'line-through text-muted' : 'text-white'}`}>{g.title}</span>
                        <span className={`badge border text-xs flex-shrink-0 ${V_COLOR[g.vertical]}`}>{V_LABEL[g.vertical]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Atividades */}
              {activities.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
                    <Zap size={11} />
                    <span>Atividades — {activities.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {activities.map(a => (
                      <div key={a.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs flex-1 truncate">{a.title}</span>
                          <span className={`badge border text-xs flex-shrink-0 ${V_COLOR[a.vertical]}`}>{V_LABEL[a.vertical]}</span>
                        </div>
                        {a.description && <p className="text-muted text-xs mt-0.5 truncate">{a.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!session?.sessions?.length && goals.length === 0 && activities.length === 0 && (
                <p className="text-muted text-xs text-center py-2">Nenhuma atividade hoje ainda</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
