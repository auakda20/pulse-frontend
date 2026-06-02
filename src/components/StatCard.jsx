const TONES = {
  primary: 'bg-primary/10 text-primary',
  green:   'bg-green/10 text-green',
  red:     'bg-red/10 text-red',
  yellow:  'bg-yellow/10 text-yellow',
  muted:   'bg-surfaceHover text-muted',
}

export default function StatCard({ icon: Icon, label, value, sub, tone = 'primary' }) {
  return (
    <div className="card-sm flex items-center gap-3">
      {Icon && (
        <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + (TONES[tone] || TONES.primary)}>
          <Icon size={18} />
        </div>
      )}
      <div className="min-w-0">
        <div className="font-display text-2xl font-bold text-ink leading-none tracking-tight">{value}</div>
        <div className="text-muted text-xs mt-1 truncate">{label}{sub && <span className="text-mutedLight"> · {sub}</span>}</div>
      </div>
    </div>
  )
}
