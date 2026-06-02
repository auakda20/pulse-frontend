import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '../services/api'
import { Plus, Pencil, Trash2, Github, ExternalLink, FileText, X, FolderKanban } from 'lucide-react'

const VERTICAIS = [{ key: 'auto', label: 'AUTO' }, { key: 'studio', label: 'STUDIO' }]
const STATUS = {
  ativo:     { label: 'Ativo',     cls: 'text-green border-green/30 bg-green/5' },
  pausado:   { label: 'Pausado',   cls: 'text-yellow border-yellow/30 bg-yellow/5' },
  planejado: { label: 'Planejado', cls: 'text-primary border-primary/30 bg-primary/5' },
  arquivado: { label: 'Arquivado', cls: 'text-muted border-border bg-surfaceHover' },
}
const VAZIO = { nome: '', vertical: 'auto', status: 'ativo', responsavel: '', descricao: '', repoUrl: '', deployUrl: '', docsUrl: '', cor: '#6366f1', ordem: 0 }

function currentUser() {
  try { return JSON.parse(localStorage.getItem('pulse_user') || '{}') } catch { return {} }
}

function LinkBtn({ href, icon: Icon, label }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
      <Icon size={12} /> {label}
    </a>
  )
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const isAdmin = currentUser().role === 'admin'
  const [form, setForm] = useState(null) // null = fechado; objeto = editando/criando

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => projectService.list() })

  const saveMut = useMutation({
    mutationFn: (p) => p.id ? projectService.update(p.id, p) : projectService.create(p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['projects'] }); setForm(null) },
  })
  const delMut = useMutation({
    mutationFn: (id) => projectService.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  function excluir(p) { if (window.confirm(`Excluir "${p.nome}"?`)) delMut.mutate(p.id) }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban size={20} className="text-primary" />
          <h1 className="text-xl font-semibold text-ink">Projetos</h1>
        </div>
        {isAdmin && (
          <button onClick={() => setForm({ ...VAZIO })}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all">
            <Plus size={14} /> Novo projeto
          </button>
        )}
      </div>

      {VERTICAIS.map(v => {
        const itens = projects.filter(p => p.vertical === v.key)
        if (!itens.length) return null
        return (
          <div key={v.key}>
            <div className="text-[11px] font-bold tracking-widest text-primary/80 uppercase mb-2">{v.label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {itens.map(p => {
                const st = STATUS[p.status] || STATUS.ativo
                return (
                  <div key={p.id} className="card border-l-2" style={{ borderLeftColor: p.cor || '#6366f1' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-ink font-medium">{p.nome}</span>
                          <span className={'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ' + st.cls}>{st.label}</span>
                        </div>
                        {p.responsavel && <div className="text-xs text-muted mt-0.5">{p.responsavel}</div>}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => setForm({ ...p })} className="p-1 rounded text-muted hover:text-ink hover:bg-surfaceHover"><Pencil size={13} /></button>
                          <button onClick={() => excluir(p)} className="p-1 rounded text-muted hover:text-red hover:bg-red/5"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                    {p.descricao && <p className="text-sm text-mutedLight mt-2">{p.descricao}</p>}
                    <div className="flex items-center gap-3 mt-3">
                      <LinkBtn href={p.repoUrl} icon={Github} label="Repo" />
                      <LinkBtn href={p.deployUrl} icon={ExternalLink} label="Deploy" />
                      <LinkBtn href={p.docsUrl} icon={FileText} label="Docs" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {projects.length === 0 && (
        <div className="card text-center text-muted py-16">Nenhum projeto ainda.{isAdmin ? ' Clique em "Novo projeto".' : ''}</div>
      )}

      {/* Modal criar/editar */}
      {form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-semibold">{form.id ? 'Editar projeto' : 'Novo projeto'}</h2>
              <button onClick={() => setForm(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Nome"><input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vertical">
                  <select className="input" value={form.vertical} onChange={e => setForm({ ...form, vertical: e.target.value })}>
                    <option value="auto">AUTO</option><option value="studio">STUDIO</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {Object.keys(STATUS).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Responsável"><input className="input" value={form.responsavel || ''} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></Field>
              <Field label="Descrição"><textarea className="input" rows={2} value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} /></Field>
              <Field label="Repo URL"><input className="input" value={form.repoUrl || ''} onChange={e => setForm({ ...form, repoUrl: e.target.value })} /></Field>
              <Field label="Deploy URL"><input className="input" value={form.deployUrl || ''} onChange={e => setForm({ ...form, deployUrl: e.target.value })} /></Field>
              <Field label="Docs URL"><input className="input" value={form.docsUrl || ''} onChange={e => setForm({ ...form, docsUrl: e.target.value })} /></Field>
              <Field label="Cor"><input type="color" className="h-9 w-16 bg-transparent" value={form.cor || '#6366f1'} onChange={e => setForm({ ...form, cor: e.target.value })} /></Field>
            </div>
            <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.nome}
              className="w-full mt-4 text-sm font-medium px-4 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all">
              {saveMut.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  )
}
