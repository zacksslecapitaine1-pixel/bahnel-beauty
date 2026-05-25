import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock,
  Scissors, Edit2, Trash2,
  CheckCircle, XCircle, Gift, CreditCard
} from 'lucide-react'
import {
  format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addMonths, subMonths, isSameDay,
  isSameMonth, isToday, eachDayOfInterval
} from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { Modal, ConfirmModal, Loader, EmptyState, StatutBadge, FormGroup } from '../../components/ui'

const STATUTS   = ['Confirmé', 'En cours', 'Terminé', 'Annulé', 'Absent']
const HEURES    = Array.from({ length: 13 }, (_, i) => `${(i + 7).toString().padStart(2,'0')}:00`)
const DUREES    = [30, 45, 60, 90, 120]
const TYPES_PRESTATION = ['Normale', 'Gratuite', 'Sous abonnement']
const RAISONS_GRATUITES = ['Geste commercial', 'Retouche offerte', 'Offre promotionnelle', 'Fidélisation cliente', 'Autre']

const statutStyle = {
  'Confirmé': { bg: 'bg-green-100  border-green-300  text-green-800',  dot: 'bg-green-500'  },
  'En cours': { bg: 'bg-blue-100   border-blue-300   text-blue-800',   dot: 'bg-blue-500'   },
  'Terminé':  { bg: 'bg-gray-100   border-gray-300   text-gray-600',   dot: 'bg-gray-400'   },
  'Annulé':   { bg: 'bg-red-100    border-red-300    text-red-700',    dot: 'bg-red-500'    },
  'Absent':   { bg: 'bg-orange-100 border-orange-300 text-orange-800', dot: 'bg-orange-500' },
}

const typeIcon = {
  'Normale':          null,
  'Gratuite':         <Gift className="w-3 h-3" />,
  'Sous abonnement':  <CreditCard className="w-3 h-3" />,
}

