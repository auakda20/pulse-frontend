import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionService, goalService, activityService } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  LogIn, LogOut, Plus, Check, Trash2, Clock,
  Flag, GripVertical, Bell, BellOff
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const VERTICALS = ['studio', 'originals', 'auto', 'agency', 'geral']
const V_LABEL   = { studio: 'Studio', originals: 'Originals', auto: 'Auto', agency: 'Agency', geral: 'Geral' }
const V_COLOR   = {
  studio:    'bg-violet/10 text-violet border-violet/20',
  originals: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  auto:      'bg-green/10 text-green border-green/20',
  agency:    'bg-yellow/10 text-yellow border-yellow/20',
  geral:     'bg-white/5 text-mutedLight border-borderLight',
}
const P_CONFIG  = {
  high:   { label: 'Alta',  color: 'text-red',       bg: 'bg-red/10 border-red/20' },
  medium: { label: 'Media', color: 'text-yellow',     bg: 'bg-yellow/10 border-yellow/20' },
  low:    { label: 'Baixa', color: 'text-mutedLight', bg: 'bg-white/5 border-borderLight' },
}

function fmtMinutes(min) {
  if (!min) return '0h 0min'
  return Math.floor(min / 60) + 'h ' + (min % 60) + 'min'
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
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  } catch (e) {}
}

