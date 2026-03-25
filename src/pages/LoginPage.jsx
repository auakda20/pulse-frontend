import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { token, user } = await authService.login({ email, password })
      localStorage.setItem('pulse_token', token)
      localStorage.setItem('pulse_user', JSON.stringify(user))
      navigate('/dashboard')
    } catch {
      toast.error('Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-white">Pulse</h1>
          <p className="text-muted text-sm mt-1">Daily tracker do time</p>
        </div>

        <form onSubmit={handleLogin} className="card flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Email</label>
            <input className="input" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Senha</label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary justify-center mt-1 disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          <button onClick={() => window.location.href = '/team'} className="hover:text-white transition-colors">
            Ver painel do time →
          </button>
        </p>
      </div>
    </div>
  )
}
