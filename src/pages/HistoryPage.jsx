import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { teamService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const RANGES = [
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year',  label: 'Ano' },
]

function getDates(range) {
  const dates = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (range === 'year') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      dates.push(d.toISOString().slice(0, 7)) // YYYY-MM
    }
  } else {
    const days = range === 'week' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().slice(0, 10)) // YYYY-MM-DD
    }
  }
  return dates
}

function fmtMinutes(min) {
  if (!min) return null
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${m}m` : `${h}h`
}

function fmtColLabel(key, range) {
  if (range === 'year') {
    const [y, m] = key.split('-')
    return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  }
  const d = new Date(key + 'T12:00:00')
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${weekday} ${d.getDate()}`
}

function HeatCell({ minutes }) {
  if (!minutes) {
    return (
      <td className="border border-border/20 px-2 py-2.5 text-center text-xs min-w-[56px]">
        <span className="text-muted/30">—</span>
      </td>
    )
  }
  const hours     = minutes / 60
  const intensity = Math.min(hours / 8, 1) // 8h = intensidade máxima
  const alpha     = 0.12 + intensity * 0.72
  const textColor = intensity > 0.45 ? '#fff' : '#4ade80'

  return (
    <td
      className="border border-border/20 px-2 py-2.5 text-center text-xs font-semibold min-w-[56px]"
      style={{ backgroundColor: `rgba(34,197,94,${alpha})`, color: textColor }}
    >
      {fmtMinutes(minutes)}
    </td>
  )
}

export default function HistoryPage() {
  const navigate   = useNavigate()
  const [range, setRange] = useState('week')

  const { data: team = [], isLoading } = useQuery({
    queryKey:        ['team-history', range],
    queryFn:         () => teamService.history(range),
    refetchInterval: 120000,
  })

  const dates = getDates(range)

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs gap-1.5">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Histórico do time</h1>
          <p className="text-muted text-xs">Horas trabalhadas por membro</p>
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

      {!isLoading && team.length === 0 && (
        <div className="text-muted text-sm text-center py-16">Nenhum dado encontrado.</div>
      )}

      {!isLoading && team.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-muted text-xs font-medium px-4 py-3 border-b border-r border-border/30 min-w-[140px] sticky left-0 bg-surface">
                  Membro
                </th>
                {dates.map(d => (
                  <th
                    key={d}
                    className="text-muted text-xs font-medium px-2 py-3 border-b border-border/30 min-w-[56px] text-center whitespace-nowrap"
                  >
                    {fmtColLabel(d, range)}
                  </th>
                ))}
                <th className="text-muted text-xs font-medium px-3 py-3 border-b border-l border-border/30 min-w-[72px] text-center">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {team.map(({ user, days }) => {
                const total = Object.values(days).reduce((s, m) => s + m, 0)
                return (
                  <tr key={user.id} className="hover:bg-white/[0.02]">
                    <td className="border-b border-r border-border/20 px-4 py-3 sticky left-0 bg-surface">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name[0].toUpperCase()}
                        </div>
                        <span className="text-white text-xs font-medium truncate">{user.name}</span>
                      </div>
                    </td>
                    {dates.map(d => (
                      <HeatCell key={d} minutes={days[d] || 0} />
                    ))}
                    <td className="border-b border-l border-border/20 px-3 py-3 text-center text-white text-xs font-semibold">
                      {fmtMinutes(total) || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      {!isLoading && team.length > 0 && (
        <div className="flex items-center gap-3 mt-4 justify-end">
          <span className="text-muted text-xs">Menos</span>
          {[0, 0.15, 0.35, 0.55, 0.84].map((a, i) => (
            <span
              key={i}
              className="w-5 h-5 rounded border border-border/30"
              style={{ backgroundColor: a === 0 ? 'transparent' : `rgba(34,197,94,${a})` }}
            />
          ))}
          <span className="text-muted text-xs">Mais</span>
        </div>
      )}
    </div>
  )
}
