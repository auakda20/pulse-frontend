import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { metricService } from '../services/api'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import {
  LineChart, Wallet, TrendingUp, CalendarClock, DollarSign, Banknote, Users2, UserCheck, Coins,
  Plus, Trash2, X, Pencil,
} from 'lucide-react'

const fmtBRL = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

function currentMes() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7)
}
function mesLabel(mes) {
  const [y, m] = mes.split('-')
  return new Date(+y, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
}
function parseProjetos(s) { try { return JSON.parse(s || '[]') } catch { return [] } }
function sum(snap, key) { return parseProjetos(snap?.projetos).reduce((a, p) => a + (p[key] || 0), 0) }
const isStudio = (n) => String(n || '').trim().toLowerCase() === 'studio'

const ROW_VAZIA = { nome: '', mrr: 0, receita: 0, investido: 0, leads: 0, convertidos: 0, arrecadado: 0 }
const PROJETOS_PADRAO = ['Kelsen', 'CasaPrime', 'Arbly', 'IA Contábil', 'STUDIO']

export default function MetricasPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)

  const { data: snaps = [], isError } = useQuery({ queryKey: ['metrics'], queryFn: metricService.list, retry: false })

  const saveMut = useMutation({
    mutationFn: (f) => metricService.save(f.mes, {
      caixa: +f.caixa, gastos: +f.gastos,
      kelsenCadastros: +f.kelsenCadastros, kelsenTestando: +f.kelsenTestando, kelsenPagantes: +f.kelsenPagantes,
      projetos: f.projetos.map(p => ({
        nome: p.nome, mrr: +p.mrr, receita: +p.receita, investido: +p.investido,
        leads: +p.leads, convertidos: +p.convertidos, arrecadado: +p.arrecadado,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metrics'] }); setForm(null); toast.success('Mês salvo') },
    onError:   (e) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  })

  const latest = snaps.length ? snaps[snaps.length - 1] : null
  const mrr        = sum(latest, 'mrr')
  const investido  = sum(latest, 'investido')
  const leads      = sum(latest, 'leads')
  const convert    = sum(latest, 'convertidos')
  const arrecadado = sum(latest, 'arrecadado')
  const receita    = sum(latest, 'receita')
  const runway = latest && latest.gastos > 0 ? (latest.caixa / latest.gastos) : null
  const convPct = leads > 0 ? Math.round((convert / leads) * 100) : 0
  const cacEmpresa = convert > 0 ? investido / convert : null
  const roiEmpresa = investido > 0 ? ((arrecadado - investido) / investido) * 100 : null
  const maxMrr = useMemo(() => Math.max(1, ...snaps.map(s => sum(s, 'mrr'))), [snaps])
  const kConv = latest && latest.kelsenTestando > 0 ? Math.round((latest.kelsenPagantes / latest.kelsenTestando) * 100) : 0

  function abrirEditor(snap) {
    if (snap) {
      const ps = parseProjetos(snap.projetos)
      setForm({
        mes: snap.mes, caixa: snap.caixa, gastos: snap.gastos,
        kelsenCadastros: snap.kelsenCadastros, kelsenTestando: snap.kelsenTestando, kelsenPagantes: snap.kelsenPagantes,
        projetos: ps.length ? ps.map(p => ({ ...ROW_VAZIA, ...p })) : PROJETOS_PADRAO.map(nome => ({ ...ROW_VAZIA, nome })),
      })
    } else {
      const base = latest ? parseProjetos(latest.projetos).map(p => ({ ...ROW_VAZIA, ...p })) : PROJETOS_PADRAO.map(nome => ({ ...ROW_VAZIA, nome }))
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
          {/* Cockpit — finanças */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Wallet}        label="Caixa"          value={fmtBRL(latest.caixa)} tone="primary" />
            <StatCard icon={TrendingUp}    label="MRR total"      value={fmtBRL(mrr)} sub={mesLabel(latest.mes)} tone="green" />
            <StatCard icon={CalendarClock} label="Runway"         value={runway != null ? runway.toFixed(1) + ' meses' : '—'} tone={runway != null && runway < 6 ? 'red' : 'muted'} />
            <StatCard icon={DollarSign}    label="Receita do mês" value={fmtBRL(receita)} />
          </div>
          {/* Cockpit — aquisição */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Banknote}  label="Investido"        value={fmtBRL(investido)} tone="muted" />
            <StatCard icon={Users2}    label="Leads"            value={leads} />
            <StatCard icon={UserCheck} label="Leads convertidos" value={convert} sub={convPct + '%'} tone="green" />
            <StatCard icon={Coins} label="Valor arrecadado" value={fmtBRL(arrecadado)} tone="green" />
          </div>

          {/* Resultado — CAC e ROI da empresa (destaque) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Banknote size={22} /></div>
              <div>
                <div className="font-display text-3xl font-bold text-ink leading-none tracking-tight">{cacEmpresa != null ? fmtBRL(cacEmpresa) : '—'}</div>
                <div className="text-muted text-xs mt-1">CAC médio · STUDIO <span className="text-mutedLight">· investido ÷ convertidos</span></div>
              </div>
            </div>
            <div className="card-sm flex items-center gap-4">
              <div className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (roiEmpresa == null ? 'bg-surfaceHover text-muted' : roiEmpresa >= 0 ? 'bg-green/10 text-green' : 'bg-red/10 text-red')}><TrendingUp size={22} /></div>
              <div>
                <div className={'font-display text-3xl font-bold leading-none tracking-tight ' + (roiEmpresa == null ? 'text-ink' : roiEmpresa >= 0 ? 'text-green' : 'text-red')}>
                  {roiEmpresa != null ? (roiEmpresa >= 0 ? '+' : '') + Math.round(roiEmpresa) + '%' : '—'}
                </div>
                <div className="text-muted text-xs mt-1">ROI · STUDIO <span className="text-mutedLight">· (arrecadado − investido) ÷ investido</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Tabela por projeto */}
              <div className="card overflow-x-auto">
                <h2 className="text-ink font-semibold text-sm mb-3">Por projeto · {mesLabel(latest.mes)}</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-muted text-xs">
                      <th className="text-left font-medium py-1.5">Projeto</th>
                      <th className="text-right font-medium py-1.5">MRR</th>
                      <th className="text-right font-medium py-1.5">Investido</th>
                      <th className="text-right font-medium py-1.5">Leads</th>
                      <th className="text-right font-medium py-1.5">Conv.</th>
                      <th className="text-right font-medium py-1.5">Arrecadado</th>
                      <th className="text-right font-medium py-1.5" title="Custo por aquisição = investido ÷ convertidos">CAC</th>
                      <th className="text-right font-medium py-1.5" title="Retorno = (arrecadado − investido) ÷ investido">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseProjetos(latest.projetos).map((p, i) => {
                      const studio = isStudio(p.nome)
                      const cac = studio && p.convertidos > 0 ? p.investido / p.convertidos : null
                      const roi = studio && p.investido > 0 ? ((p.arrecadado - p.investido) / p.investido) * 100 : null
                      return (
                      <tr key={i} className="border-t border-border/60">
                        <td className="text-ink py-2">{p.nome}</td>
                        <td className="text-right text-ink py-2">{fmtBRL(p.mrr)}</td>
                        <td className="text-right text-muted py-2">{studio ? fmtBRL(p.investido) : '—'}</td>
                        <td className="text-right text-muted py-2">{studio ? (p.leads || 0) : '—'}</td>
                        <td className="text-right text-muted py-2">{studio ? (p.convertidos || 0) : '—'}</td>
                        <td className="text-right text-ink py-2">{studio ? fmtBRL(p.arrecadado) : '—'}</td>
                        <td className="text-right text-muted py-2">{cac != null ? fmtBRL(cac) : '—'}</td>
                        <td className={'text-right py-2 font-medium ' + (roi == null ? 'text-mutedLight' : roi >= 0 ? 'text-green' : 'text-red')}>
                          {roi != null ? (roi >= 0 ? '+' : '') + Math.round(roi) + '%' : '—'}
                        </td>
                      </tr>
                      )
                    })}
                    {parseProjetos(latest.projetos).length === 0 && (
                      <tr><td colSpan={8} className="text-mutedLight text-xs text-center py-4">Nenhum projeto no snapshot.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tendência MRR */}
              <div className="card">
                <h2 className="text-ink font-semibold text-sm mb-4">Evolução do MRR</h2>
                {snaps.length < 2 ? (
                  <p className="text-mutedLight text-xs">Registre mais meses para ver a tendência.</p>
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {snaps.slice(-12).map(s => {
                      const v = sum(s, 'mrr')
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

            {/* Funil Kelsen */}
            <div className="flex flex-col gap-5">
              <div className="card">
                <h2 className="text-ink font-semibold text-sm mb-3">Funil Kelsen</h2>
                <div className="flex flex-col gap-3">
                  <Funnel label="Cadastros" value={latest.kelsenCadastros} max={Math.max(1, latest.kelsenCadastros)} />
                  <Funnel label="Testando"  value={latest.kelsenTestando}  max={Math.max(1, latest.kelsenCadastros)} />
                  <Funnel label="Pagantes"  value={latest.kelsenPagantes}  max={Math.max(1, latest.kelsenCadastros)} tone="green" />
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-muted text-xs">Conversão (testando → pagante)</span>
                    <span className="font-display font-bold text-ink">{kConv}%</span>
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
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                  <span className="text-[11px] uppercase tracking-wider text-muted">Projetos</span>
                  <button onClick={() => setForm({ ...form, projetos: [...form.projetos, { ...ROW_VAZIA }] })}
                    className="text-xs text-primary flex items-center gap-1"><Plus size={12} /> projeto</button>
                </div>
                <div className="flex flex-col gap-3">
                  {form.projetos.map((p, i) => {
                    const upd = (k, v) => { const ps = [...form.projetos]; ps[i] = { ...ps[i], [k]: v }; setForm({ ...form, projetos: ps }) }
                    return (
                      <div key={i} className="border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <input className="input flex-1 font-medium" placeholder="Nome do projeto" value={p.nome} onChange={e => upd('nome', e.target.value)} />
                          <button onClick={() => setForm({ ...form, projetos: form.projetos.filter((_, j) => j !== i) })} className="text-mutedLight hover:text-red"><Trash2 size={14} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <MiniField label="MRR"><input className="input text-xs py-1.5" type="number" value={p.mrr} onChange={e => upd('mrr', e.target.value)} /></MiniField>
                          <MiniField label="Receita"><input className="input text-xs py-1.5" type="number" value={p.receita} onChange={e => upd('receita', e.target.value)} /></MiniField>
                          {isStudio(p.nome) && <>
                            <MiniField label="Investido"><input className="input text-xs py-1.5" type="number" value={p.investido} onChange={e => upd('investido', e.target.value)} /></MiniField>
                            <MiniField label="Leads"><input className="input text-xs py-1.5" type="number" value={p.leads} onChange={e => upd('leads', e.target.value)} /></MiniField>
                            <MiniField label="Convertidos"><input className="input text-xs py-1.5" type="number" value={p.convertidos} onChange={e => upd('convertidos', e.target.value)} /></MiniField>
                            <MiniField label="Arrecadado"><input className="input text-xs py-1.5" type="number" value={p.arrecadado} onChange={e => upd('arrecadado', e.target.value)} /></MiniField>
                          </>}
                        </div>
                        {!isStudio(p.nome) && <p className="text-mutedLight text-[10px] mt-1.5">Leads/investido/arrecadado são exclusivos do STUDIO.</p>}
                      </div>
                    )
                  })}
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
function MiniField({ label, children }) {
  return <label className="flex flex-col gap-0.5"><span className="text-[10px] uppercase tracking-wider text-mutedLight">{label}</span>{children}</label>
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
