import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionService, goalService, activityService, pendenciaService } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  LogIn, LogOut, Plus, Check, Trash2, Clock, Flag, GripVertical, Bell, BellOff,
  Timer, AlertTriangle, Activity as ActivityIcon, Target,
} from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const VERTICALS = ['auto', 'studio']
const V_LABEL   = { auto: 'Auto', studio: 'Studio', originals: 'Originals', agency: 'Agency', geral: 'Geral' }
const V_COLOR   = {
  auto:      'bg-primary/10 text-primary border-primary/20',
  studio:    'bg-violet/10 text-violet border-violet/20',
  originals: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  agency:    'bg-yellow/10 text-yellow border-yellow/20',
  geral:     'bg-surfaceHover text-mutedLight border-borderLight',
}
const P_CONFIG = {
  high:   { label: 'Alta',  color: 'text-red',       bg: 'bg-red/10 border-red/20' },
  medium: { label: 'Media', color: 'text-yellow',    bg: 'bg-yellow/10 border-yellow/20' },
  low:    { label: 'Baixa', color: 'text-mutedLight', bg: 'bg-surfaceHover border-borderLight' },
}

function fmtMinutes(min) {
  if (!min) return '0h00'
  return Math.floor(min / 60) + 'h' + String(min % 60).padStart(2, '0')
}

function useElapsed(checkinAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!checkinAt) { setElapsed(0); return }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(checkinAt)) / 60000))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [checkinAt])
  return elapsed
}

function playReminderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.start(t); osc.stop(t + 0.5)
    })
  } catch (e) {}
}

// ── Card de estatística (KPI) ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    green:   'bg-green/10 text-green',
    red:     'bg-red/10 text-red',
    muted:   'bg-surfaceHover text-muted',
  }
  return (
    <div className="card-sm flex items-center gap-3">
      <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + tones[tone]}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold text-ink leading-none tracking-tight">{value}</div>
        <div className="text-muted text-xs mt-1 truncate">{label}{sub && <span className="text-mutedLight"> · {sub}</span>}</div>
      </div>
    </div>
  )
}

