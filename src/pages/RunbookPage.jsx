import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { runbookService } from '../services/api'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, List, ListOrdered, Heading2, Minus, Save, Pencil, Plus, Trash2, Compass,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

const VERTICAIS = [
  { key: 'auto',   label: 'AUTO' },
  { key: 'studio', label: 'STUDIO' },
]
const CATS = [
  { key: 'lei_geral', label: 'Lei Geral' },
  { key: 'processo',  label: 'Processos' },
]

function currentUser() {
  try { return JSON.parse(localStorage.getItem('pulse_user') || '{}') } catch { return {} }
}

function ToolbarBtn({ onClick, active, children, title }) {
  return (
    <button onClick={onClick} title={title}
      className={'p-1.5 rounded transition-all ' + (active
        ? 'bg-primary/10 text-primary' : 'text-muted hover:text-ink hover:bg-surfaceHover')}>
      {children}
    </button>
  )
}

export default function RunbookPage() {
  const qc = useQueryClient()
  const isAdmin = currentUser().role === 'admin'

  const { data: pages = [] } = useQuery({
    queryKey: ['runbook'],
    queryFn:  () => runbookService.list(),
  })

  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(false)

  const selected = useMemo(
    () => pages.find(p => p.id === selectedId) || null,
    [pages, selectedId],
  )

  // seleciona a primeira página quando carrega
  useEffect(() => {
    if (!selectedId && pages.length) setSelectedId(pages[0].id)
  }, [pages, selectedId])

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Escreva o conteúdo desta página...' })],
    content: '',
    editable: false,
    editorProps: { attributes: { class: 'tiptap' } },
  })

  // carrega o conteúdo da página selecionada no editor
  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(selected?.conteudo || '')
    editor.setEditable(false)
    setEditing(false)
  }, [selected?.id, editor]) // eslint-disable-line

  const saveMut = useMutation({
    mutationFn: () => runbookService.update(selected.id, { conteudo: editor.getHTML() }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['runbook'] }); setEditing(false); editor.setEditable(false) },
  })

  const createMut = useMutation({
    mutationFn: (body) => runbookService.create(body),
    onSuccess:  (novo) => { qc.invalidateQueries({ queryKey: ['runbook'] }); setSelectedId(novo.id) },
  })

  const deleteMut = useMutation({
    mutationFn: () => runbookService.remove(selected.id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['runbook'] }); setSelectedId(null) },
  })

  function startEdit() { setEditing(true); editor.setEditable(true); editor.commands.focus() }

  function novaPagina() {
    const titulo = window.prompt('Título da página:')
    if (!titulo) return
    const vertical = window.prompt('Vertical (auto / studio):', 'auto')
    if (!['auto', 'studio'].includes((vertical || '').trim())) return alert('Vertical inválida.')
    const categoria = window.confirm('É da Lei Geral? (OK = Lei Geral, Cancelar = Processo)') ? 'lei_geral' : 'processo'
    createMut.mutate({ titulo, vertical: vertical.trim(), categoria, conteudo: '' })
  }

  function excluir() {
    if (window.confirm(`Excluir "${selected.titulo}"? Isso não pode ser desfeito.`)) deleteMut.mutate()
  }

  if (!editor) return null

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader title="Como Trabalhamos" subtitle="Processos e rituais do time" icon={Compass} />
      <div className="flex gap-6">
      {/* ── Navegação lateral interna ── */}
      <div className="w-56 flex-shrink-0">

        {VERTICAIS.map(v => {
          const doVertical = pages.filter(p => p.vertical === v.key)
          return (
            <div key={v.key} className="mb-5">
              <div className="text-[11px] font-bold tracking-widest text-primary/80 uppercase px-2 mb-1">{v.label}</div>
              {CATS.map(c => {
                const itens = doVertical.filter(p => p.categoria === c.key).sort((a, b) => a.ordem - b.ordem)
                if (!itens.length) return null
                return (
                  <div key={c.key} className="mb-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted px-2 mb-0.5">{c.label}</div>
                    {itens.map(p => (
                      <button key={p.id} onClick={() => setSelectedId(p.id)}
                        className={'w-full text-left text-sm px-2 py-1.5 rounded transition-all truncate ' +
                          (p.id === selectedId ? 'bg-primary/10 text-primary' : 'text-mutedLight hover:text-ink hover:bg-surfaceHover')}>
                        {p.titulo}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}

        {isAdmin && (
          <button onClick={novaPagina} className="nav-item w-full text-muted hover:text-ink mt-2">
            <Plus size={15} /> <span>Nova página</span>
          </button>
        )}
      </div>

      {/* ── Conteúdo ── */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="card text-center text-muted py-16">
            {pages.length === 0
              ? 'Nenhuma página ainda.' + (isAdmin ? ' Crie a primeira em "Nova página".' : '')
              : 'Selecione uma página à esquerda.'}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">{selected.titulo}</h2>
                <p className="text-muted text-xs mt-0.5">
                  {VERTICAIS.find(v => v.key === selected.vertical)?.label} ·{' '}
                  {CATS.find(c => c.key === selected.categoria)?.label}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  {editing ? (
                    <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                      <Save size={13} /> {saveMut.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                  ) : (
                    <button onClick={startEdit}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded text-muted hover:text-ink hover:bg-surfaceHover transition-all">
                      <Pencil size={13} /> Editar
                    </button>
                  )}
                  <button onClick={excluir} title="Excluir"
                    className="p-1.5 rounded text-muted hover:text-red hover:bg-red/5 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              {editing && (
                <div className="flex items-center gap-0.5 pb-3 mb-4 border-b border-border/50 flex-wrap">
                  <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito"><Bold size={14} /></ToolbarBtn>
                  <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico"><Italic size={14} /></ToolbarBtn>
                  <div className="w-px h-4 bg-border mx-1" />
                  <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título"><Heading2 size={14} /></ToolbarBtn>
                  <div className="w-px h-4 bg-border mx-1" />
                  <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista"><List size={14} /></ToolbarBtn>
                  <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered size={14} /></ToolbarBtn>
                  <div className="w-px h-4 bg-border mx-1" />
                  <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separador"><Minus size={14} /></ToolbarBtn>
                </div>
              )}
              <EditorContent editor={editor} />
            </div>

            {isAdmin && !editing && (
              <p className="text-muted text-xs text-center mt-3">Você é admin — clique em "Editar" para alterar esta página.</p>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}
