import { useState } from 'react'
import { authService } from '../services/api'
import toast from 'react-hot-toast'
import { UserCog, Save } from 'lucide-react'

function currentUser() {
  try { return JSON.parse(localStorage.getItem('pulse_user') || '{}') } catch { return {} }
}

export default function PerfilPage() {
  const u = currentUser()
  const [name, setName]   = useState(u.name || '')
  const [color, setColor] = useState(u.color || '#6366f1')
  const [savingProfile, setSavingProfile] = useState(false)

  const [curr, setCurr]   = useState('')
  const [nova, setNova]   = useState('')
  const [nova2, setNova2] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)

  async function salvarPerfil() {
    setSavingProfile(true)
    try {
      const updated = await authService.updateProfile({ name, color })
      const merged = { ...u, name: updated.name, color: updated.color }
      localStorage.setItem('pulse_user', JSON.stringify(merged))
      toast.success('Perfil atualizado')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao atualizar perfil')
    } finally { setSavingProfile(false) }
  }

  async function trocarSenha() {
    if (nova !== nova2) return toast.error('As senhas novas não conferem')
    if (nova.length < 6) return toast.error('A nova senha precisa de ao menos 6 caracteres')
    setSavingPwd(true)
    try {
      await authService.changePassword({ currentPassword: curr, newPassword: nova })
      setCurr(''); setNova(''); setNova2('')
      toast.success('Senha alterada')
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao trocar senha')
    } finally { setSavingPwd(false) }
  }

  return (
    <div className="flex flex-col gap-5 pb-8 max-w-lg">
      <div className="flex items-center gap-2">
        <UserCog size={20} className="text-primary" />
        <h1 className="text-xl font-semibold text-white">Perfil</h1>
      </div>

      {/* Dados */}
      <div className="card flex flex-col gap-3">
        <h2 className="text-white font-medium text-sm">Dados</h2>
        <div className="text-xs text-muted">{u.email} · {u.role === 'admin' ? 'Admin' : 'Membro'}</div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted">Nome</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-muted">Cor</span>
          <input type="color" className="h-9 w-16 bg-transparent" value={color} onChange={e => setColor(e.target.value)} />
        </label>
        <button onClick={salvarPerfil} disabled={savingProfile}
          className="btn-primary w-fit"><Save size={14} /> {savingProfile ? 'Salvando...' : 'Salvar perfil'}</button>
      </div>

      {/* Senha */}
      <div className="card flex flex-col gap-3">
        <h2 className="text-white font-medium text-sm">Trocar senha</h2>
        <input className="input" type="password" placeholder="Senha atual" value={curr} onChange={e => setCurr(e.target.value)} />
        <input className="input" type="password" placeholder="Nova senha (mín. 6)" value={nova} onChange={e => setNova(e.target.value)} />
        <input className="input" type="password" placeholder="Confirmar nova senha" value={nova2} onChange={e => setNova2(e.target.value)} />
        <button onClick={trocarSenha} disabled={savingPwd || !curr || !nova}
          className="btn-primary w-fit"><Save size={14} /> {savingPwd ? 'Salvando...' : 'Trocar senha'}</button>
      </div>
    </div>
  )
}
