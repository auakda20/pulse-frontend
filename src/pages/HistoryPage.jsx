import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { teamService } from '../services/api'

const RANGES = [
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year',  label: 'Ano' },
]

function todayBRT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function getDates(range) {
  const dates = []
  const today = new Date(todayBRT() + 'T12:00:00Z')
  if (range === 'year') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today)
      d.setUTCDate(1)
      d.setUTCMonth(d.getUTCMonth() - i)
      dates.push(d.toISOString().slice(0, 7))
    }
  } else {
    const days = range === 'week' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setUTCDate(d.getUTCDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
  }
  return dates
}

function fmtMinutes(min) {
  if (!min) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (min < 60) return m + 'm'
  return m ? h + 'h' + m + 'm' : h + 'h'
}

function fmtColLabel(key, range) {
  if (range === 'year') {
    const [y, m] = key.split('-')
    return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  }
  const d = new Date(key + 'T12:00:00Z')
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')
  return weekday + ' ' + d.getUTCDate()
}

function HeatCell({ data }) {
  const minutes         = data?.minutes || 0
  const goalsCompleted  = data?.goalsCompleted || 0
  const goalsTotal      = data?.goalsTotal || 0
  const activitiesCount = data?.activitiesCount || 0
  const hasData         = minutes > 0 || goalsTotal > 0 || activitiesCount > 0

  if (!hasData) {
    return (
      <td className="border border-border/20 px-2 py-2.5 text-center text-xs min-w-[56px]">
        <span className="text-muted/30">-</span>
      </td>
    )
  }

  const hours     = minutes / 60
  const intensity = Math.min(hours / 8, 1)
  const alpha     = minutes > 0 ? 0.12 + intensity * 0.72 : 0
  const textColor = intensity > 0.45 ? '#fff' : '#10b981'

  return (
    <td className="border border-border/20 px-2 py-2 text-center text-xs min-w-[56px]"
      style={{ backgroundColor: alpha > 0 ? 'rgba(16,185,129,' + alpha + ')' : undefined }}>
      {minutes > 0 && <div className="font-semibold" style={{ color: textColor }}>{fmtMinutes(minutes)}</div>}
      {goalsTotal > 0 && <div className="text-[10px] leading-tight" style={{ color: 'rgba(107,111,120,0.8)' }}>{goalsCompleted}/{goalsTotal}</div>}
      {activitiesCount > 0 && <div className="text-[10px] leading-tight" style={{ color: 'rgba(107,111,120,0.7)' }}>{activitiesCount} atv</div>}
    </td>
  )
}

export default function HistoryPage() {
  const [range, setRange] = useState('week')

  const { data: team = [], isLoading } = useQuery({
    queryKey:        ['team-history', range],
    queryFn:         () => teamService.history(range),
    refetchInterval: 120000,
  })

  const dates = getDates(range)

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Historico</h1>
        <p className="text-mutedLight text-sm mt-0.5">Horas trabalhadas, metas e atividades por membro</p>
      </div>

      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={'px-4 py-1.5 rounded text-sm font-medium transition-all ' +
              (range === r.key ? 'bg-primary/10 text-primary' : 'text-muted hover:text-white')}>
            {r.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-muted text-sm text-center py-16 animate-pulse">Carregando...</div>}
      {!isLoading && team.length === 0 && <div className="text-muted text-sm text-center py-16">Nenhum dado encontrado.</div>}

      {!isLoading && team.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-muted text-xs font-medium px-4 py-3 border-b border-r border-border/30 min-w-[140px] sticky left-0 bg-surface">
                  Membro
                </th>
                {dates.map(d => (
                  <th key={d} className="text-muted text-xs font-medium px-2 py-3 border-b border-border/30 min-w-[56px] text-center whitespace-nowrap">
                    {fmtColLabel(d, range)}
                  </th>
                ))}
                <th className="text-muted text-xs font-medium px-3 py-3 border-b border-l border-border/30 min-w-[72px] text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {team.map(({ user, days }) => {
                const totalMinutes = Object.values(days).reduce((s, v) => s + (v.minutes || 0), 0)
                return (
                  <tr key={user.id} className="hover:bg-surfaceHover/50 transition-colors">
                    <td className="border-b border-r border-border/20 px-4 py-3 sticky left-0 bg-surface">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: user.color }}>
                          {user.name[0].toUpperCase()}
                        </div>
                        <span className="text-white text-xs font-medium truncate">{user.name}</span>
                      </div>
                    </td>
                    {dates.map(d => <HeatCell key={d} data={days[d]} />)}
                    <td className="border-b border-l border-border/20 px-3 py-3 text-center text-white text-xs font-semibold">
                      {fmtMinutes(totalMinutes) || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && team.length > 0 && (
        <div className="flex items-center gap-2 justify-end">
          <span className="text-muted text-xs">Menos</span>
          {[0, 0.15, 0.35, 0.55, 0.84].map((a, i) => (
            <span key={i} className="w-4 h-4 rounded border border-border/30"
              style={{ backgroundColor: a === 0 ? 'transparent' : 'rgba(16,185,129,' + a + ')' }} />
          ))}
          <span className="text-muted text-xs">Mais</span>
        </div>
      )}
    </div>
  )
}
