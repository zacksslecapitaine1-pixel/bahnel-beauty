import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { useNotifStore } from '../../store'
import { EmptyState, Loader } from '../../components/ui'

const typeStyle = {
  info:    { icon: Info,          bg: 'bg-blue-50   border-blue-100',   icon_cls: 'text-blue-500'   },
  alerte:  { icon: AlertTriangle, bg: 'bg-orange-50 border-orange-100', icon_cls: 'text-orange-500' },
  succès:  { icon: CheckCircle,   bg: 'bg-green-50  border-green-100',  icon_cls: 'text-green-500'  },
  erreur:  { icon: XCircle,       bg: 'bg-red-50    border-red-100',    icon_cls: 'text-red-500'    },
}

export default function NotificationsPage() {
  const [notifs, setNotifs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtre, setFiltre]     = useState('Toutes')
  const { setNotifications }    = useNotifStore()

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const data = await db.get('notifications', { order: 'created_at' })
      setNotifs(data || [])
      setNotifications(data || [])
    } catch { toast.error('Erreur chargement notifications') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const marquerLu = async (id) => {
    try {
      await db.update('notifications', id, { lu: true })
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
    } catch {}
  }

  const marquerTousLus = async () => {
    try {
      const nonLus = notifs.filter(n => !n.lu)
      await Promise.all(nonLus.map(n => db.update('notifications', n.id, { lu: true })))
      setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
      setNotifications(notifs.map(n => ({ ...n, lu: true })))
      toast.success('Toutes les notifications marquées comme lues.')
    } catch { toast.error('Erreur') }
  }

  const supprimer = async (id) => {
    try {
      await db.delete('notifications', id)
      setNotifs(prev => prev.filter(n => n.id !== id))
      toast.success('Notification supprimée.')
    } catch { toast.error('Erreur') }
  }

  const toutSupprimer = async () => {
    try {
      await Promise.all(notifs.map(n => db.delete('notifications', n.id)))
      setNotifs([])
      setNotifications([])
      toast.success('Toutes les notifications supprimées.')
    } catch { toast.error('Erreur') }
  }

  const filtrees = notifs.filter(n => {
    if (filtre === 'Non lues') return !n.lu
    if (filtre === 'Lues')     return  n.lu
    return true
  })

  const nonLuCount = notifs.filter(n => !n.lu).length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" /> Notifications
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">
            {nonLuCount > 0 ? <span className="text-primary-600 font-semibold">{nonLuCount} non lue(s)</span> : 'Tout est à jour'}
            {' '}· {notifs.length} au total
          </p>
        </div>
        <div className="flex gap-2">
          {nonLuCount > 0 && (
            <button onClick={marquerTousLus} className="btn-secondary">
              <CheckCheck className="w-4 h-4" /> Tout marquer lu
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={toutSupprimer} className="btn-danger">
              <Trash2 className="w-4 h-4" /> Tout supprimer
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {['Toutes', 'Non lues', 'Lues'].map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${filtre === f ? 'bg-primary-600 text-white border-primary-600 shadow-green' : 'bg-white text-cendre-600 border-cendre-200 hover:border-primary-300'}`}>
            {f}
            {f === 'Non lues' && nonLuCount > 0 && (
              <span className="ml-1.5 bg-white text-primary-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{nonLuCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : filtrees.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification"
          description={filtre === 'Non lues' ? 'Toutes vos notifications ont été lues.' : 'Aucune notification pour le moment.'} />
      ) : (
        <div className="space-y-2.5">
          {filtrees.map(n => {
            const ts = typeStyle[n.type] || typeStyle.info
            const Icon = ts.icon
            return (
              <div
                key={n.id}
                onClick={() => !n.lu && marquerLu(n.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${ts.bg} ${!n.lu ? 'cursor-pointer hover:shadow-sm' : 'opacity-75'}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0`}>
                  <Icon className={`w-5 h-5 ${ts.icon_cls}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold text-cendre-800 ${!n.lu ? '' : 'opacity-70'}`}>{n.titre}</p>
                      <p className="text-sm text-cendre-600 mt-0.5">{n.message}</p>
                    </div>
                    {!n.lu && <div className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0 mt-1.5 animate-pulse" />}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-xs text-cendre-400">
                      {format(parseISO(n.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                    {n.cible !== 'tous' && (
                      <span className="badge badge-violet text-[10px]">{n.cible}</span>
                    )}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); supprimer(n.id) }}
                  className="btn-icon text-cendre-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
