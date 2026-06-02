import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '../services/api'
import toast from 'react-hot-toast'
import { UsersRound, Plus, Pencil, Trash2, KeyRound, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const NOVO = { name: '', email: '', password: '', role: 'member', color: '#10b981' }

function currentUser() {
  try { return JSON.parse(localStorage.getItem('pulse_user') || '{}') } catch { return {} }
}

export default function UsuariosPage() {
  const qc = useQueryClient()
  const me = currentUser()
  const [form, setForm] = useState(null) // {id?} edit/criar

  const { data: users = [], isError } = useQuery({ queryKey: ['users'], queryFn: () => userService.list() })

  const saveMut = useMutation({
    mutationFn: (u) => u.id
      ? userService.update(u.id, { name: u.name, color: u.color, role: u.role })
      : userService.create(u),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setForm(null); toast.success('Salvo') },
    onError:   (e) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  })
  const delMut = useMutation({
    mutationFn: (id) => userService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Removido') },
    onError:   (e) => toast.error(e.response?.data?.error || 'Erro ao remover'),
  })

  async function resetar(u) {
    const nova = window.prompt(`Nova senha para ${u.name} (mín. 6):`)
    if (!nova) return
    try { await userService.resetPassword(u.id, nova); toast.success('Senha resetada') }
    catch (e) { toast.error(e.response?.data?.error || 'Erro') }
  }

  function excluir(u) { if (window.confirm(`Remover ${u.name}?`)) delMut.mutate(u.id) }

  if (isError) return <div className="card text-center text-muted py-16">Acesso restrito ao admin.</div>

  return (
    <div className="flex flex-col gap-5 pb-8 max-w-2xl">
      <PageHeader title="Usuários" subtitle="Gestão de acesso da equipe" icon={UsersRound}>
        <button onClick={() => setForm({ ...NOVO })}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all">
          <Plus size={14} /> Novo usuário
        </button>
      </PageHeader>

      <div className="card divide-y divide-border/50 p-0">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: u.color || '#6366f1' }}>{u.name?.[0]?.toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-ink text-sm font-medium truncate">{u.name}</span>
                {u.role === 'admin'
                  ? <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border text-primary border-primary/30 bg-primary/5">Admin</span>
                  : <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border text-muted border-border">Membro</span>}
                {u.id === me.id && <span className="text-[10px] text-muted">(você)</span>}
              </div>
              <div className="text-xs text-muted truncate">{u.email}</div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setForm({ ...u })} title="Editar" className="p-1.5 rounded text-muted hover:text-ink hover:bg-surfaceHover"><Pencil size={14} /></button>
              <button onClick={() => resetar(u)} title="Resetar senha" className="p-1.5 rounded text-muted hover:text-ink hover:bg-surfaceHover"><KeyRound size={14} /></button>
              {u.id !== me.id && (
                <button onClick={() => excluir(u)} title="Remover" className="p-1.5 rounded text-muted hover:text-red hover:bg-red/5"><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-semibold">{form.id ? 'Editar usuário' : 'Novo usuário'}</h2>
              <button onClick={() => setForm(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted">Nome</span>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              {!form.id && (
                <>
                  <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted">E-mail</span>
                    <input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
                  <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted">Senha (mín. 6)</span>
                    <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted">Papel</span>
                  <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="member">Membro</option><option value="admin">Admin</option>
                  </select></label>
                <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted">Cor</span>
                  <input type="color" className="h-9 w-16 bg-transparent" value={form.color || '#6366f1'} onChange={e => setForm({ ...form, color: e.target.value })} /></label>
              </div>
            </div>
            <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.name || (!form.id && (!form.email || !form.password))}
              className="w-full mt-4 text-sm font-medium px-4 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all">
              {saveMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
