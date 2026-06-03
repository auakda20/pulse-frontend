import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sessionService } from '../services/api'
import { Gauge, AlertTriangle, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const RANGES = [{ k: 'week', l: 'Semana' }, { k: 'month', l: 'Mês' }]

function fmtMin(min) {
  if (!min) return '0h00'
  return Math.floor(min / 60) + 'h' + String(min % 60).padStart(2, '0')
}
function diaLabel(s) {
  // dateKey vem como "YYYY-MM-DD" (semana) ou agregações; tenta formatar bonito
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return s
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', weekday: 'short' })
}

export default function ProdutividadePage() {
  const [range, setRange] = useState('week')
  const { data = [], isLoading } = useQuery({
    queryKey: ['produtividade', range],
    queryFn: () => sessionService.produtividade(range),
  })

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader title="Produtividade" subtitle="Horas × entrega por pessoa. Dia de 5h+ com menos de 2 atividades é zerado." icon={Gauge}>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.k} onClick={() => setRange(r.k)}
              className={'text-xs px-3 py-1.5 rounded border ' + (range === r.k ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted hover:text-ink')}>
              {r.l}
            </button>
          ))}
        </div>
      </PageHeader>

      {isLoading && <div className="card text-center text-muted text-sm py-8">Carregando…</div>}
      {!isLoading && data.length === 0 && <div className="card text-center text-muted text-sm py-8">Sem dados no período.</div>}

      {data.map(u => (
        <div key={u.userId} className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: u.color || '#6366f1' }}>{u.name?.[0]?.toUpperCase()}</div>
              <span className="text-ink font-semibold text-sm">{u.name}</span>
              {u.diasZerados > 0 && (
                <span className="badge border border-red/30 bg-red/10 text-red text-[11px] gap-1">
                  <AlertTriangle size={11} /> {u.diasZerados} dia(s) zerado(s)
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-ink font-semibold text-sm">{fmtMin(u.totalValidos)} <span className="text-mutedLight font-normal">válidas</span></div>
              {u.totalValidos !== u.totalMinutos && (
                <div className="text-[11px] text-mutedLight line-through">{fmtMin(u.totalMinutos)} brutas</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {u.dias.map(d => (
              <div key={d.data} className={'flex items-center justify-between text-xs py-1.5 px-2 rounded ' + (d.zerado ? 'bg-red/5' : '')}>
                <span className="text-muted w-28 capitalize">{diaLabel(d.data)}</span>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <span className="text-mutedLight">{d.atividades} ativ · {d.metasConcluidas}/{d.metasTotal} metas</span>
                  {d.zerado
                    ? <span className="text-red font-medium flex items-center gap-1"><AlertTriangle size={11} /> {fmtMin(d.minutos)} → zerado</span>
                    : <span className="text-ink font-medium flex items-center gap-1"><CheckCircle2 size={11} className="text-green" /> {fmtMin(d.minutosValidos)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
