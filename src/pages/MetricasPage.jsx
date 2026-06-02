import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { metricService } from '../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { LineChart, Wallet, TrendingUp, CalendarClock, DollarSign, Plus, Trash2, X, Pencil } from 'lucide-react'

const fmtBRL = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

function currentMes() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
}
function mesLabel(mes) {
  const [y, m] = mes.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
}
function parseProjetos(s) { try { return JSON.parse(s || '[]') } catch { return [] } }
function totalMrr(snap)  { return parseProjetos(snap?.projetos).reduce((a, p) => a + (p.mrr || 0), 0) }
function totalRec(snap)  { return parseProjetos(snap?.projetos).reduce((a, p) => a + (p.receita || 0), 0) }

const ROW_VAZIA = { nome: '', mrr: 0, receita: 0 }

export default function MetricasPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)

  const { data: snaps = [], isError } = useQuery({ queryKey: ['metrics'], queryFn: metricService.list, retry: false })

  const saveMut = useMutation({
    mutationFn: (f) => metricService.save(f.mes, {
      caixa: +f.caixa, gastos: +f.gastos,
      kelsenCadastros: +f.kelsenCadastros, kelsenTestando: +f.kelsenTestando, kelsenPagantes: +f.kelsenPagantes,
      projetos: f.projetos.map(p => ({ nome: p.nome, mrr: +p.mrr, receita: +p.receita })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metrics'] }); setForm(null); toast.success('Mês salvo') },
    onError:   (e) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  })

  const latest = snaps.length ? snaps[snaps.length - 1] : null
  const mrr = totalMrr(latest)
  const runway = latest && latest.gastos > 0 ? (latest.caixa / latest.gastos) : null
  const maxMrr = useMemo(() => Math.max(1, ...snaps.map(totalMrr)), [snaps])
  const conv = latest && latest.kelsenTestando > 0 ? Math.round((latest.kelsenPagantes / latest.kelsenTestando) * 100) : 0

  function abrirEditor(snap) {
    if (snap) {
      setForm({
        mes: snap.mes, caixa: snap.caixa, gastos: snap.gastos,
        kelsenCadastros: snap.kelsenCadastros, kelsenTestando: snap.kelsenTestando, kelsenPagantes: snap.kelsenPagantes,
        projetos: parseProjetos(snap.projetos).length ? parseProjetos(snap.projetos) : [{ ...ROW_VAZIA, nome: 'Kelsen' }],
      })
    } else {
      const base = latest ? parseProjetos(latest.projetos).map(p => ({ ...p })) : [{ ...ROW_VAZIA, nome: 'Kelsen' }, { ...ROW_VAZIA, nome: 'STUDIO' }]
      setForm({ mes: currentMes(), caixa: latest?.caixa || 0, gastos: latest?.gastos || 0, kelsenCadastros: 0, kelsenTestando: 0, kelsenPagantes: 0, projetos: base })
    }
  }

  if (isError) return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader title="Métricas" icon={LineChart} />
      <div className="card text-center text-muted py-16">Acesso restrito ao admin.</div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader title="Métricas" subtitle="KPIs da empresa — só você vê isto" icon={LineChart}>
        <button onClick={() => abrirEditor(latest && latest.mes === currentMes() ? latest : null)}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all">
          <Pencil size={14} /> Atualizar mês
        </button>
      </PageHeader>

      {!latest ? (
        <div className="card text-center text-muted py-16">
          Sem dados ainda. Clique em <span className="text-ink font-medium">Atualizar mês</span> para registrar o primeiro snapshot.
        </div>
      ) : (
        <>
          {/* Cockpit */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Wallet}        label="Caixa"          value={fmtBRL(latest.caixa)} tone="primary" />
            <StatCard icon={TrendingUp}    label="MRR total"      value={fmtBRL(mrr)} sub={mesLabel(latest.mes)} tone="green" />
            <StatCard icon={CalendarClock} label="Runway"         value={runway != null ? runway.toFixed(1) + ' meses' : '—'} tone={runway != null && runway < 6 ? 'red' : 'muted'} />
            <StatCard icon={DollarSign}    label="Receita do mês" value={fmtBRL(totalRec(latest))} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Coluna principal */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* MRR por projeto */}
              <div className="card">
                <h2 className="text-ink font-semibold text-sm mb-3">MRR por projeto · {mesLabel(latest.mes)}</h2>
                <div className="flex flex-col gap-2">
                  {parseProjetos(latest.projetos).length === 0 && <p className="text-mutedLight text-xs">Nenhum projeto no snapshot.</p>}
                  {parseProjetos(latest.projetos).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-border/60 last:border-0 py-1.5">
                      <span className="text-ink">{p.nome}</span>
                      <span className="font-display font-bold text-ink">{fmtBRL(p.mrr)}<span className="text-mutedLight font-normal text-xs">/mês</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tendência MRR */}
              <div className="card">
                <h2 className="text-ink font-semibold text-sm mb-4">Evolução do MRR</h2>
                {snaps.length < 2 ? (
                  <p className="text-mutedLight text-xs">Registre mais meses para ver a tendência.</p>
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {snaps.slice(-12).map(s => {
                      const v = totalMrr(s)
                      return (
                        <div key={s.mes} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                          <div className="w-full bg-primary/15 rounded-t relative flex-1 flex items-end" title={fmtBRL(v)}>
                            <div className="w-full bg-primary rounded-t transition-all" style={{ height: Math.max(2, (v / maxMrr) * 100) + '%' }} />
                          </div>
                          <span className="text-[10px] text-muted truncate w-full text-center">{mesLabel(s.mes)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna lateral — funil Kelsen */}
            <div className="flex flex-col gap-5">
              <div className="card">
                <h2 className="text-ink font-semibold text-sm mb-3">Funil Kelsen</h2>
                <div className="flex flex-col gap-3">
                  <Funnel label="Cadastros" value={latest.kelsenCadastros} max={Math.max(1, latest.kelsenCadastros)} />
                  <Funnel label="Testando"  value={latest.kelsenTestando}  max={Math.max(1, latest.kelsenCadastros)} />
                  <Funnel label="Pagantes"  value={latest.kelsenPagantes}  max={Math.max(1, latest.kelsenCadastros)} tone="green" />
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-muted text-xs">Conversão (testando → pagante)</span>
                    <span className="font-display font-bold text-ink">{conv}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Editor */}
      {form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-semibold">Atualizar métricas</h2>
              <button onClick={() => setForm(null)} className="text-muted hover:text-ink"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Mês (YYYY-MM)"><input className="input" value={form.mes} onChange={e => setForm({ ...form, mes: e.target.value })} /></Field>
                <Field label="Caixa (R$)"><input className="input" type="number" value={form.caixa} onChange={e => setForm({ ...form, caixa: e.target.value })} /></Field>
                <Field label="Gastos/mês (R$)"><input className="input" type="number" value={form.gastos} onChange={e => setForm({ ...form, gastos: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Kelsen cadastros"><input className="input" type="number" value={form.kelsenCadastros} onChange={e => setForm({ ...form, kelsenCadastros: e.target.value })} /></Field>
                <Field label="Kelsen testando"><input className="input" type="number" value={form.kelsenTestando} onChange={e => setForm({ ...form, kelsenTestando: e.target.value })} /></Field>
                <Field label="Kelsen pagantes"><input className="input" type="number" value={form.kelsenPagantes} onChange={e => setForm({ ...form, kelsenPagantes: e.target.value })} /></Field>
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-muted">Projetos (MRR / Receita)</span>
                  <button onClick={() => setForm({ ...form, projetos: [...form.projetos, { ...ROW_VAZIA }] })}
                    className="text-xs text-primary flex items-center gap-1"><Plus size={12} /> linha</button>
                </div>
                <div className="flex flex-col gap-2">
                  {form.projetos.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className="input flex-1" placeholder="Projeto" value={p.nome}
                        onChange={e => { const ps = [...form.projetos]; ps[i] = { ...ps[i], nome: e.target.value }; setForm({ ...form, projetos: ps }) }} />
                      <input className="input w-24" type="number" placeholder="MRR" value={p.mrr}
                        onChange={e => { const ps = [...form.projetos]; ps[i] = { ...ps[i], mrr: e.target.value }; setForm({ ...form, projetos: ps }) }} />
                      <input className="input w-24" type="number" placeholder="Receita" value={p.receita}
                        onChange={e => { const ps = [...form.projetos]; ps[i] = { ...ps[i], receita: e.target.value }; setForm({ ...form, projetos: ps }) }} />
                      <button onClick={() => setForm({ ...form, projetos: form.projetos.filter((_, j) => j !== i) })}
                        className="text-mutedLight hover:text-red"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !/^\d{4}-\d{2}$/.test(form.mes)}
              className="w-full mt-4 text-sm font-medium px-4 py-2 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition-all">
              {saveMut.isPending ? 'Salvando...' : 'Salvar mês'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return <label className="flex flex-col gap-1"><span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>{children}</label>
}

function Funnel({ label, value, max, tone = 'primary' }) {
  const pct = Math.max(2, Math.round((value / max) * 100))
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="font-display font-bold text-ink">{value}</span>
      </div>
      <div className="h-2 bg-surfaceHover rounded-full overflow-hidden">
        <div className={'h-full rounded-full ' + (tone === 'green' ? 'bg-green' : 'bg-primary')} style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}