// ===== FORMULAIRE RENDEZ-VOUS =====
function FormulaireRdv({ rdv, dateDefaut, onSave, onClose }) {
  const [form, setForm] = useState({
    client_id: '', prestataire_id: '', prestation_id: '',
    date: dateDefaut ? format(dateDefaut, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    heure: '09:00', duree_minutes: 60, statut: 'Confirmé', notes: '',
    type_prestation: 'Normale', raison_gratuite: '', abonnement_id: '',
    numero_seance: '', total_seances: '',
    ...(rdv ? {
      client_id:        rdv.client_id || '',
      prestataire_id:   rdv.prestataire_id || '',
      prestation_id:    rdv.prestation_id || '',
      date:             rdv.date_heure ? format(parseISO(rdv.date_heure), 'yyyy-MM-dd') : '',
      heure:            rdv.date_heure ? format(parseISO(rdv.date_heure), 'HH:mm') : '09:00',
      duree_minutes:    rdv.duree_minutes || 60,
      statut:           rdv.statut || 'Confirmé',
      notes:            rdv.notes || '',
      type_prestation:  rdv.type_prestation || 'Normale',
      raison_gratuite:  rdv.raison_gratuite || '',
      abonnement_id:    rdv.abonnement_id || '',
      numero_seance:    rdv.numero_seance || '',
      total_seances:    rdv.total_seances || '',
    } : {})
  })
  const [clients, setClients]           = useState([])
  const [prestataires, setPrestataires] = useState([])
  const [prestations, setPrestations]   = useState([])
  const [abonnements, setAbonnements]   = useState([])
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    Promise.all([
      db.get('clients', { order: 'prenom', asc: true }),
      db.get('prestataires', { eq: { actif: true }, order: 'prenom', asc: true }),
      db.get('prestations_catalogue', { eq: { actif: true }, order: 'nom', asc: true,
        select: 'id, nom, prix, duree_minutes, categories_prestations(nom)' }),
    ]).then(([c, p, pr]) => {
      setClients(c || [])
      setPrestataires(p || [])
      setPrestations(pr || [])
    }).catch(() => {})
  }, [])

  // Charger les abonnements du client sélectionné
  useEffect(() => {
    if (form.client_id && form.type_prestation === 'Sous abonnement') {
      db.get('abonnements', {
        eq: { client_id: form.client_id, statut: 'Actif' },
        order: 'created_at',
      }).then(a => setAbonnements(a || [])).catch(() => setAbonnements([]))
    }
  }, [form.client_id, form.type_prestation])

  // AUTO-DÉTECTION : si le client a un abonnement actif → switcher auto en "Sous abonnement"
  useEffect(() => {
    if (!form.client_id) return
    db.get('abonnements', {
      eq: { client_id: form.client_id, statut: 'Actif' },
      order: 'created_at', single: true,
    }).then(abn => {
      if (abn && form.type_prestation === 'Normale') {
        setForm(f => ({
          ...f,
          type_prestation: 'Sous abonnement',
          abonnement_id:   abn.id,
          numero_seance:   (abn.seances_consommees || 0) + 1,
          total_seances:   abn.total_seances || '',
        }))
        toast(`📋 Abonnement détecté : ${abn.prestation_nom || abn.nom} — Séance ${(abn.seances_consommees || 0) + 1}/${abn.total_seances}`, { duration: 4000 })
      }
    }).catch(() => {})
  }, [form.client_id])

  // Auto-remplir durée quand on choisit une prestation
  useEffect(() => {
    if (form.prestation_id) {
      const p = prestations.find(p => p.id === form.prestation_id)
      if (p?.duree_minutes) setForm(f => ({ ...f, duree_minutes: p.duree_minutes }))
    }
  }, [form.prestation_id, prestations])

  // Quand "Gratuite" sélectionné : forcer montant_encaisse = 0
  useEffect(() => {
    if (form.type_prestation === 'Gratuite') {
      setForm(f => ({ ...f, abonnement_id: '', numero_seance: '', total_seances: '' }))
    } else if (form.type_prestation === 'Normale') {
      setForm(f => ({ ...f, raison_gratuite: '', abonnement_id: '', numero_seance: '', total_seances: '' }))
    }
  }, [form.type_prestation])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.client_id || !form.prestataire_id || !form.prestation_id || !form.date || !form.heure) {
      toast.error('Veuillez remplir tous les champs obligatoires.')
      return
    }
    if (form.type_prestation === 'Gratuite' && !form.raison_gratuite) {
      toast.error('Veuillez indiquer la raison de la gratuité.')
      return
    }
    setSaving(true)
    try {
      const date_heure = `${form.date}T${form.heure}:00`
      const payload = {
        client_id: form.client_id, prestataire_id: form.prestataire_id,
        prestation_id: form.prestation_id, date_heure,
        duree_minutes: Number(form.duree_minutes),
        statut: form.statut, notes: form.notes,
        type_prestation: form.type_prestation,
        raison_gratuite: form.type_prestation === 'Gratuite' ? form.raison_gratuite : null,
        abonnement_id:   form.type_prestation === 'Sous abonnement' && form.abonnement_id ? form.abonnement_id : null,
        numero_seance:   form.type_prestation === 'Sous abonnement' && form.numero_seance ? Number(form.numero_seance) : null,
        total_seances:   form.type_prestation === 'Sous abonnement' && form.total_seances ? Number(form.total_seances) : null,
      }
      const saved = rdv?.id
        ? await db.update('rendez_vous', rdv.id, payload)
        : await db.insert('rendez_vous', payload)

      // Notif auto
      if (!rdv?.id) {
        const client = clients.find(c => c.id === form.client_id)
        const prest  = prestations.find(p => p.id === form.prestation_id)
        await db.insert('notifications', {
          titre: 'Nouveau rendez-vous',
          message: `RDV ${prest?.nom || ''} pour ${client?.prenom || ''} ${client?.nom || ''} le ${format(parseISO(date_heure), 'dd/MM à HH:mm')}`,
          type: 'info', cible: 'tous'
        }).catch(() => {})
      }

      toast.success(rdv?.id ? 'Rendez-vous modifié !' : 'Rendez-vous créé !')
      onSave(saved)
    } catch (e) {
      toast.error('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormGroup label="Client" required>
          <select className="select" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Prestataire" required>
          <select className="select" value={form.prestataire_id} onChange={e => set('prestataire_id', e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {prestataires.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
          </select>
        </FormGroup>
        <div className="sm:col-span-2">
          <FormGroup label="Prestation" required>
            <select className="select" value={form.prestation_id} onChange={e => set('prestation_id', e.target.value)}>
              <option value="">-- Sélectionner --</option>
              {prestations.map(p => (
                <option key={p.id} value={p.id}>
                  {p.categories_prestations?.nom} · {p.nom} — {new Intl.NumberFormat('fr-FR').format(p.prix)} FCFA
                </option>
              ))}
            </select>
          </FormGroup>
        </div>

        {/* ===== TYPE DE PRESTATION ===== */}
        <div className="sm:col-span-2">
          <FormGroup label="Type de prestation">
            <div className="flex gap-2 flex-wrap">
              {TYPES_PRESTATION.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type_prestation', t)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    form.type_prestation === t
                      ? t === 'Gratuite' ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : t === 'Sous abonnement' ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-cendre-200 bg-white text-cendre-600 hover:border-cendre-300'
                  }`}
                >
                  {t === 'Gratuite' && <Gift className="w-3.5 h-3.5" />}
                  {t === 'Sous abonnement' && <CreditCard className="w-3.5 h-3.5" />}
                  {t}
                </button>
              ))}
            </div>
          </FormGroup>
        </div>

        {/* Champs conditionnels : Gratuite */}
        {form.type_prestation === 'Gratuite' && (
          <div className="sm:col-span-2">
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" /> Prestation gratuite — Commission = 0 FCFA
              </p>
              <FormGroup label="Raison de la gratuité" required>
                <select className="select" value={form.raison_gratuite} onChange={e => set('raison_gratuite', e.target.value)}>
                  <option value="">-- Sélectionner la raison --</option>
                  {RAISONS_GRATUITES.map(r => <option key={r}>{r}</option>)}
                </select>
              </FormGroup>
            </div>
          </div>
        )}

        {/* Champs conditionnels : Sous abonnement */}
        {form.type_prestation === 'Sous abonnement' && (
          <div className="sm:col-span-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Prestation incluse dans un abonnement
              </p>
              {form.client_id && abonnements.length > 0 && (
                <FormGroup label="Abonnement associé">
                  <select className="select" value={form.abonnement_id} onChange={e => set('abonnement_id', e.target.value)}>
                    <option value="">-- Sélectionner un abonnement --</option>
                    {abonnements.map(a => (
                      <option key={a.id} value={a.id}>{a.nom} (séances restantes : {(a.total_seances || 0) - (a.seances_consommees || 0)})</option>
                    ))}
                  </select>
                </FormGroup>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="N° de séance">
                  <input className="input" type="number" min="1" value={form.numero_seance}
                    onChange={e => set('numero_seance', e.target.value)} placeholder="ex: 3" />
                </FormGroup>
                <FormGroup label="Total séances">
                  <input className="input" type="number" min="1" value={form.total_seances}
                    onChange={e => set('total_seances', e.target.value)} placeholder="ex: 8" />
                </FormGroup>
              </div>
              {form.numero_seance && form.total_seances && (
                <div className="text-center text-sm font-semibold text-blue-700 bg-white rounded-lg py-2">
                  Séance {form.numero_seance} / {form.total_seances}
                  {' — '}
                  {Number(form.total_seances) - Number(form.numero_seance)} restante(s)
                </div>
              )}
            </div>
          </div>
        )}

        <FormGroup label="Date" required>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </FormGroup>
        <FormGroup label="Heure" required>
          <select className="select" value={form.heure} onChange={e => set('heure', e.target.value)}>
            {HEURES.map(h => <option key={h}>{h}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Durée (minutes)">
          <select className="select" value={form.duree_minutes} onChange={e => set('duree_minutes', Number(e.target.value))}>
            {DUREES.map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Statut">
          <select className="select" value={form.statut} onChange={e => set('statut', e.target.value)}>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormGroup>
        <div className="sm:col-span-2">
          <FormGroup label="Notes">
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Remarques, demandes spéciales…" />
          </FormGroup>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : rdv?.id ? 'Modifier' : 'Créer le rendez-vous'}
        </button>
      </div>
    </>
  )
}

// ===== CARTE RDV (liste) =====
function CarteRdv({ rdv, onEdit, onDelete, onStatut }) {
  const s = statutStyle[rdv.statut] || statutStyle['Confirmé']
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${s.bg} transition-all hover:shadow-sm`}>
      <div className={`w-2 h-2 rounded-full ${s.dot} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-cendre-900">
            {rdv.clients?.prenom} {rdv.clients?.nom}
          </p>
          <StatutBadge statut={rdv.statut} />
          {/* Badge type prestation */}
          {rdv.type_prestation === 'Gratuite' && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
              <Gift className="w-2.5 h-2.5" /> Gratuite
            </span>
          )}
          {rdv.type_prestation === 'Sous abonnement' && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              <CreditCard className="w-2.5 h-2.5" />
              {rdv.numero_seance && rdv.total_seances ? `${rdv.numero_seance}/${rdv.total_seances}` : 'Abonnement'}
            </span>
          )}
        </div>
        <p className="text-xs text-cendre-600 mt-0.5">
          {rdv.prestations_catalogue?.nom} · {rdv.prestataires?.prenom} {rdv.prestataires?.nom}
        </p>
        <p className="text-xs text-cendre-400 mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(parseISO(rdv.date_heure), 'HH:mm')} · {rdv.duree_minutes} min
          {rdv.type_prestation === 'Gratuite' ? (
            <span className="ml-2 font-semibold text-violet-500">Offert</span>
          ) : rdv.prestations_catalogue?.prix && (
            <span className="ml-2 font-semibold text-primary-600">
              {new Intl.NumberFormat('fr-FR').format(rdv.prestations_catalogue.prix)} FCFA
            </span>
          )}
        </p>
        {rdv.raison_gratuite && (
          <p className="text-xs text-violet-500 mt-0.5 italic">{rdv.raison_gratuite}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {rdv.statut === 'Confirmé' && (
          <button onClick={() => onStatut(rdv, 'En cours')} className="btn-icon text-blue-500 hover:bg-blue-50" title="Démarrer">
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        {rdv.statut === 'En cours' && (
          <button onClick={() => onStatut(rdv, 'Terminé')} className="btn-icon text-green-500 hover:bg-green-50" title="Terminer">
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
        {(rdv.statut === 'Confirmé' || rdv.statut === 'En cours') && (
          <button onClick={() => onStatut(rdv, 'Annulé')} className="btn-icon text-red-400 hover:bg-red-50" title="Annuler">
            <XCircle className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => onEdit(rdv)} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => onDelete(rdv)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

// ===== MINI CALENDRIER (Vue Mois) =====
function VueMois({ dateRef, rdvParJour, onDayClick, selectedDay }) {
  const debut  = startOfWeek(startOfMonth(dateRef), { weekStartsOn: 1 })
  const fin    = endOfWeek(endOfMonth(dateRef),     { weekStartsOn: 1 })
  const jours  = eachDayOfInterval({ start: debut, end: fin })
  const jSem   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {jSem.map(j => (
          <div key={j} className="text-center text-xs font-semibold text-cendre-400 py-1">{j}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {jours.map(jour => {
          const key    = format(jour, 'yyyy-MM-dd')
          const count  = rdvParJour[key]?.length || 0
          const estMois= isSameMonth(jour, dateRef)
          const estAuj = isToday(jour)
          const estSel = selectedDay && isSameDay(jour, selectedDay)
          return (
            <button
              key={key}
              onClick={() => onDayClick(jour)}
              className={`
                flex flex-col items-center py-1.5 px-1 rounded-lg text-xs transition-all
                ${!estMois ? 'opacity-30' : ''}
                ${estSel  ? 'bg-primary-600 text-white shadow-green'  : estAuj ? 'bg-primary-100 text-primary-700 font-bold' : 'hover:bg-cendre-100'}
              `}
            >
              <span className={`font-medium ${estSel ? 'text-white' : estAuj ? 'text-primary-700' : 'text-cendre-700'}`}>
                {format(jour, 'd')}
              </span>
              {count > 0 && (
                <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${estSel ? 'bg-white' : 'bg-primary-500'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ===== PAGE PRINCIPALE =====
export default function RendezVousPage() {
  const [rdvs, setRdvs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [dateRef, setDateRef]       = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [modal, setModal]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [filtreStatut, setFiltreStatut] = useState('Tous')

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const data  = await db.get('rendez_vous', {
        select: '*, clients(nom,prenom,telephone), prestations_catalogue(nom,prix,duree_minutes), prestataires(nom,prenom)',
        order: 'date_heure', asc: true,
      })
      setRdvs(data || [])
    } catch { toast.error('Erreur chargement rendez-vous') }
    finally { setLoading(false) }
  }, [dateRef])

  useEffect(() => { charger() }, [charger])

  const rdvParJour = {}
  rdvs.forEach(r => {
    const k = format(parseISO(r.date_heure), 'yyyy-MM-dd')
    if (!rdvParJour[k]) rdvParJour[k] = []
    rdvParJour[k].push(r)
  })

  const keyJour  = format(selectedDay, 'yyyy-MM-dd')
  const rdvJour  = (rdvParJour[keyJour] || []).filter(r => filtreStatut === 'Tous' || r.statut === filtreStatut)

  const changerStatut = async (rdv, statut) => {
    try {
      await db.update('rendez_vous', rdv.id, { statut })
      setRdvs(prev => prev.map(r => r.id === rdv.id ? { ...r, statut } : r))
      toast.success(`Statut → ${statut}`)

      // ── Abonnement : incrémenter séances consommées quand RDV terminé ──
      if (statut === 'Terminé' && rdv.type_prestation === 'Sous abonnement') {
        try {
          // Chercher l'abonnement actif du client
          const abns = await db.get('abonnements', {
            eq: { client_id: rdv.client_id, statut: 'Actif' },
            order: 'created_at', single: true,
          })
          if (abns) {
            const nouvConsom = (abns.seances_consommees || 0) + 1
            const termine   = nouvConsom >= (abns.total_seances || 1)
            await db.update('abonnements', abns.id, {
              seances_consommees: nouvConsom,
              statut: termine ? 'Terminé' : 'Actif',
            })
            if (termine) {
              toast('⚠ Toutes les séances de cet abonnement ont été utilisées !', { icon: '⚠️', duration: 5000 })
            } else {
              toast.success(`Séance ${nouvConsom}/${abns.total_seances} enregistrée`)
            }
          }
        } catch (e) {
          console.warn('Erreur maj abonnement :', e)
        }
      }
    } catch { toast.error('Erreur mise à jour statut') }
  }

  const supprimer = async (id) => {
    try {
      await db.delete('rendez_vous', id)
      setRdvs(prev => prev.filter(r => r.id !== id))
      toast.success('Rendez-vous supprimé.')
    } catch { toast.error('Impossible de supprimer.') }
  }

  const close  = () => { setModal(null); setSelected(null) }
  const onSave = (saved) => {
    setRdvs(prev => {
      const exists = prev.find(r => r.id === saved.id)
      return exists ? prev.map(r => r.id === saved.id ? { ...r, ...saved } : r) : [...prev, saved]
    })
    charger()
    close()
  }

  const labelJour = format(selectedDay, "EEEE d MMMM", { locale: fr })

  // Stats du jour (ne pas compter les gratuites dans le CA)
  const rdvTerminesPayants = rdvJour.filter(r => r.statut === 'Terminé' && r.type_prestation !== 'Gratuite')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" /> Rendez-vous
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">{rdvs.length} rendez-vous ce mois</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouveau rendez-vous
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ---- Colonne Gauche : Calendrier ---- */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setDateRef(d => subMonths(d, 1))} className="btn-icon">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-display font-semibold text-cendre-800 capitalize">
                {format(dateRef, 'MMMM yyyy', { locale: fr })}
              </h2>
              <button onClick={() => setDateRef(d => addMonths(d, 1))} className="btn-icon">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <VueMois
              dateRef={dateRef}
              rdvParJour={rdvParJour}
              selectedDay={selectedDay}
              onDayClick={setSelectedDay}
            />
          </div>

          <div className="card-sm">
            <p className="text-xs font-semibold text-cendre-500 uppercase tracking-wide mb-3">Légende</p>
            <div className="space-y-2">
              {STATUTS.map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${statutStyle[s]?.dot}`} />
                  <span className="text-xs text-cendre-600">{s}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-1 pt-1 border-t border-cendre-100">
                <Gift className="w-3 h-3 text-violet-500" />
                <span className="text-xs text-cendre-600">Prestation gratuite</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-cendre-600">Sous abonnement</span>
              </div>
            </div>
          </div>

          <div className="card-sm space-y-2">
            <p className="text-xs font-semibold text-cendre-500 uppercase tracking-wide mb-3">Ce mois</p>
            {STATUTS.map(s => {
              const n = rdvs.filter(r => r.statut === s).length
              return n > 0 ? (
                <div key={s} className="flex items-center justify-between">
                  <span className="text-xs text-cendre-600">{s}</span>
                  <span className="text-xs font-bold text-cendre-800">{n}</span>
                </div>
              ) : null
            })}
            {rdvs.filter(r => r.type_prestation === 'Gratuite').length > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-cendre-100">
                <span className="text-xs text-violet-600 flex items-center gap-1"><Gift className="w-3 h-3" /> Offertes</span>
                <span className="text-xs font-bold text-violet-700">{rdvs.filter(r => r.type_prestation === 'Gratuite').length}</span>
              </div>
            )}
          </div>
        </div>

        {/* ---- Colonne Droite : RDV du jour ---- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-semibold text-cendre-900 capitalize">{labelJour}</h2>
              <p className="text-xs text-cendre-400 mt-0.5">{rdvJour.length} rendez-vous</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['Tous', 'Confirmé', 'En cours', 'Terminé'].map(s => (
                <button
                  key={s}
                  onClick={() => setFiltreStatut(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtreStatut === s ? 'bg-primary-600 text-white' : 'bg-cendre-100 text-cendre-600 hover:bg-cendre-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {!isToday(selectedDay) && (
            <button
              onClick={() => { setSelectedDay(new Date()); setDateRef(new Date()) }}
              className="btn-secondary w-full justify-center"
            >
              <Calendar className="w-4 h-4" /> Revenir à aujourd'hui
            </button>
          )}

          {loading ? <Loader /> : rdvJour.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Aucun rendez-vous"
              description={`Pas de rendez-vous ${filtreStatut !== 'Tous' ? `"${filtreStatut}"` : ''} pour ce jour.`}
              action={
                <button onClick={() => setModal('add')} className="btn-primary">
                  <Plus className="w-4 h-4" /> Ajouter un rendez-vous
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {rdvJour.map(rdv => (
                <CarteRdv
                  key={rdv.id}
                  rdv={rdv}
                  onEdit={r => { setSelected(r); setModal('edit') }}
                  onDelete={r => setConfirmDel(r)}
                  onStatut={changerStatut}
                />
              ))}
            </div>
          )}

          {rdvJour.length > 0 && (
            <div className="card-sm bg-primary-50 border-primary-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary-700">CA encaissé du jour</span>
                <span className="text-lg font-display font-bold text-primary-700">
                  {new Intl.NumberFormat('fr-FR').format(
                    rdvTerminesPayants.reduce((s, r) => s + Number(r.prestations_catalogue?.prix || 0), 0)
                  )} FCFA
                </span>
              </div>
              <p className="text-xs text-primary-500 mt-0.5">
                {rdvTerminesPayants.length} prestation(s) terminée(s) payante(s)
                {rdvJour.filter(r => r.type_prestation === 'Gratuite').length > 0 && (
                  <span className="ml-2 text-violet-500">
                    · {rdvJour.filter(r => r.type_prestation === 'Gratuite').length} offerte(s)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal open={modal === 'add'} onClose={close} title="Nouveau Rendez-vous" size="lg">
        <FormulaireRdv dateDefaut={selectedDay} onSave={onSave} onClose={close} />
      </Modal>

      <Modal open={modal === 'edit'} onClose={close} title="Modifier le Rendez-vous" size="lg">
        <FormulaireRdv rdv={selected} onSave={onSave} onClose={close} />
      </Modal>

      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => { supprimer(confirmDel?.id); setConfirmDel(null) }}
        title="Supprimer ce rendez-vous ?"
        message="Cette action est irréversible."
        danger
      />
    </div>
  )
}
