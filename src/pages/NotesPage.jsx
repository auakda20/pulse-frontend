import { useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { noteService } from '../services/api'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { motion } from 'framer-motion'
import { Bold, Italic, List, ListOrdered, Heading2, Minus, Save } from 'lucide-react'

function todaySP() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function fmtDateFull() {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

function ToolbarBtn({ onClick, active, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={'p-1.5 rounded transition-all ' + (active
        ? 'bg-primary/10 text-primary'
        : 'text-muted hover:text-white hover:bg-surfaceHover')}
    >
      {children}
    </button>
  )
}

export default function NotesPage() {
  const qc   = useQueryClient()
  const date = todaySP()

  const { data } = useQuery({
    queryKey: ['notes', date],
    queryFn:  () => noteService.today(date),
  })

  const saveMut = useMutation({
    mutationFn: (content) => noteService.save(content, date),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notes', date] }),
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Comece a escrever sua nota do dia...' }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'tiptap' },
    },
  })

  // Carregar conteudo quando dados chegam
  useEffect(() => {
    if (editor && data?.content && editor.isEmpty) {
      editor.commands.setContent(data.content)
    }
  }, [data, editor])

  // Autosave com debounce
  const autoSave = useCallback(() => {
    if (!editor) return
    const content = editor.getHTML()
    if (content !== '<p></p>' && content !== '') {
      saveMut.mutate(content)
    }
  }, [editor, saveMut])

  useEffect(() => {
    if (!editor) return
    let timer
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(autoSave, 1500)
    }
    editor.on('update', handler)
    return () => { editor.off('update', handler); clearTimeout(timer) }
  }, [editor, autoSave])

  if (!editor) return null

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Notas do dia</h1>
          <p className="text-mutedLight text-sm mt-0.5 capitalize">{fmtDateFull()}</p>
        </div>
        <div className="flex items-center gap-2">
          {saveMut.isPending && (
            <span className="text-xs text-muted animate-pulse">Salvando...</span>
          )}
          {saveMut.isSuccess && !saveMut.isPending && (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-green flex items-center gap-1"
            >
              <Save size={11} /> Salvo
            </motion.span>
          )}
        </div>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 pb-3 mb-4 border-b border-border/50 flex-wrap">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italico">
            <Italic size={14} />
          </ToolbarBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Titulo">
            <Heading2 size={14} />
          </ToolbarBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
            <ListOrdered size={14} />
          </ToolbarBtn>
          <div className="w-px h-4 bg-border mx-1" />
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Separador">
            <Minus size={14} />
          </ToolbarBtn>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>

      <p className="text-muted text-xs text-center">
        Autosalvo a cada 1.5s · Ctrl+B negrito · Ctrl+I italico
      </p>
    </div>
  )
}
