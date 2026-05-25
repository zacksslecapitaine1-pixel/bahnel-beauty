import { X, AlertTriangle } from 'lucide-react'

// ===== MODAL =====
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const maxW = { sm:'480px', md:'560px', lg:'720px', xl:'960px', full:'1200px' }[size] || '560px'
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: maxW }}>
        <div className="modal-header">
          <h2 style={{ margin:0, fontSize:'1.25rem', fontFamily:'var(--font-display)', fontWeight:600, color:'#111827' }}>
            {title}
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ===== CONFIRM MODAL =====
export function ConfirmModal({ open, onClose, onConfirm, title, message, danger }) {
  if (!open) return null
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth:'400px' }}>
        <div className="modal-body" style={{ textAlign:'center' }}>
          <div style={{
            width:'56px', height:'56px', borderRadius:'16px', margin:'0 auto 1rem',
            background: danger ? '#FEE2E2' : '#FEF3C7',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <AlertTriangle size={28} color={danger ? '#DC2626' : '#D97706'} />
          </div>
          <h3 style={{ margin:'0 0 0.5rem', fontFamily:'var(--font-display)', fontSize:'1.25rem', color:'#111827' }}>{title}</h3>
          <p style={{ margin:0, fontSize:'0.875rem', color:'#6B7280' }}>{message}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent:'center' }}>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => { onConfirm(); onClose() }} className={danger ? 'btn-danger' : 'btn-primary'}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== LOADER =====
export function Loader({ text = 'Chargement…' }) {
  return (
    <div className="page-loader" style={{ flexDirection:'column', gap:'0.75rem' }}>
      <div className="spinner" />
      <p style={{ margin:0, fontSize:'0.875rem', color:'#9CA3AF' }}>{text}</p>
    </div>
  )
}

// ===== EMPTY STATE =====
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem 1rem', textAlign:'center' }}>
      {Icon && (
        <div style={{ width:'64px', height:'64px', borderRadius:'16px', background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
          <Icon size={32} color="#9CA3AF" />
        </div>
      )}
      <h3 style={{ margin:'0 0 0.5rem', fontFamily:'var(--font-display)', fontSize:'1.125rem', color:'#6B7280' }}>{title}</h3>
      {description && <p style={{ margin:0, fontSize:'0.875rem', color:'#9CA3AF', maxWidth:'280px' }}>{description}</p>}
      {action && <div style={{ marginTop:'1.25rem' }}>{action}</div>}
    </div>
  )
}

// ===== SEARCH BAR =====
export function SearchBar({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <div style={{ position:'relative' }}>
      <svg style={{ position:'absolute', left:'0.875rem', top:'50%', transform:'translateY(-50%)', width:'16px', height:'16px', color:'#9CA3AF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
        style={{ paddingLeft:'2.5rem' }}
      />
    </div>
  )
}

// ===== FORM GROUP =====
export function FormGroup({ label, required, children, hint }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label}{required && <span style={{ color:'#EF4444', marginLeft:'2px', textTransform:'none' }}>*</span>}
        </label>
      )}
      {children}
      {hint && <p style={{ margin:'0.25rem 0 0', fontSize:'0.75rem', color:'#9CA3AF' }}>{hint}</p>}
    </div>
  )
}

// ===== STATUT BADGE =====
export function StatutBadge({ statut }) {
  const map = {
    'Confirmé':'badge-green','En cours':'badge-blue','Terminé':'badge-gray',
    'Annulé':'badge-red','Absent':'badge-orange','Actif':'badge-green',
    'Inactif':'badge-gray','Mauvais payeur':'badge-red','Payée':'badge-green',
    'Non payée':'badge-orange','Partiellement payée':'badge-blue',
    'En retard':'badge-red','En attente':'badge-orange','Brouillon':'badge-gray',
  }
  return <span className={`badge ${map[statut] || 'badge-gray'}`}>{statut}</span>
}

// ===== KPI CARD =====
export function KpiCard({ title, value, icon: Icon, color = 'green', sub }) {
  const colors = {
    green:  { bg:'#ECFDF5', icon:'#10B981', val:'#065f46' },
    blue:   { bg:'#EFF6FF', icon:'#3B82F6', val:'#1E40AF' },
    orange: { bg:'#FFF7ED', icon:'#F97316', val:'#9A3412' },
    red:    { bg:'#FEF2F2', icon:'#EF4444', val:'#991B1B' },
    violet: { bg:'#F5F3FF', icon:'#7C3AED', val:'#4C1D95' },
  }
  const c = colors[color] || colors.green
  return (
    <div className="card" style={{ cursor:'default' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div style={{ flex:1 }}>
          <p style={{ margin:'0 0 0.5rem', fontSize:'0.7rem', fontWeight:600, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>{title}</p>
          <p style={{ margin:0, fontSize:'1.75rem', fontFamily:'var(--font-display)', fontWeight:600, color:'#111827', lineHeight:1.1 }}>{value}</p>
          {sub && <p style={{ margin:'0.375rem 0 0', fontSize:'0.75rem', color:'#9CA3AF' }}>{sub}</p>}
        </div>
        <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:c.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {Icon && <Icon size={20} color={c.icon} />}
        </div>
      </div>
    </div>
  )
}
