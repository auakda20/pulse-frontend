import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { teamService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'

const RANGES = [
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year',  label: 'Ano' },
]

const V_COLOR = {
  studio:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  originals: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  auto:      'bg-green/10 text-green border-green/20',
  agency:    'bg-yellow/10 text-yellow border-yellow/20',
  geral:     'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
}
const V_LABEL = { studio: 'Studio', originals: 'Originals', auto: 'Auto', agency: 'Agency', geral: 'Geral' }

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })
}

export default function LogPage() {
  const navigate = useNavigate()
  const [range, setRange]   = useState('week')

  const { data: days = [], isLoading } = useQuery({
    queryKey:        ['team-log', range],
    queryFn:         () => teamService.log(range),
    refetchInterval: 60000,
  })

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs gap-1.5">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Registro do time</h1>
          <p className="text-muted text-xs">Metas e atividades por dia</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface border border-border rounded-lg p-1 w-fit">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              range === r.key ? 'bg-primary text-white' : 'text-muted hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-muted text-sm text-center py-16 animate-pulse">Carregando...</div>
      )}

      {!isLoading && days.length === 0 && (
        <div className="text-muted text-sm text-center py-16">Nenhum registro encontrado.</div>
      )}

      <div className="flex flex-col gap-6">
        {days.map(({ date, members }) => (
          <div key={date}>
            {/* Cabeçalho do dia */}
            <div className="text-white font-semibold text-sm capitalize mb-3 flex items-center gap-2">
              <span>{fmtDate(date)}</span>
              <span className="h-px flex-1 bg-border/30" />
            </div>

            <div className="flex flex-col gap-3">
              {members.map(({ user, goals, activities }) => {
                const hasContent = goals.length > 0 || activities.length > 0
                if (!hasContent) return null
                const completedGoals = goals.filter(g => g.completed).length

                return (
                  <div key={user.id} className="card">
                    {/* Nome do membro */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.name[0].toUpperCase()}
                      </div>
                      <span className="text-white text-sm font-medium">{user.name}</span>
                    </div>

                    {/* Metas */}
                    {goals.length > 0 && (
                      <div className="mb-3">
                        <div className="text-muted text-xs font-medium mb-2 uppercase tracking-wide">
                          Metas — {completedGoals}/{goals.length} concluídas
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {goals.map(g => (
                            <div key={g.id} className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                  g.completed ? 'bg-green border-green' : 'border-border'
                                }`}
                              >
                                {g.completed && <Check size={10} className="text-white" />}
                              </div>
                              <span className={`text-sm flex-1 ${g.completed ? 'line-through text-muted' : 'text-white'}`}>
                                {g.title}
                              </span>
                              <span className={`badge border text-xs ${V_COLOR[g.vertical]}`}>
                                {V_LABEL[g.vertical]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Atividades */}
                    {activities.length > 0 && (
                      <div>
                        <div className="text-muted text-xs font-medium mb-2 uppercase tracking-wide">
                          Atividades — {activities.length}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {activities.map(a => (
                            <div key={a.id} className="flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-muted/40 mt-2 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm">{a.title}</span>
                                  <span className={`badge border text-xs ${V_COLOR[a.vertical]}`}>
                                    {V_LABEL[a.vertical]}
                                  </span>
                                </div>
                                {a.description && (
                                  <p className="text-muted text-xs mt-0.5">{a.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
