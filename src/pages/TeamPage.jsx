import { useQuery } from '@tanstack/react-query'
import { teamService } from '../services/api'
import { motion } from 'framer-motion'
import { Clock, Check, Target, Zap } from 'lucide-react'
import Layout from '../components/Layout'

const V_LABEL = { studio: 'Studio', originals: 'Originals', auto: 'Auto', agency: 'Agency', geral: 'Geral' }
const V_COLOR = {
  studio:    'bg-violet/10 text-violet border-violet/20',
  originals: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  auto:      'bg-green/10 text-green border-green/20',
  agency:    'bg-yellow/10 text-yellow border-yellow/20',
  geral:     'bg-white/5 text-mutedLight border-borderLight',
}

function fmtMinutes(min) {
  if (!min && min !== 0) return '-'
  return Math.floor(min / 60) + 'h ' + (min % 60) + 'min'
}

function fmtTime(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function StatusDot({ session }) {
  if (!session?.sessions?.length) return <span className="w-2 h-2 rounded-full bg-border inline-block" />
  if (session.openSession)        return <span className="w-2 h-2 rounded-full bg-green inline-block animate-pulse" />
  return <span className="w-2 h-2 rounded-full bg-yellow inline-block" />
}

export default function TeamPage() {
  const isAuth = !!localStorage.getItem('pulse_token')

  const { data: team = [], isLoading } = useQuery({
    queryKey:        ['team-today'],
    queryFn:         teamService.today,
    refetchInterval: 60000,
  })

  const nowSP = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const content = (
    <div className="flex flex-col gap-5 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Time</h1>
        <p className="text-mutedLight text-sm mt-0.5 capitalize">{nowSP}</p>
      </div>

      {isLoading && (
        <div className="text-muted text-sm text-center py-16 animate-pulse">Carregando...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {team.map(({ user, session, goals, activities }) => {
          const completedGoals = goals.filter(g => g.completed).length
          const isOnline = !!session?.openSession

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={'card flex flex-col gap-4 ' + (isOnline ? 'border-green/20' : '')}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: user.color }}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot session={session} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm">{user.name}</div>
                  <div className="text-muted text-xs flex items-center gap-1">
                    <Clock size={10} />
                    {session?.openSession
                      ? 'desde ' + fmtTime(session.openSession.checkinAt)
                      : session?.totalMinutes
                        ? fmtMinutes(session.totalMinutes) + ' hoje'
                        : 'Sem check-in'}
                  </div>
                </div>
              </div>

              {goals.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
                    <Target size={11} />
                    <span>Metas — {completedGoals}/{goals.length}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {goals.map(g => (
                      <div key={g.id} className="flex items-center gap-2">
                        <div className={'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ' +
                          (g.completed ? 'bg-green border-green' : 'border-borderLight')}>
                          {g.completed && <Check size={8} className="text-white" />}
                        </div>
                        <span className={'text-xs flex-1 truncate ' + (g.completed ? 'line-through text-muted' : 'text-white/90')}>
                          {g.title}
                        </span>
                        <span className={'badge border text-xs flex-shrink-0 ' + V_COLOR[g.vertical]}>{V_LABEL[g.vertical]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                          <span className="text-white/90 text-xs flex-1 truncate">{a.title}</span>
                          <span className={'badge border text-xs flex-shrink-0 ' + V_COLOR[a.vertical]}>{V_LABEL[a.vertical]}</span>
                        </div>
                        {a.description && <p className="text-muted text-xs mt-0.5 truncate">{a.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!session?.sessions?.length && goals.length === 0 && activities.length === 0 && (
                <p className="text-muted text-xs text-center py-2">Nenhuma atividade hoje</p>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )

  if (isAuth) return <Layout>{content}</Layout>
  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {content}
    </div>
  )
}
