import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Zap } from 'lucide-react'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Zap size={22} className="text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Pulse</h1>
          <p className="text-mutedLight text-sm mt-1">Daily tracker do time</p>
        </div>

        <form onSubmit={handleLogin} className="card flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block font-medium">Email</label>
            <input className="input" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block font-medium">Senha</label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary justify-center mt-1 disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-5">
          <button onClick={() => navigate('/team')} className="hover:text-white transition-colors">
            Ver painel do time →
          </button>
        </p>
      </motion.div>
    </div>
  )
}
