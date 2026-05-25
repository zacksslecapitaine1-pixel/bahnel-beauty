import { useState, useEffect, useCallback } from 'react'
import {
  UserCheck, Plus, Edit2, Trash2, TrendingUp,
  Phone, Mail, Award, Lock, Eye, EyeOff,
  Briefcase, UserCog, Check, ChevronDown
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { Modal, ConfirmModal, Loader, EmptyState, FormGroup } from '../../components/ui'

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'

// Toutes les spécialités possibles
const SPECIALITES = [
  'Coiffure', 'Coloriste', 'Barbier', 'Onglerie', 'Maquillage',
  'Massage', 'Spa', 'Soin visage', 'Épilation à la cire', 'Épilation laser', 'Beauté des pieds', 'Autre'
]

// ── Multi-Select Spécialités ──────────────────────────────────
function MultiSelectSpecialites({ value = [], onChange }) {
  const [open, setOpen] = useState(false)
  const toggle = (s) => {
    if (value.includes(s)) onChange(value.filter(x => x !== s))
    else onChange([...value, s])
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 cursor-pointer text-left w-full">
        <span className="flex-1 flex flex-wrap gap-1 min-h-[1.25rem]">
          {value.length === 0
            ? <span className="text-cendre-400 text-sm">Sélectionner les spécialités…</span>
            : value.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                {s}
                <button type="button" onClick={e => { e.stopPropagation(); toggle(s) }} className="hover:text-red-500">×</button>
              </span>
            ))
          }
        </span>
        <ChevronDown className={`w-4 h-4 text-cendre-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-cendre-200 rounded-xl shadow-large max-h-56 overflow-y-auto">
          {SPECIALITES.map(s => (
            <button key={s} type="button" onClick={() => toggle(s)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cendre-50 transition-colors text-sm text-left">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                value.includes(s) ? 'bg-primary-600 border-primary-600' : 'border-cendre-300'
              }`}>
                {value.includes(s) && <Check className="w-3 h-3 text-white" />}
              </div>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FORMULAIRE PRESTATAIRE ────────────────────────────────────
function FormulairePrestataire({ prestataire, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: '', prenom: '', poste: '', telephone: '', email: '',
    salaire_base: '', taux_commission: 10,
    date_embauche: '', notes: '', actif: true,
    type_contrat: 'Salarié(e)',
    specialites: [],
    ...(prestataire || {}),
    specialites: prestataire?.specialites
      ? (typeof prestataire.specialites === 'string'
          ? JSON.parse(prestataire.specialites) : prestataire.specialites)
      : [],
  })
  const [password, setPassword]       = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]           = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isSousTraitant = form.type_contrat === 'Sous-traitant(e)'

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) { toast.error('Nom et prénom requis.'); return }
    if (!prestataire?.id && !password.trim()) {
      toast.error('Le mot de passe est obligatoire.'); return
    }
    if (password && password !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas.'); return }
    if (password && password.length < 4) { toast.error('Mot de passe trop court (min 4 caractères).'); return }
    if (form.specialites.length === 0) { toast.error('Sélectionnez au moins une spécialité.'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        // Un sous-traitant n'a pas de salaire de base
        salaire_base:    isSousTraitant ? 0 : (Number(form.salaire_base) || 0),
        taux_commission: Number(form.taux_commission) || 0,
        specialites:     JSON.stringify(form.specialites),
      }
      if (!payload.date_embauche) delete payload.date_embauche
      if (password) payload.password_hash = password

      const saved = prestataire?.id
        ? await db.update('prestataires', prestataire.id, payload)
        : await db.insert('prestataires', payload)

      toast.success(prestataire?.id ? 'Prestataire modifiée !' : 'Prestataire ajoutée !')
      onSave(saved)
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
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

        {/* ── TYPE DE CONTRAT ── */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-cendre-100" />
            <span className="text-xs font-semibold text-cendre-400 uppercase tracking-wide flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" /> Type de contrat
            </span>
            <div className="flex-1 h-px bg-cendre-100" />
          </div>
          <div className="flex gap-3 mt-2">
            {['Salarié(e)', 'Sous-traitant(e)'].map(t => (
              <button key={t} type="button" onClick={() => set('type_contrat', t)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.type_contrat === t
                    ? t === 'Sous-traitant(e)'
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-cendre-200 bg-white text-cendre-500 hover:border-cendre-300'
                }`}>
                {t === 'Sous-traitant(e)' ? <UserCog className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                {t}
              </button>
            ))}
          </div>
          {/* Explication sous-traitant */}
          {isSousTraitant && (
            <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-700 space-y-1">
              <p className="font-semibold flex items-center gap-1.5"><UserCog className="w-3.5 h-3.5" /> Sous-traitant(e) indépendant(e)</p>
              <ul className="space-y-0.5 pl-2">
                <li>• Aucun salaire de base — rémunéré(e) uniquement sur ses prestations</li>
                <li>• Le <strong>taux de commission</strong> représente sa part sur chaque prestation réalisée</li>
                <li>• Pas de lien de subordination salariale avec le salon</li>
              </ul>
            </div>
          )}
        </div>

        {/* ── SPÉCIALITÉS MULTIPLES ── */}
        <div className="sm:col-span-2">
          <FormGroup label="Spécialités" required>
            <MultiSelectSpecialites
              value={form.specialites}
              onChange={v => set('specialites', v)}
            />
          </FormGroup>
        </div>

        <FormGroup label="Poste / Titre (optionnel)">
          <input className="input" value={form.poste} onChange={e => set('poste', e.target.value)} placeholder="ex: Coiffeuse senior" />
        </FormGroup>
        <FormGroup label="Date d'embauche">
          <input className="input" type="date" value={form.date_embauche || ''} onChange={e => set('date_embauche', e.target.value)} />
        </FormGroup>
        <FormGroup label="Téléphone">
          <input className="input" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+228 92 00 00 00" />
        </FormGroup>
        <FormGroup label="Email">
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </FormGroup>

        {/* Salaire uniquement pour salarié */}
        {!isSousTraitant && (
          <FormGroup label="Salaire de base (FCFA)">
            <input className="input" type="number" min="0" value={form.salaire_base} onChange={e => set('salaire_base', e.target.value)} placeholder="0" />
          </FormGroup>
        )}

        <FormGroup label={isSousTraitant ? '% reversé sur ses prestations' : 'Taux de commission (%)'}>
          <div className="relative">
            <input className="input pr-10" type="number" min="0" max="100" step="0.5"
              value={form.taux_commission} onChange={e => set('taux_commission', e.target.value)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cendre-400 text-sm font-bold">%</span>
          </div>
          {isSousTraitant && (
            <p className="text-xs text-violet-500 mt-1">
              Ex : 60% → pour une prestation à 10 000 FCFA, le sous-traitant perçoit 6 000 FCFA
            </p>
          )}
        </FormGroup>

        {/* Séparateur mot de passe */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-cendre-100" />
            <span className="text-xs font-semibold text-cendre-400 uppercase tracking-wide flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Accès & Connexion
            </span>
            <div className="flex-1 h-px bg-cendre-100" />
          </div>
        </div>

        <FormGroup label={prestataire?.id ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe de connexion'} required={!prestataire?.id}>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} className="input pr-10"
              value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPwd(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cendre-400 hover:text-cendre-600">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FormGroup>
        <FormGroup label="Confirmer le mot de passe" required={!prestataire?.id}>
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} className="input pr-10"
              value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowConfirm(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cendre-400 hover:text-cendre-600">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </FormGroup>

        <div className="sm:col-span-2">
          <FormGroup label="Notes">
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </FormGroup>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="button" onClick={() => set('actif', !form.actif)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.actif ? 'bg-primary-600' : 'bg-cendre-300'}`}>
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${form.actif ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <label className="text-sm text-cendre-700">{form.actif ? 'Actif(ve)' : 'Inactif(ve)'}</label>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : prestataire?.id ? 'Modifier' : 'Ajouter'}
        </button>
      </div>
    </>
  )
}

// ── FICHE PERFORMANCES ────────────────────────────────────────
function FichePerf({ p, onClose }) {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const specialites = p.specialites
    ? (typeof p.specialites === 'string' ? JSON.parse(p.specialites) : p.specialites)
    : []
  const isST = p.type_contrat === 'Sous-traitant(e)'

  useEffect(() => {
    Promise.all([
      db.get('rendez_vous', {
        select: 'id, statut, prestations_catalogue(prix)',
        eq: { prestataire_id: p.id },
      }),
      db.get('commissions', {
        select: '*',
        eq: { prestataire_id: p.id },
      }),
    ]).then(([rdvs, comms]) => {
      const rdvTermines   = (rdvs || []).filter(r => r.statut === 'Terminé')
      const caGenere      = rdvTermines.reduce((s, r) => s + Number(r.prestations_catalogue?.prix || 0), 0)
      const commTotal     = (comms || []).reduce((s, c) => s + Number(c.montant_commission || 0), 0)
      const commAttente   = (comms || []).filter(c => c.statut === 'En attente').reduce((s, c) => s + Number(c.montant_commission || 0), 0)
      setStats({ total: rdvs?.length || 0, termines: rdvTermines.length, caGenere, commTotal, commAttente })
    }).catch(() => setStats(null)).finally(() => setLoading(false))
  }, [p.id])

  return (
    <>
      <div className="modal-body space-y-5">
        {/* Profil */}
        <div className="flex items-center gap-4 p-4 bg-cendre-50 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-display font-semibold text-2xl">
            {p.prenom?.[0]}{p.nom?.[0]}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-display font-semibold">{p.prenom} {p.nom}</h3>
            {p.poste && <p className="text-sm text-cendre-500">{p.poste}</p>}
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className={`badge ${p.actif ? 'badge-green' : 'badge-gray'}`}>{p.actif ? 'Actif(ve)' : 'Inactif(ve)'}</span>
              <span className={`badge ${isST ? 'badge-violet' : 'badge-blue'}`}>
                {isST ? '🔧 Sous-traitant(e)' : '👔 Salarié(e)'}
              </span>
              <span className="badge badge-orange">{p.taux_commission}%</span>
              {p.last_login && (
                <span className="badge badge-gray text-xs">
                  Connecté(e) : {format(new Date(p.last_login), 'dd/MM/yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Spécialités */}
        {specialites.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-cendre-500 uppercase tracking-wide mb-2">Spécialités</p>
            <div className="flex flex-wrap gap-2">
              {specialites.map(s => (
                <span key={s} className="px-3 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Infos contrat */}
        <div className={`p-4 rounded-xl border ${isST ? 'bg-violet-50 border-violet-200' : 'bg-primary-50 border-primary-100'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isST ? 'text-violet-700' : 'text-primary-700'}`}>
            {isST ? '🔧 Contrat sous-traitance' : '💼 Contrat salarié'}
          </p>
          {!isST && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-cendre-600">Salaire de base</span>
              <span className="font-semibold">{fcfa(p.salaire_base)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-cendre-600">{isST ? 'Part reversée sur ses prestations' : 'Commission sur ventes'}</span>
            <span className="font-semibold">{p.taux_commission}%</span>
          </div>
          {isST && (
            <p className="text-xs text-violet-500 mt-2 italic">
              Rémunéré(e) uniquement sur le montant réellement encaissé de ses prestations.
            </p>
          )}
          {p.date_embauche && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-cendre-600">Date d'embauche</span>
              <span className="font-semibold">{format(new Date(p.date_embauche), 'dd/MM/yyyy')}</span>
            </div>
          )}
        </div>

        {/* Sécurité */}
        <div className={`p-3 rounded-xl border flex items-center gap-2 text-sm ${
          p.password_hash ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'
        }`}>
          <Lock className="w-4 h-4 shrink-0" />
          {p.password_hash ? '✓ Mot de passe configuré' : '⚠ Pas encore de mot de passe — modifiez la fiche pour en ajouter un.'}
        </div>

        {/* Stats */}
        {loading ? <div className="spinner mx-auto" /> : stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-display font-bold text-blue-700">{stats.termines}</p>
              <p className="text-xs text-blue-500">Prestations</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-lg font-display font-bold text-green-700">{new Intl.NumberFormat('fr-FR').format(stats.caGenere)}</p>
              <p className="text-xs text-green-500">CA généré</p>
            </div>
            <div className="text-center p-3 bg-violet-50 rounded-xl">
              <p className="text-lg font-display font-bold text-violet-700">{new Intl.NumberFormat('fr-FR').format(stats.commTotal)}</p>
              <p className="text-xs text-violet-500">{isST ? 'Gains totaux' : 'Comm. totales'}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <p className="text-lg font-display font-bold text-orange-700">{new Intl.NumberFormat('fr-FR').format(stats.commAttente)}</p>
              <p className="text-xs text-orange-500">En attente</p>
            </div>
          </div>
        )}

        {p.notes && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-cendre-700">{p.notes}</p>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Fermer</button>
      </div>
    </>
  )
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────
export default function PrestatairesPage() {
  const [prestataires, setPrestataires] = useState([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)
  const [confirmDel, setConfirmDel]     = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const data = await db.get('prestataires', { order: 'prenom', asc: true })
      setPrestataires(data || [])
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const supprimer = async (id) => {
    try {
      await db.delete('prestataires', id)
      setPrestataires(prev => prev.filter(x => x.id !== id))
      toast.success('Prestataire supprimée.')
    } catch { toast.error('Impossible de supprimer.') }
  }

  const close  = () => { setModal(null); setSelected(null) }
  const onSave = () => { charger(); close() }

  const salaries     = prestataires.filter(p => p.type_contrat !== 'Sous-traitant(e)' && p.actif)
  const sousTraitants = prestataires.filter(p => p.type_contrat === 'Sous-traitant(e)' && p.actif)
  const inactifs      = prestataires.filter(p => !p.actif)

  const Carte = ({ p }) => {
    const specs  = p.specialites
      ? (typeof p.specialites === 'string' ? JSON.parse(p.specialites) : p.specialites) : []
    const isST   = p.type_contrat === 'Sous-traitant(e)'
    return (
      <div className={`card hover:shadow-medium transition-all group ${!p.actif ? 'opacity-60' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-semibold text-xl shrink-0 transition-all
            ${isST
              ? 'bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white'
              : 'bg-primary-100 text-primary-700 group-hover:bg-primary-600 group-hover:text-white'
            }`}>
            {p.prenom?.[0]}{p.nom?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-cendre-900">{p.prenom} {p.nom}</p>
                {p.poste && <p className="text-xs text-cendre-500">{p.poste}</p>}
              </div>
              <span className={`badge shrink-0 text-xs ${isST ? 'badge-violet' : 'badge-blue'}`}>
                {isST ? '🔧 Sous-traitant' : '👔 Salarié'}
              </span>
            </div>
            {/* Spécialités (max 3 affichées) */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {specs.slice(0, 3).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-cendre-100 text-cendre-600">{s}</span>
              ))}
              {specs.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cendre-100 text-cendre-400">+{specs.length - 3}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-cendre-400">
              <span className="font-semibold text-primary-600">{p.taux_commission}%</span>
              {!isST && p.salaire_base > 0 && <span>{fcfa(p.salaire_base)}</span>}
              {p.telephone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{p.telephone}</span>}
              <span className={`flex items-center gap-0.5 ${p.password_hash ? 'text-green-500' : 'text-amber-500'}`}>
                <Lock className="w-2.5 h-2.5" />{p.password_hash ? 'MDP ✓' : 'Sans MDP'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cendre-100">
          <button onClick={() => { setSelected(p); setModal('view') }} className="btn-secondary flex-1 justify-center text-xs py-2">
            <TrendingUp className="w-3.5 h-3.5" /> Stats
          </button>
          <button onClick={() => { setSelected(p); setModal('edit') }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => setConfirmDel(p)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    )
  }

  const Section = ({ title, items, count }) => items.length === 0 ? null : (
    <div>
      <h2 className="text-sm font-semibold text-cendre-500 uppercase tracking-wide mb-3">{title} ({count})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(p => <Carte key={p.id} p={p} />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary-600" /> Prestataires
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">
            {salaries.length} salarié(s) · <span className="text-violet-600 font-medium">{sousTraitants.length} sous-traitant(s)</span>
          </p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {loading ? <Loader /> : prestataires.length === 0 ? (
        <EmptyState icon={UserCheck} title="Aucune prestataire"
          description="Ajoutez vos prestataires et sous-traitants."
          action={<button onClick={() => setModal('add')} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="space-y-7">
          <Section title="Employé(e)s salarié(e)s" items={salaries}      count={salaries.length} />
          <Section title="Sous-traitant(e)s"       items={sousTraitants} count={sousTraitants.length} />
          <Section title="Inactif(ve)s"            items={inactifs}      count={inactifs.length} />
        </div>
      )}

      <Modal open={modal === 'add'}  onClose={close} title="Nouveau(elle) Prestataire" size="lg">
        <FormulairePrestataire onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'edit'} onClose={close} title="Modifier la Prestataire" size="lg">
        <FormulairePrestataire prestataire={selected} onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'view'} onClose={close} title="Fiche Prestataire" size="lg">
        {selected && <FichePerf p={selected} onClose={close} />}
      </Modal>
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { supprimer(confirmDel?.id); setConfirmDel(null) }}
        title="Supprimer cette prestataire ?" message="Cette action est irréversible." danger />
    </div>
  )
}