function SortableGoal({ goal, onToggle, onDelete, onPriority }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const [showPriority, setShowPriority] = useState(false)
  const p = P_CONFIG[goal.priority] || P_CONFIG.medium

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group py-1.5 border-b border-border/40 last:border-0">
      <button {...attributes} {...listeners} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted">
        <GripVertical size={13} />
      </button>
      <button
        onClick={() => onToggle(goal.id)}
        className={'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ' +
          (goal.completed ? 'bg-green border-green' : 'border-borderLight hover:border-primary/60')}
      >
        {goal.completed && <Check size={9} className="text-white" />}
      </button>
      <span className={'text-sm flex-1 ' + (goal.completed ? 'line-through text-muted' : 'text-white/90')}>
        {goal.title}
      </span>
      <div className="relative">
        <button
          onClick={() => setShowPriority(v => !v)}
          className={'badge border text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity ' + p.bg + ' ' + p.color}
        >
          <Flag size={9} />{p.label}
        </button>
        <AnimatePresence>
          {showPriority && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 top-6 z-20 bg-surface border border-border rounded-lg shadow-glass py-1 w-28"
            >
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
        <Trash2 size={12} className="text-muted hover:text-red transition-colors" />
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const qc   = useQueryClient()
  const user = JSON.parse(localStorage.getItem('pulse_user') || '{}')

  const [goalTitle,    setGoalTitle]    = useState('')
  const [goalVertical, setGoalVertical] = useState('geral')
  const [goalPriority, setGoalPriority] = useState('medium')
  const [actTitle,     setActTitle]     = useState('')
  const [actVertical,  setActVertical]  = useState('geral')
  const [actDesc,      setActDesc]      = useState('')
  const [goalOrder,    setGoalOrder]    = useState([])
  const [reminderOn,   setReminderOn]   = useState(true)
  const lastReminder = useRef(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: todayData }  = useQuery({ queryKey: ['session'],    queryFn: sessionService.today,   refetchInterval: 60000 })
  const { data: goals = [] } = useQuery({ queryKey: ['goals'],      queryFn: goalService.today,      refetchInterval: 30000 })
  const { data: acts  = [] } = useQuery({ queryKey: ['activities'], queryFn: activityService.today,  refetchInterval: 30000 })

  const openSession  = todayData?.openSession || null
  const closedTotal  = todayData?.totalMinutes || 0
  const hadSession   = (todayData?.sessions?.length || 0) > 0
  const isCheckedIn  = !!openSession
  const elapsed      = useElapsed(openSession?.checkinAt)
  const totalDisplay = closedTotal + (isCheckedIn ? elapsed : 0)

  useEffect(() => {
    if (goals.length) setGoalOrder(goals.map(g => g.id))
  }, [goals.length])

  useEffect(() => {
    if (!reminderOn || !isCheckedIn || !openSession) return
    const id = setInterval(() => {
      const minutesIn = Math.floor((Date.now() - new Date(openSession.checkinAt)) / 60000)
      const last = lastReminder.current
      if (minutesIn > 0 && minutesIn % 30 === 0 && last !== minutesIn) {
        playReminderSound()
        lastReminder.current = minutesIn
        toast('Lembrete: voce ainda esta em check-in', { icon: '🔔', duration: 5000 })
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

  function handleDragEnd({ active, over }) {
    if (active.id !== over?.id)
      setGoalOrder(prev => arrayMove(prev, prev.indexOf(active.id), prev.indexOf(over.id)))
  }

  const sortedGoals    = [...goals].sort((a, b) => goalOrder.indexOf(a.id) - goalOrder.indexOf(b.id))
  const completedGoals = goals.filter(g => g.completed).length
  const progressPct    = goals.length ? Math.round((completedGoals / goals.length) * 100) : 0

  const nowSP = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Ola, {user.name?.split(' ')[0]}</h1>
          <p className="text-mutedLight text-sm mt-0.5 capitalize">{nowSP}</p>
        </div>
        <button onClick={() => setReminderOn(v => !v)}
          className={'btn-ghost text-xs gap-1.5 ' + (reminderOn ? 'text-primary' : '')}>
          {reminderOn ? <Bell size={14} /> : <BellOff size={14} />}
          {reminderOn ? 'Lembrete ativo' : 'Silenciado'}
        </button>
      </div>

      {/* Check-in */}
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isCheckedIn && <span className="w-2 h-2 rounded-full bg-green animate-pulse" />}
              <span className="text-white font-medium text-sm">
                {isCheckedIn ? 'Em trabalho' : hadSession ? 'Em pausa' : 'Pronto para comecar?'}
              </span>
            </div>
            <div className="text-mutedLight text-xs flex items-center gap-1.5">
              <Clock size={11} />
              {totalDisplay > 0 ? fmtMinutes(totalDisplay) + ' trabalhados hoje' : 'Sem check-in hoje'}
            </div>
            {hadSession && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {todayData.sessions.map(s => (
                  <span key={s.id} className="text-xs text-muted bg-surfaceHover border border-border rounded-md px-2 py-0.5">
                    {new Date(s.checkinAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                    {s.checkoutAt
                      ? ' - ' + new Date(s.checkoutAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) + ' (' + fmtMinutes(s.durationMinutes) + ')'
                      : ' - agora'}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!isCheckedIn && (
              <button onClick={() => checkinMut.mutate()} disabled={checkinMut.isPending} className="btn-primary text-xs gap-1.5">
                <LogIn size={13} /> Check-in
              </button>
            )}
            {isCheckedIn && (
              <button onClick={() => checkoutMut.mutate()} disabled={checkoutMut.isPending} className="btn-outline text-xs gap-1.5">
                <LogOut size={13} /> Check-out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metas */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-white font-medium text-sm">Metas do dia</div>
            <div className="text-muted text-xs mt-0.5">{completedGoals}/{goals.length} concluidas</div>
          </div>
          {goals.length > 0 && (
            <div className="w-28 h-1.5 bg-surfaceHover rounded-full overflow-hidden">
              <motion.div className="h-full bg-green rounded-full"
                animate={{ width: progressPct + '%' }} transition={{ duration: 0.4 }} />
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <input className="input text-xs py-1.5 flex-1" placeholder="Nova meta..."
            value={goalTitle} onChange={e => setGoalTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && goalTitle && addGoalMut.mutate({ title: goalTitle, vertical: goalVertical, priority: goalPriority })} />
          <select className="input text-xs py-1.5 w-28" value={goalVertical} onChange={e => setGoalVertical(e.target.value)}>
            {VERTICALS.map(v => <option key={v} value={v}>{V_LABEL[v]}</option>)}
          </select>
          <select className="input text-xs py-1.5 w-24" value={goalPriority} onChange={e => setGoalPriority(e.target.value)}>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baixa</option>
          </select>
          <button onClick={() => goalTitle && addGoalMut.mutate({ title: goalTitle, vertical: goalVertical, priority: goalPriority })}
            className="btn-primary text-xs px-3 py-1.5">
            <Plus size={13} />
          </button>
        </div>

        {goals.length === 0 && <p className="text-muted text-xs text-center py-4">Nenhuma meta ainda</p>}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={goalOrder} strategy={verticalListSortingStrategy}>
            {sortedGoals.map(g => (
              <SortableGoal key={g.id} goal={g}
                onToggle={id => toggleGoal.mutate(id)}
                onDelete={id => delGoal.mutate(id)}
                onPriority={(id, priority) => priorityGoal.mutate({ id, priority })} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Registrar atividade */}
      <div className="card">
        <div className="text-white font-medium text-sm mb-4">Registrar atividade</div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input className="input text-xs py-1.5 flex-1" placeholder="O que voce fez?"
              value={actTitle} onChange={e => setActTitle(e.target.value)} />
            <select className="input text-xs py-1.5 w-28" value={actVertical} onChange={e => setActVertical(e.target.value)}>
              {VERTICALS.map(v => <option key={v} value={v}>{V_LABEL[v]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input className="input text-xs py-1.5 flex-1" placeholder="Descricao (opcional)"
              value={actDesc} onChange={e => setActDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && actTitle && addActMut.mutate({ title: actTitle, vertical: actVertical, description: actDesc })} />
            <button onClick={() => actTitle && addActMut.mutate({ title: actTitle, vertical: actVertical, description: actDesc })}
              className="btn-primary text-xs px-3 py-1.5">
              <Plus size={13} />
            </button>
          </div>
        </div>
      </div>

      {acts.length > 0 && (
        <div className="card">
          <div className="text-white font-medium text-sm mb-4">
            Atividades de hoje <span className="text-muted font-normal text-xs ml-1">{acts.length}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {acts.map(a => (
              <div key={a.id} className="flex items-start gap-2.5 group border-b border-border/30 last:border-0 pb-2.5 last:pb-0">
                <span className="w-1 h-1 rounded-full bg-muted mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/90 text-sm">{a.title}</span>
                    <span className={'badge border text-xs ' + V_COLOR[a.vertical]}>{V_LABEL[a.vertical]}</span>
                  </div>
                  {a.description && <p className="text-muted text-xs mt-0.5">{a.description}</p>}
                </div>
                <button onClick={() => delAct.mutate(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0">
                  <Trash2 size={12} className="text-muted hover:text-red transition-colors" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
