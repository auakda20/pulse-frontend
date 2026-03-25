import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionService, goalService, activityService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogIn, LogOut, Plus, Check, Trash2, Users, Clock } from 'lucide-react'

const VERTICALS = ['studio', 'originals', 'auto', 'agency', 'geral']
const V_LABEL   = { studio: 'Studio', originals: 'Originals', auto: 'Auto', agency: 'Agency', geral: 'Geral' }
const V_COLOR   = { studio: 'bg-purple-500/10 text-purple-400 border-purple-500/20', originals: 'bg-blue-500/10 text-blue-400 border-blue-500/20', auto: 'bg-green/10 text-green border-green/20', agency: 'bg-yellow/10 text-yellow border-yellow/20', geral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' }

function fmtMinutes(min) {
  if (!min) return '0h 0min'
  return `${Math.floor(min / 60)}h ${min % 60}min`
}

function useTimer(checkinAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!checkinAt) return
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(checkinAt)) / 60000))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [checkinAt])
  return elapsed
}

export default function DashboardPage() {
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const user      = JSON.parse(localStorage.getItem('pulse_user') || '{}')

  const [goalTitle,    setGoalTitle]    = useState('')
  const [goalVertical, setGoalVertical] = useState('geral')
  const [actTitle,     setActTitle]     = useState('')
  const [actVertical,  setActVertical]  = useState('geral')
  const [actDesc,      setActDesc]      = useState('')

  const { data: session }    = useQuery({ queryKey: ['session'],    queryFn: sessionService.today,   refetchInterval: 60000 })
  const { data: goals = [] } = useQuery({ queryKey: ['goals'],      queryFn: goalService.today,      refetchInterval: 30000 })
  const { data: acts  = [] } = useQuery({ queryKey: ['activities'], queryFn: activityService.today,  refetchInterval: 30000 })

  const elapsed = useTimer(session?.checkinAt)

  const checkinMut  = useMutation({ mutationFn: sessionService.checkin,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['session'] }); toast.success('Check-in feito!') }, onError: e => toast.error(e.response?.data?.error || 'Erro') })
  const checkoutMut = useMutation({ mutationFn: sessionService.checkout, onSuccess: () => { qc.invalidateQueries({ queryKey: ['session'] }); toast.success('Check-out feito!') }, onError: e => toast.error(e.response?.data?.error || 'Erro') })
  const addGoalMut  = useMutation({ mutationFn: goalService.create,      onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setGoalTitle('') } })
  const toggleGoal  = useMutation({ mutationFn: goalService.toggle,      onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }) })
  const delGoal     = useMutation({ mutationFn: goalService.remove,      onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }) })
  const addActMut   = useMutation({ mutationFn: activityService.create,  onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); setActTitle(''); setActDesc('') } })
  const delAct      = useMutation({ mutationFn: activityService.remove,  onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }) })

  function logout() {
    localStorage.removeItem('pulse_token')
    localStorage.removeItem('pulse_user')
    navigate('/login')
  }

  const isCheckedIn  = !!session?.checkinAt
  const isCheckedOut = !!session?.checkoutAt
  const completedGoals = goals.filter(g => g.completed).length

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: user.color || '#6366f1' }}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{user.name}</div>
            <div className="text-muted text-xs">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/team')} className="btn-ghost text-xs gap-1.5">
            <Users size={14} /> Time
          </button>
          <button onClick={logout} className="btn-ghost text-xs">Sair</button>
        </div>
      </div>

      {/* Check-in / Check-out */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-semibold text-sm mb-0.5">
              {!isCheckedIn ? 'Pronto para começar?' : isCheckedOut ? 'Dia encerrado' : 'Em trabalho'}
            </div>
            <div className="text-muted text-xs flex items-center gap-1">
              <Clock size={12} />
              {isCheckedOut ? fmtMinutes(session.totalMinutes) : isCheckedIn ? `${fmtMinutes(elapsed)} trabalhados` : 'Sem check-in hoje'}
            </div>
          </div>
          <div className="flex gap-2">
            {!isCheckedIn && (
              <button onClick={() => checkinMut.mutate()} disabled={checkinMut.isPending} className="btn-primary text-xs gap-1.5">
                <LogIn size={14} /> Check-in
              </button>
            )}
            {isCheckedIn && !isCheckedOut && (
              <button onClick={() => checkoutMut.mutate()} disabled={checkoutMut.isPending} className="btn-outline text-xs gap-1.5">
                <LogOut size={14} /> Check-out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metas do dia */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-white font-semibold text-sm">Metas do dia</div>
            <div className="text-muted text-xs">{completedGoals}/{goals.length} concluídas</div>
          </div>
        </div>

        {/* Adicionar meta */}
        <div className="flex gap-2 mb-3">
          <input className="input text-xs py-1.5 flex-1" placeholder="Nova meta..."
            value={goalTitle} onChange={e => setGoalTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && goalTitle && addGoalMut.mutate({ title: goalTitle, vertical: goalVertical })} />
          <select className="input text-xs py-1.5 w-28" value={goalVertical} onChange={e => setGoalVertical(e.target.value)}>
            {VERTICALS.map(v => <option key={v} value={v}>{V_LABEL[v]}</option>)}
          </select>
          <button onClick={() => goalTitle && addGoalMut.mutate({ title: goalTitle, vertical: goalVertical })}
            className="btn-primary text-xs px-3 py-1.5">
            <Plus size={14} />
          </button>
        </div>

        {goals.length === 0 && <p className="text-muted text-xs text-center py-3">Nenhuma meta adicionada ainda</p>}

        <div className="flex flex-col gap-1.5">
          {goals.map(g => (
            <div key={g.id} className="flex items-center gap-2 group">
              <button onClick={() => toggleGoal.mutate(g.id)}
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${g.completed ? 'bg-green border-green' : 'border-border hover:border-primary'}`}>
                {g.completed && <Check size={10} className="text-white" />}
              </button>
              <span className={`text-sm flex-1 ${g.completed ? 'line-through text-muted' : 'text-white'}`}>{g.title}</span>
              <span className={`badge border text-xs ${V_COLOR[g.vertical]}`}>{V_LABEL[g.vertical]}</span>
              <button onClick={() => delGoal.mutate(g.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={12} className="text-muted hover:text-red" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Registrar atividade */}
      <div className="card mb-4">
        <div className="text-white font-semibold text-sm mb-3">Registrar atividade</div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input className="input text-xs py-1.5 flex-1" placeholder="O que você fez?"
              value={actTitle} onChange={e => setActTitle(e.target.value)} />
            <select className="input text-xs py-1.5 w-28" value={actVertical} onChange={e => setActVertical(e.target.value)}>
              {VERTICALS.map(v => <option key={v} value={v}>{V_LABEL[v]}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input className="input text-xs py-1.5 flex-1" placeholder="Descrição (opcional)"
              value={actDesc} onChange={e => setActDesc(e.target.value)} />
            <button onClick={() => actTitle && addActMut.mutate({ title: actTitle, vertical: actVertical, description: actDesc })}
              className="btn-primary text-xs px-3 py-1.5">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Lista de atividades */}
      {acts.length > 0 && (
        <div className="card">
          <div className="text-white font-semibold text-sm mb-3">Atividades de hoje</div>
          <div className="flex flex-col gap-2">
            {acts.map(a => (
              <div key={a.id} className="flex items-start gap-2 group">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{a.title}</span>
                    <span className={`badge border text-xs ${V_COLOR[a.vertical]}`}>{V_LABEL[a.vertical]}</span>
                  </div>
                  {a.description && <p className="text-muted text-xs mt-0.5">{a.description}</p>}
                </div>
                <button onClick={() => delAct.mutate(a.id)} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                  <Trash2 size={12} className="text-muted hover:text-red" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
