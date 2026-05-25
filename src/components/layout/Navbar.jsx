import { useNavigate } from 'react-router-dom'
import { Menu, Bell, RefreshCw, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuthStore, useAppStore, useNotifStore } from '../../store'
import { supabase } from '../../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  const { role, prestataire } = useAuthStore()
  const { toggleSidebar, syncing, lastSync, setSyncing, setLastSync } = useAppStore()
  const { unread } = useNotifStore()
  const [syncDone, setSyncDone] = useState(false)

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    setSyncDone(false)
    try {
      await supabase.from('settings').select('cle').limit(1)
      setLastSync()
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 3000)
    } catch {}
    finally { setSyncing(false) }
  }

  const today = format(new Date(), "EEE d MMM", { locale: fr })

  return (
    <header style={{
      height:'60px', background:'#fff',
      borderBottom:'1px solid #F3F4F6',
      display:'flex', alignItems:'center',
      justifyContent:'space-between',
      padding:'0 1rem',
      position:'sticky', top:0, zIndex:20,
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Gauche */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
        <button onClick={toggleSidebar} className="btn-icon" title="Menu">
          <Menu size={20} />
        </button>
        <span style={{ fontSize:'0.75rem', color:'#9CA3AF', display:'none' }}
          className="sm:block capitalize">{today}</span>
      </div>

      {/* Centre — titre sur mobile */}
      <span style={{ fontSize:'0.875rem', fontWeight:600, color:'#1F2937',
        fontFamily:'var(--font-display)' }}
        className="lg:hidden">
        Bahnel Beauty
      </span>

      {/* Droite */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
        {/* Bouton Sync */}
        <button
          onClick={handleSync} disabled={syncing}
          title="Synchroniser"
          style={{
            display:'inline-flex', alignItems:'center', gap:'0.375rem',
            padding:'0.375rem 0.75rem', borderRadius:'0.75rem',
            fontSize:'0.75rem', fontWeight:500, cursor:'pointer',
            border: syncDone ? '1.5px solid #A7F3D0' : syncing ? '1.5px solid #D1FAE5' : '1.5px solid #E5E7EB',
            background: syncDone ? '#ECFDF5' : syncing ? '#F0FDF4' : '#fff',
            color:   syncDone ? '#065f46' : syncing ? '#059669' : '#6B7280',
            transition:'all 0.2s',
          }}
        >
          {syncDone
            ? <CheckCircle size={13} />
            : <RefreshCw size={13} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
          }
          <span className="hidden sm:inline">
            {syncDone ? 'Synchronisé !' : syncing ? 'Sync…' : 'Sync'}
          </span>
        </button>

        {/* Notifs */}
        <button onClick={() => navigate('/notifications')}
          style={{ position:'relative' }} className="btn-icon" title="Notifications">
          <Bell size={19} />
          {unread > 0 && (
            <span style={{
              position:'absolute', top:'-2px', right:'-2px',
              width:'17px', height:'17px', borderRadius:'50%',
              background:'#EF4444', color:'#fff',
              fontSize:'0.625rem', fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div style={{
          width:'32px', height:'32px', borderRadius:'10px',
          background: role === 'directrice' ? '#1F2937' : '#D1FAE5',
          color:      role === 'directrice' ? '#fff'    : '#065f46',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'0.75rem', fontWeight:600, flexShrink:0,
        }}>
          {role === 'directrice' ? '👑' : `${prestataire?.prenom?.[0] || ''}${prestataire?.nom?.[0] || ''}`}
        </div>
      </div>
    </header>
  )
}
