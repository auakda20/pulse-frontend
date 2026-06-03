import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendarService } from '../services/api'
import { Plus, Pencil, Trash2, X, CalendarDays, Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'

const TZ = 'America/Sao_Paulo'
const REMIND = [
  { v: 0, l: 'Sem lembrete' }, { v: 15, l: '15 min antes' }, { v: 30, l: '30 min antes' },
  { v: 60, l: '1h antes' }, { v: 120, l: '2h antes' }, { v: 1440, l: '1 dia antes' },
]
const VERTICAIS = ['', 'auto', 'studio', 'originals', 'agency', 'geral']
const VAZIO = { title: '', date: '', time: '09:00', allDay: false, remindMinutes: 60, vertical: '', description: '' }

function currentUser() {
  try { return JSON.parse(localStorage.getItem('pulse_user') || '{}') } catch { return {} }
}

// ISO (UTC) → partes no fuso BRT, para preencher os inputs ao editar.
function toBRTParts(iso) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return { date, time }
}
function dateKey(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}
function dateLabel(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(iso))
}
function timeLabel(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}
function remindLabel(min) {
  return (REMIND.find(r => r.v === min) || {}).l || `${min} min antes`
}

export default function CalendarPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null) // null = fechado

  const { data: eventos = [] } = useQuery({ queryKey: ['calendar'], queryFn: () => calendarService.list() })

  const saveMut = useMutation({
    mutationFn: (ev) => {
      const offset = '-03:00' // BRT
      const startsAt = ev.allDay
        ? `${ev.date}T12:00:00${offset}`
        : `${ev.date}T${ev.time || '09:00'}:00${offset}`
      const body = {
        title: ev.title.trim(),
        description: ev.description || '',
        startsAt,
        allDay: ev.allDay,
        remindMinutes: Number(ev.remindMinutes),
        vertical: ev.vertical || null,
      }
      return ev.id ? calendarService.update(ev.id, body) : calendarService.create(body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar'] }); setForm(null); toast.success('Evento salvo') },
    onError:  () => toast.error('Erro ao salvar'),
  })
  const delMut = useMutation({
    mutationFn: (id) => calendarService.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['calendar'] }); toast.success('Evento removido') },
  })

  function novo() { setForm({ ...VAZIO }) }
  function editar(ev) {
    const { date, time } = toBRTParts(ev.startsAt)
    setForm({ id: ev.id, title: ev.title, date, time, allDay: ev.allDay, remindMinutes: ev.remindMinutes, vertical: ev.vertical || '', description: ev.description || '' })
  }
  function excluir(ev) { if (window.confirm(`Excluir "${ev.title}"?`)) delMut.mutate(ev.id) }
  function salvar() {
    if (!form.title.trim()) return toast.error('Informe o título')
    if (!form.date) return toast.error('Informe a data')
    saveMut.mutate(form)
  }

  // Agrupa por dia (BRT), só do "hoje" em diante.
  const hojeKey = dateKey(new Date().toISOString())
  const futuros = eventos.filter(e => dateKey(e.startsAt) >= hojeKey)
  const grupos = {}
  for (const e of futuros) { (grupos[dateKey(e.startsAt)] ||= []).push(e) }
  const diasOrdenados = Object.keys(grupos).sort()

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader title="Calendário" subtitle="Eventos do time — aparecem no seu calendar e o Pulse te lembra" icon={CalendarDays}>
        <button onClick={novo}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all">
          <Plus size={14} /> Novo evento
        </button>
      </PageHeader>

      {diasOrdenados.length === 0 && (
        <div className="card text-center text-muted text-sm py-10">
          Nenhum evento futuro. Clique em <span className="text-primary">Novo evento</span> para começar.
        </div>
      )}

      {diasOrdenados.map(dia => (
        <div key={dia}>
          <div className="text-[11px] font-bold tracking-widest text-primary/80 uppercase mb-2">
            {dateLabel(grupos[dia][0].startsAt)}
          </div>
          <div className="flex flex-col gap-2">
            {grupos[dia].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).map(ev => (
              <div key={ev.id} className="card flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-xs font-mono text-muted w-16 flex-shrink-0 pt-0.5">
                    {ev.allDay ? 'dia todo' : timeLabel(ev.startsAt)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-ink font-medium">{ev.title}</span>
                      {ev.vertical && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted">{ev.vertical}</span>
                      )}
                    </div>
                    {ev.description && <div className="text-xs text-muted mt-0.5">{ev.description}</div>}
                    <div className="flex items-center gap-1 text-[11px] text-muted mt-1">
                      {ev.remindMinutes > 0
                        ? <><Bell size={11} /> {remindLabel(ev.remindMinutes)}</>
                        : <><BellOff size={11} /> sem lembrete</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => editar(ev)} className="p-1 rounded text-muted hover:text-ink hover:bg-surfaceHover"><Pencil size={13} /></button>
                  <button onClick={() => excluir(ev)} className="p-1 rounded text-muted hover:text-red hover:bg-red/5"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal de criar/editar */}
      {form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="bg-surface border border-border rounded-lg w-full max-w-md p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-ink font-semibold text-sm">{form.id ? 'Editar evento' : 'Novo evento'}</h3>
              <button onClick={() => setForm(null)} className="text-muted hover:text-ink"><X size={16} /></button>
            </div>

            <input autoFocus placeholder="Título do evento" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input" />

            <div className="flex gap-2">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input flex-1" />
              {!form.allDay && (
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="input w-28" />
              )}
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
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="input resize-none h-20" />

            <div className="text-[11px] text-muted -mt-1">
              {form.remindMinutes > 0
                ? `O Pulse vai avisar no Discord/WhatsApp ${remindLabel(form.remindMinutes).toLowerCase()}.`
                : 'Sem lembrete — só aparece no calendário.'}
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <button onClick={() => setForm(null)} className="text-xs px-3 py-1.5 rounded text-muted hover:text-ink">Cancelar</button>
              <button onClick={salvar} disabled={saveMut.isPending}
                className="text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50">
                {saveMut.isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
