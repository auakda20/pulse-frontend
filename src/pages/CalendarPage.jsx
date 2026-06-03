import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarService } from '../services/api'
import { Plus, X, Trash2, ChevronLeft, ChevronRight, CalendarDays, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'

const TZ = 'America/Sao_Paulo'
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const REMIND = [
  { v: 0, l: 'Sem lembrete' }, { v: 15, l: '15 min antes' }, { v: 30, l: '30 min antes' },
  { v: 60, l: '1h antes' }, { v: 120, l: '2h antes' }, { v: 1440, l: '1 dia antes' },
]
const VERTICAIS = ['', 'auto', 'studio', 'originals', 'agency', 'geral']

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
// dia (BRT) em que o evento cai — para colocá-lo na célula certa
const eventKey = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
const timeLabel = (iso) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
const remindLabel = (m) => (REMIND.find(r => r.v === m) || {}).l || `${m} min antes`

function toBRTParts(iso) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return { date, time }
}

export default function CalendarPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [form, setForm] = useState(null)

  const { data: eventos = [] } = useQuery({ queryKey: ['calendar'], queryFn: () => calendarService.list() })

  const saveMut = useMutation({
    mutationFn: (ev) => {
      const startsAt = ev.allDay ? `${ev.date}T12:00:00-03:00` : `${ev.date}T${ev.time || '09:00'}:00-03:00`
      const body = {
        title: ev.title.trim(), description: ev.description || '', startsAt,
        allDay: ev.allDay, remindMinutes: Number(ev.remindMinutes), vertical: ev.vertical || null,
      }
      return ev.id ? calendarService.update(ev.id, body) : calendarService.create(body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar'] }); setForm(null); toast.success('Evento salvo') },
    onError:  () => toast.error('Erro ao salvar'),
  })
  const delMut = useMutation({
    mutationFn: (id) => calendarService.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['calendar'] }); setForm(null); toast.success('Evento removido') },
  })

  // ── grade de 6 semanas (42 células) começando no domingo ──
  const monthStart = new Date(cursor.y, cursor.m, 1)
  const gridStart = new Date(cursor.y, cursor.m, 1 - monthStart.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    return { key: keyOf(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: d.getMonth() === cursor.m }
  })
  const hojeKey = eventKey(now.toISOString())

  // eventos por dia
  const porDia = {}
  for (const e of eventos) { (porDia[eventKey(e.startsAt)] ||= []).push(e) }
  for (const k in porDia) porDia[k].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))

  const mesLabel = monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const prev = () => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const next = () => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })
  const hoje = () => setCursor({ y: now.getFullYear(), m: now.getMonth() })

  function novoEm(key) { setForm({ title: '', date: key, time: '09:00', allDay: false, remindMinutes: 60, vertical: '', description: '' }) }
  function editar(ev, e) {
    e.stopPropagation()
    const { date, time } = toBRTParts(ev.startsAt)
    setForm({ id: ev.id, title: ev.title, date, time, allDay: ev.allDay, remindMinutes: ev.remindMinutes, vertical: ev.vertical || '', description: ev.description || '' })
  }
  function salvar() {
    if (!form.title.trim()) return toast.error('Informe o título')
    if (!form.date) return toast.error('Informe a data')
    saveMut.mutate(form)
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader title="Calendário" subtitle="Clique num dia para adicionar um evento" icon={CalendarDays}>
        <button onClick={() => novoEm(hojeKey)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all">
          <Plus size={14} /> Novo evento
        </button>
      </PageHeader>

      {/* Navegação do mês */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={prev} className="p-1.5 rounded text-muted hover:text-ink hover:bg-surfaceHover"><ChevronLeft size={18} /></button>
          <button onClick={next} className="p-1.5 rounded text-muted hover:text-ink hover:bg-surfaceHover"><ChevronRight size={18} /></button>
          <span className="text-ink font-semibold text-sm capitalize ml-2">{mesLabel}</span>
        </div>
        <button onClick={hoje} className="text-xs px-2.5 py-1 rounded border border-border text-muted hover:text-ink hover:bg-surfaceHover">Hoje</button>
      </div>

      {/* Grade */}
      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-[10px] uppercase tracking-wider text-muted font-bold text-center py-2">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            const evs = porDia[c.key] || []
            const isHoje = c.key === hojeKey
            return (
              <div key={c.key + i}
                onClick={() => novoEm(c.key)}
                className={`min-h-[92px] border-b border-r border-border p-1.5 cursor-pointer transition-colors hover:bg-surfaceHover
                  ${c.inMonth ? '' : 'bg-surfaceHover/30'} ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}>
                <div className={`text-[11px] font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full
                  ${isHoje ? 'bg-primary text-white' : c.inMonth ? 'text-ink' : 'text-muted/50'}`}>
                  {c.day}
                </div>
                <div className="flex flex-col gap-0.5">
                  {evs.slice(0, 3).map(ev => (
                    <button key={ev.id} onClick={(e) => editar(ev, e)} title={ev.title}
                      className="text-left text-[10px] leading-tight px-1 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 truncate">
                      {!ev.allDay && <span className="font-mono opacity-70 mr-1">{timeLabel(ev.startsAt)}</span>}
                      {ev.title}
                    </button>
                  ))}
                  {evs.length > 3 && <span className="text-[10px] text-muted pl-1">+{evs.length - 3} mais</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal criar/editar */}
      {form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-surface border border-border rounded-lg w-full max-w-md p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-ink font-semibold text-sm">{form.id ? 'Editar evento' : 'Novo evento'}</h3>
              <button onClick={() => setForm(null)} className="text-muted hover:text-ink"><X size={16} /></button>
            </div>

            <input autoFocus placeholder="Título do evento" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} className="input" />

            <div className="flex gap-2">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input flex-1" />
              {!form.allDay && <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="input w-28" />}
            </div>

            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" checked={form.allDay} onChange={e => setForm({ ...form, allDay: e.target.checked })} />
              Dia inteiro
            </label>

            <div className="flex gap-2">
              <select value={form.remindMinutes} onChange={e => setForm({ ...form, remindMinutes: Number(e.target.value) })} className="input flex-1">
                {REMIND.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
              <select value={form.vertical} onChange={e => setForm({ ...form, vertical: e.target.value })} className="input flex-1">
                {VERTICAIS.map(v => <option key={v} value={v}>{v ? v.toUpperCase() : 'Sem vertical'}</option>)}
              </select>
            </div>

            <textarea placeholder="Descrição (opcional)" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} className="input resize-none h-20" />

            <div className="text-[11px] text-muted -mt-1 flex items-center gap-1">
              <Bell size={11} />
              {form.remindMinutes > 0
                ? `O Pulse avisa no Discord/WhatsApp ${remindLabel(form.remindMinutes).toLowerCase()}.`
                : 'Sem lembrete — só aparece no calendário.'}
            </div>

            <div className="flex justify-between items-center mt-1">
              {form.id
                ? <button onClick={() => { if (window.confirm(`Excluir "${form.title}"?`)) delMut.mutate(form.id) }}
                    className="flex items-center gap-1 text-xs text-red/70 hover:text-red"><Trash2 size={13} /> Excluir</button>
                : <span />}
              <div className="flex gap-2">
                <button onClick={() => setForm(null)} className="text-xs px-3 py-1.5 rounded text-muted hover:text-ink">Cancelar</button>
                <button onClick={salvar} disabled={saveMut.isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50">
                  {saveMut.isPending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