function SortableGoal({ goal, onToggle, onDelete, onPriority }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const [showPriority, setShowPriority] = useState(false)
  const p = P_CONFIG[goal.priority] || P_CONFIG.medium

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group py-2 border-b border-border/60 last:border-0">
      <button {...attributes} {...listeners} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-mutedLight">
        <GripVertical size={13} />
      </button>
      <button onClick={() => onToggle(goal.id)}
        className={'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ' +
          (goal.completed ? 'bg-green border-green' : 'border-borderLight hover:border-primary')}>
        {goal.completed && <Check size={9} className="text-white" />}
      </button>
      <span className={'text-sm flex-1 ' + (goal.completed ? 'line-through text-mutedLight' : 'text-ink')}>{goal.title}</span>
      <div className="relative">
        <button onClick={() => setShowPriority(v => !v)}
          className={'badge border text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity ' + p.bg + ' ' + p.color}>
          <Flag size={9} />{p.label}
        </button>
        <AnimatePresence>
          {showPriority && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 top-6 z-20 bg-surface border border-border rounded-lg shadow-glass py-1 w-28">
              {['high','medium','low'].map(pr => (
                <button key={pr} onClick={() => { onPriority(goal.id, pr); setShowPriority(false) }}
                  className={'w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surfaceHover ' + P_CONFIG[pr].color}>
                  <Flag size={10} />{P_CONFIG[pr].label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className={'badge border text-xs ' + V_COLOR[goal.vertical]}>{V_LABEL[goal.vertical]}</span>
      <button onClick={() => onDelete(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 size={12} className="text-mutedLight hover:text-red transition-colors" />
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const qc = useQueryClient()
  const user = JSON.parse(localStorage.getItem('pulse_user') || '{}')

  const [goalTitle, setGoalTitle] = useState('')
  const [goalVertical, setGoalVertical] = useState('auto')
  const [goalPriority, setGoalPriority] = useState('medium')
  const [actTitle, setActTitle] = useState('')
  const [actVertical, setActVertical] = useState('auto')
  const [actDesc, setActDesc] = useState('')
  const [goalOrder, setGoalOrder] = useState([])
  const [reminderOn, setReminderOn] = useState(true)
  const lastReminder = useRef(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: todayData }   = useQuery({ queryKey: ['session'],     queryFn: sessionService.today,   refetchInterval: 60000 })
  const { data: goals = [] }  = useQuery({ queryKey: ['goals'],       queryFn: goalService.today,      refetchInterval: 30000 })
  const { data: acts  = [] }  = useQuery({ queryKey: ['activities'],  queryFn: activityService.today,  refetchInterval: 30000 })
  const { data: pend  = [] }  = useQuery({ queryKey: ['pendencias'],  queryFn: pendenciaService.list,  refetchInterval: 60000 })

  const openSession  = todayData?.openSession || null
  const closedTotal  = todayData?.totalMinutes || 0
  const hadSession   = (todayData?.sessions?.length || 0) > 0
  const isCheckedIn  = !!openSession
  const elapsed      = useElapsed(openSession?.checkinAt)
  const totalDisplay = closedTotal + (isCheckedIn ? elapsed : 0)

  const openPend = [...pend].filter(p => !p.done)
    .sort((a, b) => (a.priority === 'alta' ? 0 : 1) - (b.priority === 'alta' ? 0 : 1))

  useEffect(() => { if (goals.length) setGoalOrder(goals.map(g => g.id)) }, [goals.length])

  useEffect(() => {
    if (!reminderOn || !isCheckedIn || !openSession) return
    const id = setInterval(() => {
      const minutesIn = Math.floor((Date.now() - new Date(openSession.checkinAt)) / 60000)
      if (minutesIn > 0 && minutesIn % 30 === 0 && lastReminder.current !== minutesIn) {
        playReminderSound(); lastReminder.current = minutesIn
        toast('Lembrete: você ainda está em check-in', { duration: 5000 })
      }
    }, 60000)
    return () => clearInterval(id)
  }, [isCheckedIn, reminderOn, openSession])

  const checkinMut   = useMutation({ mutationFn: sessionService.checkin,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['session'] }); toast.success('Check-in feito!') }, onError: e => toast.error(e.response?.data?.error || 'Erro') })
  const checkoutMut  = useMutation({ mutationFn: sessionService.checkout, onSuccess: () => { qc.invalidateQueries({ queryKey: ['session'] }); toast.success('Check-out feito!') }, onError: e => toast.error(e.response?.data?.error || 'Erro') })
  const addGoalMut   = useMutation({ mutationFn: goalService.create,      onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setGoalTitle('') } })
  const toggleGoal   = useMutation({ mutationFn: goalService.toggle,      onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }) })
  const priorityGoal = useMutation({ mutationFn: ({ id, priority }) => goalService.priority(id, priority), onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }) })
  const delGoal      = useMutation({ mutationFn: goalService.remove,      onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }) })
  const addActMut    = useMutation({ mutationFn: activityService.create,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); setActTitle(''); setActDesc('') } })
  const delAct       = useMutation({ mutationFn: activityService.remove,  onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }) })
  const togglePend   = useMutation({ mutationFn: (p) => pendenciaService.toggle(p.id, true, user.name), onSuccess: () => qc.invalidateQueries({ queryKey: ['pendencias'] }) })

  function handleDragEnd({ active, over }) {
    if (active.id !== over?.id)
      setGoalOrder(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)))
  }

  const sortedGoals    = [...goals].sort((a, b) => goalOrder.indexOf(a.id) - goalOrder.indexOf(b.id))
  const completedGoals = goals.filter(g => g.completed).length
  const progressPct    = goals.length ? Math.round((completedGoals / goals.length) * 100) : 0

  const nowSP = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Olá, {user.name?.split(' ')[0]}</h1>
          <p className="text-muted text-sm mt-0.5 capitalize">{nowSP}</p>
        </div>
        <button onClick={() => setReminderOn(v => !v)} className={'btn-ghost text-xs gap-1.5 ' + (reminderOn ? 'text-primary' : '')}>
          {reminderOn ? <Bell size={14} /> : <BellOff size={14} />}{reminderOn ? 'Lembrete ativo' : 'Silenciado'}
        </button>
      </div>

      {/* Hero — status do dia */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2A9BD8 0%, #1D7FB8 100%)' }}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              {isCheckedIn && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              {isCheckedIn ? 'Em trabalho' : hadSession ? 'Em pausa' : 'Pronto para começar'}
            </div>
            <div className="font-display text-5xl font-bold mt-1 tracking-tight">{progressPct}%</div>
            <div className="text-white/80 text-sm">metas do dia concluídas</div>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="font-display text-2xl font-bold">{completedGoals}/{goals.length}</div>
              <div className="text-white/70 text-xs">Metas</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{fmtMinutes(totalDisplay)}</div>
              <div className="text-white/70 text-xs">Hoje</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{openPend.length}</div>
              <div className="text-white/70 text-xs">Pendências</div>
            </div>
            {!isCheckedIn
              ? <button onClick={() => checkinMut.mutate()} disabled={checkinMut.isPending}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-white text-primary hover:bg-white/90 transition-all"><LogIn size={15} /> Check-in</button>
              : <button onClick={() => checkoutMut.mutate()} disabled={checkoutMut.isPending}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-all"><LogOut size={15} /> Check-out</button>}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Timer}        label="Trabalhado hoje" value={fmtMinutes(totalDisplay)} tone={isCheckedIn ? 'green' : 'muted'} />
        <StatCard icon={Target}       label="Metas do dia"    value={`${completedGoals}/${goals.length}`} sub={progressPct + '%'} />
        <StatCard icon={AlertTriangle} label="Pendências abertas" value={openPend.length} tone={openPend.length ? 'red' : 'muted'} />
        <StatCard icon={ActivityIcon} label="Atividades hoje" value={acts.length} />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Metas */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-semibold text-sm">Metas do dia</h2>
              {goals.length > 0 && (
                <div className="w-28 h-1.5 bg-surfaceHover rounded-full overflow-hidden">
                  <motion.div className="h-full bg-green rounded-full" animate={{ width: progressPct + '%' }} transition={{ duration: 0.4 }} />
                </div>
              )}
            </div>
            <div className="flex gap-2 mb-3">
              <input className="input text-xs py-1.5 flex-1" placeholder="Nova meta..." value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goalTitle && addGoalMut.mutate({ title: goalTitle, vertical: goalVertical, priority: goalPriority })} />
              <select className="input text-xs py-1.5 w-24" value={goalVertical} onChange={e => setGoalVertical(e.target.value)}>
                {VERTICALS.map(v => <option key={v} value={v}>{V_LABEL[v]}</option>)}
              </select>
              <select className="input text-xs py-1.5 w-20" value={goalPriority} onChange={e => setGoalPriority(e.target.value)}>
                <option value="high">Alta</option><option value="medium">Media</option><option value="low">Baixa</option>
              </select>
              <button onClick={() => goalTitle && addGoalMut.mutate({ title: goalTitle, vertical: goalVertical, priority: goalPriority })} className="btn-primary text-xs px-3 py-1.5"><Plus size={13} /></button>
            </div>
            {goals.length === 0 && <p className="text-mutedLight text-xs text-center py-6">Nenhuma meta ainda — adicione a primeira acima.</p>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={goalOrder} strategy={verticalListSortingStrategy}>
                {sortedGoals.map(g => (
                  <SortableGoal key={g.id} goal={g}
                    onToggle={id => toggleGoal.mutate(id)} onDelete={id => delGoal.mutate(id)}
                    onPriority={(id, priority) => priorityGoal.mutate({ id, priority })} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Registrar atividade */}
          <div className="card">
            <h2 className="text-ink font-semibold text-sm mb-3">Registrar atividade</h2>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input className="input text-xs py-1.5 flex-1" placeholder="O que você fez?" value={actTitle} onChange={e => setActTitle(e.target.value)} />
                <select className="input text-xs py-1.5 w-24" value={actVertical} onChange={e => setActVertical(e.target.value)}>
                  {VERTICALS.map(v => <option key={v} value={v}>{V_LABEL[v]}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input className="input text-xs py-1.5 flex-1" placeholder="Descrição (opcional)" value={actDesc}
                  onChange={e => setActDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && actTitle && addActMut.mutate({ title: actTitle, vertical: actVertical, description: actDesc })} />
                <button onClick={() => actTitle && addActMut.mutate({ title: actTitle, vertical: actVertical, description: actDesc })} className="btn-primary text-xs px-3 py-1.5"><Plus size={13} /></button>
              </div>
            </div>
            {acts.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-border/60">
                {acts.map(a => (
                  <div key={a.id} className="flex items-start gap-2.5 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-ink text-sm">{a.title}</span>
                        <span className={'badge border text-xs ' + V_COLOR[a.vertical]}>{V_LABEL[a.vertical]}</span>
                      </div>
                      {a.description && <p className="text-muted text-xs mt-0.5">{a.description}</p>}
                    </div>
                    <button onClick={() => delAct.mutate(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0">
                      <Trash2 size={12} className="text-mutedLight hover:text-red transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-5">
          {/* Sessões de hoje */}
          <div className="card">
            <h2 className="text-ink font-semibold text-sm mb-3 flex items-center gap-1.5"><Clock size={14} className="text-muted" /> Sessões de hoje</h2>
            {hadSession ? (
              <div className="flex flex-col gap-1.5">
                {todayData.sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink">
                      {new Date(s.checkinAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                      {s.checkoutAt ? ' – ' + new Date(s.checkoutAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : ' – agora'}
                    </span>
                    <span className="text-muted">{s.checkoutAt ? fmtMinutes(s.durationMinutes) : 'em curso'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-mutedLight text-xs">Nenhum check-in hoje.</p>}
          </div>

          {/* Pendências críticas */}
          <div className="card">
            <h2 className="text-ink font-semibold text-sm mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red" /> Pendências críticas
              {openPend.length > 0 && <span className="text-muted font-normal text-xs">{openPend.length}</span>}
            </h2>
            {openPend.length === 0 ? (
              <p className="text-mutedLight text-xs">Tudo em dia.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {openPend.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-start gap-2 group">
                    <button onClick={() => togglePend.mutate(p)} title="Marcar como resolvida"
                      className="w-4 h-4 rounded border border-borderLight hover:border-primary flex items-center justify-center flex-shrink-0 mt-0.5 transition-all">
                      <Check size={9} className="text-primary opacity-0 group-hover:opacity-100" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-ink text-xs leading-snug">{p.text}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="badge text-[10px] bg-surfaceHover text-muted border border-border">{p.project}</span>
                        <span className={'text-[10px] ' + (p.priority === 'alta' ? 'text-red' : 'text-yellow')}>● {p.priority}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
