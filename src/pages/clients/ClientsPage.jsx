import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Search, Phone, Mail, MapPin, Star,
  Edit2, Trash2, Eye, Users, Calendar,
  CreditCard, Award, Gift, CheckCircle, AlertTriangle
} from 'lucide-react'
import { format, parseISO, differenceInYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { Modal, ConfirmModal, Loader, EmptyState, SearchBar, FormGroup } from '../../components/ui'

const SEXES    = ['Femme', 'Homme', 'Autre']
const STATUTS  = ['Actif', 'Inactif', 'Mauvais payeur']
const PRESTATIONS_ABN = [
  'Coiffure', 'Onglerie', 'Massage', 'Spa', 'Soin visage',
  'Épilation à la cire', 'Épilation laser', 'Maquillage', 'Barber', 'Autre'
]
const SEANCES_OPTIONS = [3, 4, 5, 6, 8, 10, 12, 15, 20]

const statutColor = {
  'Actif':         'badge-green',
  'Inactif':       'badge-gray',
  'Mauvais payeur':'badge-red',
}
const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'

// ── Initiales avatar ──────────────────────────────────────────
const Initiales = ({ nom, prenom, typeClient, size = 'md' }) => {
  const s = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  const isAbn = typeClient === 'Abonnement'
  const colors = isAbn
    ? 'bg-blue-100 text-blue-700'
    : ['bg-primary-100 text-primary-700','bg-violet-100 text-violet-700','bg-pink-100 text-pink-700','bg-amber-100 text-amber-700','bg-cyan-100 text-cyan-700'][((nom?.[0] || 'A').charCodeAt(0)) % 5]
  return (
    <div className={`${s} ${colors} rounded-2xl flex items-center justify-center font-semibold font-display shrink-0`}>
      {prenom?.[0]}{nom?.[0]}
    </div>
  )
}

// ── Barre de progression séances ──────────────────────────────
function SeancesBar({ consommees, total }) {
  const pct = total > 0 ? Math.min((consommees / total) * 100, 100) : 0
  const restantes = total - consommees
  const termine   = restantes <= 0
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={termine ? 'text-red-500 font-semibold' : 'text-blue-600 font-semibold'}>
          {termine ? '⚠ Abonnement terminé' : `${consommees} / ${total} séances`}
        </span>
        <span className="text-cendre-400">{!termine && `${restantes} restante(s)`}</span>
      </div>
      <div className="h-2 bg-cendre-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${termine ? 'bg-red-400' : pct >= 80 ? 'bg-orange-400' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── FORMULAIRE CLIENT ─────────────────────────────────────────
function FormulaireClient({ client, abonnementExist, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: '', prenom: '', telephone: '', email: '',
    adresse: '', sexe: 'Femme', date_naissance: '',
    statut: 'Actif', notes: '', type_client: 'Standard',
    ...(client || {})
  })
  // Champs abonnement (séparés, créent un enregistrement dans la table abonnements)
  const [abn, setAbn] = useState({
    prestation_nom:     abonnementExist?.prestation_nom || '',
    total_seances:      abonnementExist?.total_seances  || 8,
    prix:               abonnementExist?.prix           || '',
    date_debut:         abonnementExist?.date_debut     || format(new Date(), 'yyyy-MM-dd'),
    date_fin:           abonnementExist?.date_fin       || '',
    statut:             abonnementExist?.statut         || 'Actif',
  })
  const [saving, setSaving] = useState(false)
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setA = (k, v) => setAbn(a => ({ ...a, [k]: v }))

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) {
      toast.error('Nom et prénom sont requis.')
      return
    }
    if (form.type_client === 'Abonnement' && !abn.prestation_nom) {
      toast.error('Veuillez sélectionner la prestation de l\'abonnement.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.date_naissance) delete payload.date_naissance

      const saved = client?.id
        ? await db.update('clients', client.id, payload)
        : await db.insert('clients', payload)

      // Abonnement : créer ou mettre à jour
      if (form.type_client === 'Abonnement') {
        const abnPayload = {
          client_id:          saved.id,
          nom:                `Abonnement ${abn.prestation_nom}`,
          prestation_nom:     abn.prestation_nom,
          total_seances:      Number(abn.total_seances),
          seances_consommees: abonnementExist?.seances_consommees || 0,
          prix:               Number(abn.prix) || 0,
          date_debut:         abn.date_debut || null,
          date_fin:           abn.date_fin   || null,
          statut:             abn.statut,
        }
        if (abonnementExist?.id) {
          await db.update('abonnements', abonnementExist.id, abnPayload)
        } else {
          await db.insert('abonnements', abnPayload)
        }
      }

      toast.success(client?.id ? 'Client modifié !' : 'Client ajouté !')
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
        <FormGroup label="Prénom" required>
          <input className="input" value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Aminata" />
        </FormGroup>
        <FormGroup label="Nom" required>
          <input className="input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Koffi" />
        </FormGroup>
        <FormGroup label="Téléphone">
          <input className="input" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+228 90 00 00 00" />
        </FormGroup>
        <FormGroup label="Email">
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </FormGroup>
        <FormGroup label="Sexe">
          <select className="select" value={form.sexe} onChange={e => set('sexe', e.target.value)}>
            {SEXES.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Date de naissance">
          <input className="input" type="date" value={form.date_naissance || ''} onChange={e => set('date_naissance', e.target.value)} />
        </FormGroup>
        <FormGroup label="Adresse">
          <input className="input" value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Quartier, Ville" />
        </FormGroup>
        <FormGroup label="Statut">
          <select className="select" value={form.statut} onChange={e => set('statut', e.target.value)}>
            {STATUTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </FormGroup>

        {/* ── TYPE CLIENT ── */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-cendre-100" />
            <span className="text-xs font-semibold text-cendre-400 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="w-3 h-3" /> Type de client
            </span>
            <div className="flex-1 h-px bg-cendre-100" />
          </div>
          <div className="flex gap-3 mt-2">
            {['Standard', 'Abonnement'].map(t => (
              <button key={t} type="button" onClick={() => set('type_client', t)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.type_client === t
                    ? t === 'Abonnement'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-cendre-200 bg-white text-cendre-500 hover:border-cendre-300'
                }`}>
                {t === 'Abonnement' ? <CreditCard className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                Client {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── ABONNEMENT FIELDS ── */}
        {form.type_client === 'Abonnement' && (
          <div className="sm:col-span-2">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                <CreditCard className="w-4 h-4" />
                Détails de l'abonnement
                {abonnementExist && (
                  <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    {abonnementExist.seances_consommees || 0}/{abn.total_seances} séances utilisées
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormGroup label="Prestation de l'abonnement" required>
                  <select className="select" value={abn.prestation_nom} onChange={e => setA('prestation_nom', e.target.value)}>
                    <option value="">-- Choisir la prestation --</option>
                    {PRESTATIONS_ABN.map(p => <option key={p}>{p}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Nombre de séances">
                  <select className="select" value={abn.total_seances} onChange={e => setA('total_seances', e.target.value)}>
                    {SEANCES_OPTIONS.map(n => <option key={n} value={n}>{n} séances</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Prix de l'abonnement (FCFA)">
                  <input className="input" type="number" min="0" value={abn.prix} onChange={e => setA('prix', e.target.value)} placeholder="ex: 50 000" />
                </FormGroup>
                <FormGroup label="Statut abonnement">
                  <select className="select" value={abn.statut} onChange={e => setA('statut', e.target.value)}>
                    {['Actif','Suspendu','Expiré'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Date de début">
                  <input className="input" type="date" value={abn.date_debut || ''} onChange={e => setA('date_debut', e.target.value)} />
                </FormGroup>
                <FormGroup label="Date d'expiration">
                  <input className="input" type="date" value={abn.date_fin || ''} onChange={e => setA('date_fin', e.target.value)} />
                </FormGroup>
              </div>
              {/* Aperçu */}
              {abn.prestation_nom && (
                <div className="p-3 bg-white rounded-xl border border-blue-100 text-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold font-display">
                    {abn.total_seances}
                  </div>
                  <div>
                    <p className="font-semibold text-cendre-800">{abn.prestation_nom}</p>
                    <p className="text-xs text-cendre-400">
                      {abn.total_seances} séances
                      {abn.prix ? ` · ${fcfa(abn.prix)}` : ''}
                      {abn.date_debut ? ` · Début : ${format(new Date(abn.date_debut), 'dd/MM/yyyy')}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="sm:col-span-2">
          <FormGroup label="Notes personnalisées">
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Préférences, allergies, informations spéciales…" />
          </FormGroup>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : client?.id ? 'Modifier' : 'Ajouter le client'}
        </button>
      </div>
    </>
  )
}

// ── FICHE DÉTAIL CLIENT ───────────────────────────────────────
function FicheClient({ client, onEdit, onClose }) {
  const [historique, setHistorique] = useState([])
  const [factures, setFactures]     = useState([])
  const [abonnement, setAbonnement] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      db.get('rendez_vous', {
        select: '*, prestations_catalogue(nom, prix), prestataires(nom, prenom)',
        eq: { client_id: client.id }, order: 'date_heure',
      }),
      db.get('factures', { select: '*', eq: { client_id: client.id }, order: 'date_emission' }),
      db.get('abonnements', { eq: { client_id: client.id }, order: 'created_at', single: true }),
    ]).then(([rdv, facs, abn]) => {
      setHistorique(rdv || [])
      setFactures(facs || [])
      setAbonnement(abn || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [client.id])

  const totalFacture = factures.reduce((s, f) => s + Number(f.montant_net  || 0), 0)
  const totalPaye    = factures.reduce((s, f) => s + Number(f.montant_paye || 0), 0)
  const solde        = totalFacture - totalPaye
  const age = client.date_naissance
    ? differenceInYears(new Date(), parseISO(client.date_naissance)) : null

  return (
    <>
      <div className="modal-body space-y-5">
        {/* Profil */}
        <div className="flex items-center gap-4 p-4 bg-cendre-50 rounded-2xl">
          <Initiales nom={client.nom} prenom={client.prenom} typeClient={client.type_client} size="lg" />
          <div className="flex-1">
            <h3 className="text-xl font-display font-semibold">{client.prenom} {client.nom}</h3>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className={`badge ${statutColor[client.statut] || 'badge-gray'}`}>{client.statut}</span>
              {age && <span className="badge badge-blue">{age} ans</span>}
              {client.sexe && <span className="badge badge-gray">{client.sexe}</span>}
              {client.type_client === 'Abonnement' && (
                <span className="badge badge-blue flex items-center gap-1"><CreditCard className="w-2.5 h-2.5" /> Abonné(e)</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-amber-400" />
              <span className="font-bold text-lg">{client.points_fidelite || 0}</span>
            </div>
            <p className="text-xs text-cendre-400 mt-0.5">points</p>
          </div>
        </div>

        {/* Abonnement actif */}
        {abonnement && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold text-blue-800">{abonnement.prestation_nom || abonnement.nom}</p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    {abonnement.date_debut && `Du ${format(new Date(abonnement.date_debut), 'dd/MM/yyyy')}`}
                    {abonnement.date_fin && ` au ${format(new Date(abonnement.date_fin), 'dd/MM/yyyy')}`}
                    {abonnement.prix > 0 && ` · ${fcfa(abonnement.prix)}`}
                  </p>
                </div>
              </div>
              <span className={`badge text-xs ${abonnement.statut === 'Actif' ? 'badge-blue' : 'badge-gray'}`}>
                {abonnement.statut}
              </span>
            </div>
            <SeancesBar
              consommees={abonnement.seances_consommees || 0}
              total={abonnement.total_seances || 1}
            />
          </div>
        )}

        {/* Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {client.telephone && (
            <a href={`tel:${client.telephone}`} className="card-sm flex items-center gap-2 hover:border-primary-200">
              <Phone className="w-4 h-4 text-primary-500 shrink-0" />
              <span className="text-sm truncate">{client.telephone}</span>
            </a>
          )}
          {client.email && (
            <div className="card-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary-500 shrink-0" />
              <span className="text-sm truncate">{client.email}</span>
            </div>
          )}
          {client.adresse && (
            <div className="card-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
              <span className="text-sm truncate">{client.adresse}</span>
            </div>
          )}
        </div>

        {/* Stats financières */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-lg font-display font-bold text-blue-700">{historique.filter(r => r.statut === 'Terminé').length}</p>
            <p className="text-xs text-blue-500">Visites</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-base font-display font-bold text-green-700">{new Intl.NumberFormat('fr-FR').format(totalPaye)}</p>
            <p className="text-xs text-green-500">FCFA payés</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-base font-display font-bold text-orange-700">{new Intl.NumberFormat('fr-FR').format(solde)}</p>
            <p className="text-xs text-orange-500">FCFA dûs</p>
          </div>
        </div>

        {/* Historique RDV */}
        {loading ? <div className="spinner mx-auto" /> : historique.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-cendre-500 uppercase tracking-wide mb-2">Dernières visites</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {historique.slice().reverse().slice(0, 8).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-cendre-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-cendre-800">{r.prestations_catalogue?.nom}</p>
                    <p className="text-xs text-cendre-400">
                      {format(parseISO(r.date_heure), 'dd/MM/yyyy')} · {r.prestataires?.prenom}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-600">{fcfa(r.prestations_catalogue?.prix)}</p>
                    <span className={`text-xs ${r.statut === 'Terminé' ? 'text-green-500' : r.statut === 'Annulé' ? 'text-red-400' : 'text-orange-400'}`}>
                      {r.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {client.notes && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Notes</p>
            <p className="text-sm text-cendre-700 italic">{client.notes}</p>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Fermer</button>
        <button onClick={onEdit} className="btn-primary"><Edit2 className="w-4 h-4" /> Modifier</button>
      </div>
    </>
  )
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────
export default function ClientsPage() {
  const [clients, setClients]       = useState([])
  const [abonnements, setAbonnements] = useState({}) // map client_id → abonnement
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtreType, setFiltreType] = useState('Tous')
  const [modal, setModal]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [selectedAbn, setSelectedAbn] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [cls, abns] = await Promise.all([
        db.get('clients', { order: 'prenom', asc: true }),
        db.get('abonnements', { order: 'created_at' }),
      ])
      setClients(cls || [])
      // Indexer abonnements par client_id
      const abnMap = {}
      ;(abns || []).forEach(a => { if (a.client_id) abnMap[a.client_id] = a })
      setAbonnements(abnMap)
    } catch { toast.error('Erreur chargement clients') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const supprimer = async (id) => {
    try {
      await db.delete('clients', id)
      setClients(prev => prev.filter(c => c.id !== id))
      toast.success('Client supprimé.')
    } catch { toast.error('Impossible de supprimer.') }
  }

  const filtres = clients.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || `${c.prenom} ${c.nom} ${c.telephone}`.toLowerCase().includes(q)
    const matchT = filtreType === 'Tous' || c.type_client === filtreType || c.statut === filtreType
    return matchQ && matchT
  })

  const close  = () => { setModal(null); setSelected(null); setSelectedAbn(null) }
  const onSave = () => { charger(); close() }

  // KPIs
  const abonnes  = clients.filter(c => c.type_client === 'Abonnement').length
  const actifs   = clients.filter(c => c.statut === 'Actif').length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" /> Clients
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">
            {actifs} actif(s) · <span className="text-blue-500 font-medium">{abonnes} abonné(s)</span>
          </p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {/* Filtres */}
      <div className="card-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Nom, prénom, téléphone…" /></div>
        <div className="flex gap-1.5 flex-wrap">
          {['Tous', 'Standard', 'Abonnement', 'Actif', 'Inactif'].map(f => (
            <button key={f} onClick={() => setFiltreType(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filtreType === f
                  ? f === 'Abonnement' ? 'bg-blue-600 text-white' : 'bg-primary-600 text-white'
                  : 'bg-cendre-100 text-cendre-600 hover:bg-cendre-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : filtres.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client"
          description="Ajoutez votre premier client."
          action={<button onClick={() => setModal('add')} className="btn-primary"><UserPlus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtres.map(c => {
            const abn     = abonnements[c.id]
            const isAbn   = c.type_client === 'Abonnement'
            const termine = isAbn && abn && (abn.seances_consommees || 0) >= (abn.total_seances || 1)
            return (
              <div key={c.id} className="card hover:shadow-medium transition-all group">
                <div className="flex items-start gap-3">
                  <Initiales nom={c.nom} prenom={c.prenom} typeClient={c.type_client} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-semibold text-cendre-900 truncate">{c.prenom} {c.nom}</p>
                      <span className={`badge shrink-0 text-xs ${statutColor[c.statut] || 'badge-gray'}`}>{c.statut}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {isAbn && (
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          termine ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <CreditCard className="w-2.5 h-2.5" />
                          {abn ? `${abn.seances_consommees || 0}/${abn.total_seances} séances` : 'Abonné'}
                        </span>
                      )}
                      {c.telephone && <span className="text-xs text-cendre-400">{c.telephone}</span>}
                    </div>
                    {/* Barre abonnement */}
                    {isAbn && abn && (
                      <SeancesBar consommees={abn.seances_consommees || 0} total={abn.total_seances || 1} />
                    )}
                    {/* Alerte fin d'abonnement */}
                    {termine && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-red-600 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Toutes les séances sont utilisées
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cendre-100">
                  <button onClick={() => { setSelected(c); setModal('view') }} className="btn-secondary flex-1 justify-center text-xs py-2">
                    <Eye className="w-3.5 h-3.5" /> Voir fiche
                  </button>
                  <button onClick={() => { setSelected(c); setSelectedAbn(abn || null); setModal('edit') }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmDel(c)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal === 'add'}  onClose={close} title="Nouveau Client" size="lg">
        <FormulaireClient onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'edit'} onClose={close} title="Modifier le Client" size="lg">
        <FormulaireClient client={selected} abonnementExist={selectedAbn} onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'view'} onClose={close} title="Fiche Client" size="lg">
        {selected && <FicheClient client={selected} onEdit={() => { setSelectedAbn(abonnements[selected.id] || null); setModal('edit') }} onClose={close} />}
      </Modal>
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { supprimer(confirmDel?.id); setConfirmDel(null) }}
        title="Supprimer ce client ?" message="Cette action est irréversible." danger />
    </div>
  )
}
