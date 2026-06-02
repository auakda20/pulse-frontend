export default function PageHeader({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon size={18} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink tracking-tight leading-none">{title}</h1>
          {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  )
}
