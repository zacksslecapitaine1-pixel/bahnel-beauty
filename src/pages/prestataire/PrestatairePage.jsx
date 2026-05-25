import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, CheckCircle, XCircle, User, Scissors, TrendingUp, Package } from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { db } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import { Loader, StatutBadge } from '../../components/ui'
import toast from 'react-hot-toast'

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'

const statutStyle = {
  'Confirmé': { bg: 'bg-green-50  border-green-200',  dot: 'bg-green-500'  },
  'En cours': { bg: 'bg-blue-50   border-blue-200',   dot: 'bg-blue-500'   },
  'Terminé':  { bg: 'bg-gray-100  border-gray-200',   dot: 'bg-gray-400'   },
  'Annulé':   { bg: 'bg-red-50    border-red-200',    dot: 'bg-red-500'    },
  'Absent':   { bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
}

// Planning personnel du prestataire
export function PrestataireHomePage() {
  const { prestataire } = useAuthStore()
  const [rdvs, setRdvs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet]   = useState('aujourd\'hui')

  const charger = useCallback(async () => {
    if (!prestataire?.id) return
    setLoading(true)
    try {
      const data = await db.get('rendez_vous', {
        select: '*, clients(nom,prenom,telephone), prestations_catalogue(nom,prix,duree_minutes,categories_prestations(nom))',
        eq: { prestataire_id: prestataire.id },
        order: 'date_heure', asc: true,
      })
      setRdvs(data || [])
    } catch { toast.error('Erreur chargement planning') }
    finally { setLoading(false) }
  }, [prestataire?.id])

  useEffect(() => { charger() }, [charger])

  const maintenant = new Date()
  const rdvFiltres = rdvs.filter(r => {
    const d = parseISO(r.date_heure)
    if (onglet === 'aujourd\'hui') return isToday(d)
    if (onglet === 'demain')       return isTomorrow(d)
    if (onglet === 'semaine')      return d >= maintenant && d <= addDays(maintenant, 7)
    return true
  })

  const changerStatut = async (rdv, statut) => {
    try {
      await db.update('rendez_vous', rdv.id, { statut })
      setRdvs(prev => prev.map(r => r.id === rdv.id ? { ...r, statut } : r))
      toast.success(`Statut → ${statut}`)
    } catch { toast.error('Erreur') }
  }

  // Stats du prestataire
  const rdvAujourdhuiCount  = rdvs.filter(r => isToday(parseISO(r.date_heure))).length
  const rdvTerminesTotal    = rdvs.filter(r => r.statut === 'Terminé').length
  const caGenere            = rdvs.filter(r => r.statut === 'Terminé').reduce((s, r) => s + Number(r.prestations_catalogue?.prix || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Bienvenue */}
      <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-display font-bold text-2xl">
            {prestataire?.prenom?.[0]}{prestataire?.nom?.[0]}
          </div>
          <div>
            <p className="text-white/70 text-sm">Bonjour 👋</p>
            <h1 className="text-2xl font-display font-semibold">{prestataire?.prenom} {prestataire?.nom}</h1>
            <p className="text-white/60 text-sm">{prestataire?.poste || 'Prestataire'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/20">
          <div className="text-center">
            <p className="text-2xl font-display font-bold">{rdvAujourdhuiCount}</p>
            <p className="text-xs text-white/60">RDV aujourd'hui</p>
          </div>
          <div className="text-center border-x border-white/20">
            <p className="text-2xl font-display font-bold">{rdvTerminesTotal}</p>
            <p className="text-xs text-white/60">Terminés (total)</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-display font-bold">{new Intl.NumberFormat('fr-FR').format(caGenere)}</p>
            <p className="text-xs text-white/60">FCFA générés</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 bg-cendre-100 p-1 rounded-xl">
        {[["aujourd'hui", "Aujourd'hui"], ['demain', 'Demain'], ['semaine', 'Cette semaine'], ['tous', 'Tous']].map(([v, l]) => (
          <button key={v} onClick={() => setOnglet(v)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${onglet === v ? 'bg-white text-primary-700 shadow-sm' : 'text-cendre-600 hover:text-cendre-800'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste RDV */}
      {loading ? <Loader /> : rdvFiltres.length === 0 ? (
        <div className="card text-center py-10">
          <Calendar className="w-12 h-12 text-cendre-200 mx-auto mb-3" />
          <p className="text-cendre-500 font-medium">Aucun rendez-vous</p>
          <p className="text-sm text-cendre-300 mt-1">Pas de rendez-vous pour cette période</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rdvFiltres.map(rdv => {
            const s = statutStyle[rdv.statut] || statutStyle['Confirmé']
            const date = parseISO(rdv.date_heure)
            return (
              <div key={rdv.id} className={`flex gap-4 p-4 rounded-2xl border-2 ${s.bg} transition-all`}>
                {/* Heure */}
                <div className="text-center shrink-0 w-14">
                  <p className="text-xl font-display font-bold text-cendre-800">{format(date, 'HH:mm')}</p>
                  <p className="text-xs text-cendre-400 capitalize">{format(date, 'EEE d', { locale: fr })}</p>
                  <div className={`w-2 h-2 rounded-full ${s.dot} mx-auto mt-1.5`} />
                </div>
                <div className="w-px bg-current opacity-10 self-stretch" />
                {/* Détails */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-cendre-800">
                        {rdv.clients?.prenom} {rdv.clients?.nom}
                      </p>
                      {rdv.clients?.telephone && (
                        <a href={`tel:${rdv.clients.telephone}`} className="text-xs text-primary-600 hover:underline">
                          {rdv.clients.telephone}
                        </a>
                      )}
                    </div>
                    <StatutBadge statut={rdv.statut} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-cendre-500">
                    <span className="flex items-center gap-1"><Scissors className="w-3 h-3" />{rdv.prestations_catalogue?.nom}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{rdv.duree_minutes} min</span>
                    {rdv.prestations_catalogue?.prix && (
                      <span className="font-semibold text-primary-600">{fcfa(rdv.prestations_catalogue.prix)}</span>
                    )}
                  </div>
                </div>
                {/* Actions rapides */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {rdv.statut === 'Confirmé' && (
                    <button onClick={() => changerStatut(rdv, 'En cours')}
                      className="p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors" title="Démarrer">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {rdv.statut === 'En cours' && (
                    <button onClick={() => changerStatut(rdv, 'Terminé')}
                      className="p-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors" title="Terminer">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {(rdv.statut === 'Confirmé' || rdv.statut === 'En cours') && (
                    <button onClick={() => changerStatut(rdv, 'Absent')}
                      className="p-2 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors" title="Absent">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Page commissions du prestataire
export function PrestataireCommissionsPage() {
  const { prestataire } = useAuthStore()
  const [comms, setComms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!prestataire?.id) return
    db.get('commissions', {
      select: '*, factures(numero, date_emission)',
      eq: { prestataire_id: prestataire.id },
      order: 'created_at',
    }).then(data => setComms(data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [prestataire?.id])

  const total       = comms.reduce((s, c) => s + Number(c.montant_commission || 0), 0)
  const enAttente   = comms.filter(c => c.statut === 'En attente').reduce((s, c) => s + Number(c.montant_commission || 0), 0)
  const payees      = comms.filter(c => c.statut === 'Payée').reduce((s, c) => s + Number(c.montant_commission || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="page-title flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-primary-600" /> Mes Commissions
      </h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center"><p className="text-2xl font-display font-bold text-primary-600">{fcfa(total)}</p><p className="text-xs text-cendre-400 mt-1">Total commissions</p></div>
        <div className="card text-center"><p className="text-2xl font-display font-bold text-orange-600">{fcfa(enAttente)}</p><p className="text-xs text-cendre-400 mt-1">En attente</p></div>
        <div className="card text-center"><p className="text-2xl font-display font-bold text-green-600">{fcfa(payees)}</p><p className="text-xs text-cendre-400 mt-1">Payées</p></div>
      </div>
      {loading ? <Loader /> : comms.length === 0 ? (
        <div className="card text-center py-10 text-cendre-400"><TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Aucune commission enregistrée.</p></div>
      ) : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead><tr>
                <th className="th">Facture</th>
                <th className="th">Mois</th>
                <th className="th">Prestation</th>
                <th className="th">Taux</th>
                <th className="th">Commission</th>
                <th className="th">Statut</th>
              </tr></thead>
              <tbody>
                {comms.map(c => (
                  <tr key={c.id} className="tr-hover">
                    <td className="td font-mono text-sm">{c.factures?.numero || '—'}</td>
                    <td className="td text-sm">{c.mois}/{c.annee}</td>
                    <td className="td text-sm">{fcfa(c.montant_prestation)}</td>
                    <td className="td text-sm">{c.taux_commission}%</td>
                    <td className="td font-semibold text-primary-600">{fcfa(c.montant_commission)}</td>
                    <td className="td"><span className={`badge ${c.statut === 'Payée' ? 'badge-green' : 'badge-orange'}`}>{c.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
