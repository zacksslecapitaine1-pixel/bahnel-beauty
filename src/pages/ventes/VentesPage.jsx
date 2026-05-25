import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Plus, Trash2, DollarSign, Download, FileText, Eye, Printer } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { db, supabase } from '../../lib/supabase'
import { Modal, ConfirmModal, Loader, EmptyState, SearchBar, StatutBadge, FormGroup } from '../../components/ui'
import { downloadInvoice, exportFacturePDF, calculateCommission } from '../../lib/pdfExport'

const fcfa    = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'
const MODES   = ['Espèces','Flooz','T-Money','Virement bancaire','Carte bancaire','Autre']
const STATUTS = ['Non payée','Partiellement payée','Payée','En retard']

const statutColor = {
  'Payée':             'badge-green',
  'Non payée':         'badge-orange',
  'Partiellement payée':'badge-blue',
  'En retard':         'badge-red',
}

// ===== GÉNÉRATEUR NUMÉRO FACTURE =====
async function genNumero() {
  const annee = new Date().getFullYear()
  const { count } = await supabase.from('factures').select('id', { count: 'exact', head: true })
  return `BBI-${annee}-${String((count || 0) + 1).padStart(4, '0')}`
}

// ===== CHARGEMENT INFOS SALON =====
async function getSalonInfo() {
  try {
    const [nom, tel, adr, email] = await Promise.all([
      db.getSetting('salon_nom'),
      db.getSetting('salon_telephone'),
      db.getSetting('salon_adresse'),
      db.getSetting('salon_email'),
    ])
    return { nom: nom || 'Bahnel Beauty Institute', telephone: tel || '', adresse: adr || '', email: email || '' }
  } catch {
    return { nom: 'Bahnel Beauty Institute', telephone: '', adresse: '', email: '' }
  }
}

// ===== FORMULAIRE NOUVELLE FACTURE =====
function FormFacture({ onSave, onClose }) {
  const [clients, setClients]         = useState([])
  const [prestataires, setPrestataires] = useState([])
  const [prestations, setPrestations] = useState([])
  const [produits, setProduits]       = useState([])
  const [form, setForm] = useState({
    client_id: '', prestataire_id: '', remise_montant: 0,
    mode_paiement: 'Espèces', montant_paye: '', notes: ''
  })
  const [lignes, setLignes] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      db.get('clients', { order: 'prenom', asc: true }),
      db.get('prestataires', { eq: { actif: true }, order: 'prenom', asc: true }),
      db.get('prestations_catalogue', { eq: { actif: true }, select: 'id,nom,prix,categories_prestations(nom)', order: 'nom', asc: true }),
      db.get('produits', { eq: { actif: true }, select: 'id,nom,prix_vente,stock_actuel', order: 'nom', asc: true }),
    ]).then(([c, p, pr, pd]) => {
      setClients(c || [])
      setPrestataires(p || [])
      setPrestations(pr || [])
      setProduits(pd || [])
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const ajouterLigne = (type, item) => {
    const prix = type === 'prestation' ? item.prix : item.prix_vente
    setLignes(prev => [...prev, {
      id: Date.now(), type,
      description: item.nom, quantite: 1,
      prix_unitaire: prix, sous_total: prix,
      ref_id: item.id,
    }])
  }

  const updateLigne = (id, k, v) => {
    setLignes(prev => prev.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [k]: k === 'quantite' || k === 'prix_unitaire' ? Number(v) : v }
      updated.sous_total = updated.quantite * updated.prix_unitaire
      return updated
    }))
  }

  const removeLigne = id => setLignes(prev => prev.filter(l => l.id !== id))

  const montantTotal = lignes.reduce((s, l) => s + l.sous_total, 0)
  const remise       = Number(form.remise_montant) || 0
  const montantNet   = Math.max(0, montantTotal - remise)
  const montantPaye  = Number(form.montant_paye) || 0
  const statut       = montantPaye >= montantNet ? 'Payée'
    : montantPaye > 0 ? 'Partiellement payée' : 'Non payée'

  const handleSubmit = async () => {
    if (!form.client_id) { toast.error('Veuillez sélectionner un client.'); return }
    if (lignes.length === 0) { toast.error('Ajoutez au moins une ligne.'); return }
    setSaving(true)
    try {
      const numero = await genNumero()
      const facture = await db.insert('factures', {
        numero, client_id: form.client_id,
        prestataire_id: form.prestataire_id || null,
        montant_total: montantTotal, remise_montant: remise,
        montant_net: montantNet, montant_paye: montantPaye, statut, notes: form.notes,
      })

      // Lignes
      await db.insertMany('factures_lignes', lignes.map(l => ({
        facture_id: facture.id, type: l.type, description: l.description,
        quantite: l.quantite, prix_unitaire: l.prix_unitaire, sous_total: l.sous_total,
      })))

      // Paiement si > 0
      let paiementObj = null
      if (montantPaye > 0) {
        paiementObj = await db.insert('paiements', {
          facture_id: facture.id, montant: montantPaye,
          mode_paiement: form.mode_paiement, date_paiement: new Date().toISOString(),
        })
      }

      // ===== COMMISSIONS — sur montant réellement encaissé =====
      if (form.prestataire_id) {
        const prest = prestataires.find(p => p.id === form.prestataire_id)
        if (prest?.taux_commission > 0) {
          const prestMontant = lignes.filter(l => l.type === 'prestation').reduce((s, l) => s + l.sous_total, 0)
          // Calcul commission sur montant encaissé (pas le total brut)
          const commission = calculateCommission(
            montantTotal,   // total brut
            remise,         // remise appliquée
            montantPaye,    // montant réellement payé
            prestMontant,   // part prestation
            prest.taux_commission
          )
          if (commission > 0) {
            await db.insert('commissions', {
              prestataire_id: form.prestataire_id, facture_id: facture.id,
              montant_prestation: prestMontant, taux_commission: prest.taux_commission,
              montant_commission: commission,
              montant_encaisse: montantPaye, // nouveau champ traçabilité
              mois: new Date().getMonth() + 1, annee: new Date().getFullYear(),
            })
          }
        }
      }

      toast.success(`Facture ${numero} créée ! Cliquez sur ⬇ pour télécharger le PDF.`)
      // PDF séparé — l'utilisateur télécharge depuis la liste
      onSave(facture)
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="modal-body space-y-5">
        {/* Client & Prestataire */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormGroup label="Client" required>
            <select className="select" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
              <option value="">-- Sélectionner --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Prestataire">
            <select className="select" value={form.prestataire_id} onChange={e => set('prestataire_id', e.target.value)}>
              <option value="">-- Aucun / Vente directe --</option>
              {prestataires.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom} ({p.taux_commission}%)</option>)}
            </select>
          </FormGroup>
        </div>

        {/* Ajout de lignes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-cendre-700">Lignes de facture</p>
            <div className="flex gap-2">
              <select
                className="select text-xs py-1.5 pl-2 pr-7"
                onChange={e => {
                  const p = prestations.find(x => x.id === e.target.value)
                  if (p) { ajouterLigne('prestation', p); e.target.value = '' }
                }}
                defaultValue=""
              >
                <option value="" disabled>+ Prestation</option>
                {prestations.map(p => <option key={p.id} value={p.id}>{p.nom} — {fcfa(p.prix)}</option>)}
              </select>
              <select
                className="select text-xs py-1.5 pl-2 pr-7"
                onChange={e => {
                  const p = produits.find(x => x.id === e.target.value)
                  if (p) { ajouterLigne('produit', p); e.target.value = '' }
                }}
                defaultValue=""
              >
                <option value="" disabled>+ Produit</option>
                {produits.map(p => <option key={p.id} value={p.id}>{p.nom} — {fcfa(p.prix_vente)}</option>)}
              </select>
            </div>
          </div>

          {lignes.length === 0 ? (
            <div className="p-4 border-2 border-dashed border-cendre-200 rounded-xl text-center text-sm text-cendre-400">
              Ajoutez des prestations ou produits via les menus ci-dessus
            </div>
          ) : (
            <div className="space-y-2">
              {lignes.map(l => (
                <div key={l.id} className="flex items-center gap-2 p-2.5 bg-cendre-50 rounded-xl">
                  <span className={`badge shrink-0 text-xs ${l.type === 'prestation' ? 'badge-violet' : 'badge-blue'}`}>
                    {l.type === 'prestation' ? 'Prest.' : 'Prod.'}
                  </span>
                  <span className="flex-1 text-sm font-medium text-cendre-800 truncate">{l.description}</span>
                  <input
                    type="number" min="1" value={l.quantite}
                    onChange={e => updateLigne(l.id, 'quantite', e.target.value)}
                    className="input w-14 text-center py-1 text-sm"
                  />
                  <span className="text-xs text-cendre-500">×</span>
                  <input
                    type="number" min="0" value={l.prix_unitaire}
                    onChange={e => updateLigne(l.id, 'prix_unitaire', e.target.value)}
                    className="input w-24 text-right py-1 text-sm"
                  />
                  <span className="text-sm font-semibold text-primary-600 w-28 text-right shrink-0">{fcfa(l.sous_total)}</span>
                  <button onClick={() => removeLigne(l.id)} className="btn-icon text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Récap financier */}
        {lignes.length > 0 && (
          <div className="p-4 bg-cendre-50 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-cendre-500">Sous-total</span>
              <span className="font-semibold">{fcfa(montantTotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cendre-500 shrink-0">Remise (FCFA)</span>
              <input type="number" min="0" max={montantTotal} value={form.remise_montant}
                onChange={e => set('remise_montant', e.target.value)}
                className="input flex-1 py-1 text-right text-sm" placeholder="0" />
            </div>
            {remise > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Remise</span><span>−{fcfa(remise)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-primary-700 border-t border-cendre-200 pt-2">
              <span>Total net</span>
              <span>{fcfa(montantNet)}</span>
            </div>
          </div>
        )}

        {/* Paiement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormGroup label="Mode de paiement">
            <select className="select" value={form.mode_paiement} onChange={e => set('mode_paiement', e.target.value)}>
              {MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Montant encaissé (FCFA)">
            <input className="input" type="number" min="0" max={montantNet} value={form.montant_paye}
              onChange={e => set('montant_paye', e.target.value)} placeholder="0" />
          </FormGroup>
        </div>

        {montantPaye > 0 && (
          <div className={`p-3 rounded-xl text-sm font-medium ${statut === 'Payée' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
            Statut automatique : <strong>{statut}</strong>
            {statut !== 'Payée' && <span className="ml-2">Reste : {fcfa(montantNet - montantPaye)}</span>}
          </div>
        )}

        {/* Info commission */}
        {form.prestataire_id && lignes.some(l => l.type === 'prestation') && (
          <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700">
            <strong>Commission calculée sur le montant encaissé :</strong>
            {' '}{fcfa(calculateCommission(
              montantTotal, remise, montantPaye,
              lignes.filter(l => l.type === 'prestation').reduce((s, l) => s + l.sous_total, 0),
              prestataires.find(p => p.id === form.prestataire_id)?.taux_commission || 0
            ))}
            {' '}({prestataires.find(p => p.id === form.prestataire_id)?.taux_commission || 0}% × montant encaissé)
          </div>
        )}

        <FormGroup label="Notes">
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </FormGroup>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving || lignes.length === 0} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer la facture'}
        </button>
      </div>
    </>
  )
}

// ===== MODAL PAIEMENT PARTIEL =====
function FormPaiement({ facture, onSave, onClose }) {
  const [form, setForm] = useState({ montant: '', mode_paiement: 'Espèces', notes: '' })
  const [saving, setSaving] = useState(false)
  const restant = Number(facture.montant_net) - Number(facture.montant_paye)

  const handleSubmit = async () => {
    const montant = Number(form.montant)
    if (!montant || montant <= 0) { toast.error('Montant invalide.'); return }
    if (montant > restant) { toast.error(`Le montant ne peut pas dépasser ${fcfa(restant)}.`); return }
    setSaving(true)
    try {
      await db.insert('paiements', {
        facture_id: facture.id, montant,
        mode_paiement: form.mode_paiement,
        date_paiement: new Date().toISOString(), notes: form.notes,
      })
      const nvPaye  = Number(facture.montant_paye) + montant
      const nvStatut = nvPaye >= Number(facture.montant_net) ? 'Payée' : 'Partiellement payée'
      await db.update('factures', facture.id, { montant_paye: nvPaye, statut: nvStatut })

      // Mise à jour commission si la facture est maintenant soldée et il y a un prestataire
      // (on ajoute un complément de commission sur le nouveau montant encaissé)
      if (facture.prestataire_id) {
        try {
          const prest = await db.get('prestataires', { eq: { id: facture.prestataire_id }, single: true })
          const lignes = await db.get('factures_lignes', { eq: { facture_id: facture.id } })
          if (prest?.taux_commission > 0 && lignes) {
            const prestMontant = lignes.filter(l => l.type === 'prestation').reduce((s, l) => s + Number(l.sous_total), 0)
            // Commission sur le nouveau montant encaissé
            const commNew = calculateCommission(
              Number(facture.montant_total), Number(facture.remise_montant || 0),
              montant, prestMontant, prest.taux_commission
            )
            if (commNew > 0) {
              await db.insert('commissions', {
                prestataire_id: facture.prestataire_id, facture_id: facture.id,
                montant_prestation: prestMontant, taux_commission: prest.taux_commission,
                montant_commission: commNew, montant_encaisse: montant,
                mois: new Date().getMonth() + 1, annee: new Date().getFullYear(),
              })
            }
          }
        } catch {}
      }

      toast.success('Paiement enregistré !')
      onSave()
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="modal-body space-y-4">
        <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-sm">
          <p className="text-cendre-600">Facture <strong>{facture.numero}</strong></p>
          <p className="text-orange-700 font-semibold mt-1">Restant dû : {fcfa(restant)}</p>
        </div>
        <FormGroup label="Montant à encaisser" required>
          <input className="input" type="number" min="0" max={restant} value={form.montant}
            onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
            placeholder={`Max: ${fcfa(restant)}`} />
        </FormGroup>
        <FormGroup label="Mode de paiement">
          <select className="select" value={form.mode_paiement} onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
            {MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Notes">
          <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </FormGroup>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Encaisser'}
        </button>
      </div>
    </>
  )
}

// ===== MODAL DÉTAIL FACTURE =====
function ModalVoirFacture({ facture, onDl, onImprimer, onClose }) {
  const [lignes, setLignes]       = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      db.get('factures_lignes', { eq: { facture_id: facture.id }, order: 'id' }),
      db.get('paiements',       { eq: { facture_id: facture.id }, order: 'date_paiement' }),
    ]).then(([l, p]) => { setLignes(l || []); setPaiements(p || []) })
      .finally(() => setLoading(false))
  }, [facture.id])

  const restant = Number(facture.montant_net || 0) - Number(facture.montant_paye || 0)
  const statutColor2 = {
    'Payée': 'text-green-700 bg-green-50 border-green-200',
    'Non payée': 'text-orange-700 bg-orange-50 border-orange-200',
    'Partiellement payée': 'text-blue-700 bg-blue-50 border-blue-200',
    'En retard': 'text-red-700 bg-red-50 border-red-200',
  }

  return (
    <>
      <div className="modal-body space-y-4">
        {/* Header facture */}
        <div className="flex items-start justify-between p-4 bg-cendre-50 rounded-xl border border-cendre-100">
          <div>
            <p className="text-xs text-cendre-400 uppercase tracking-wide font-semibold mb-1">Numéro</p>
            <p className="font-mono font-bold text-lg text-cendre-800">{facture.numero}</p>
            <p className="text-sm text-cendre-500 mt-1">{format(parseISO(facture.date_emission), "d MMMM yyyy", { locale: fr })}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${statutColor2[facture.statut] || 'text-cendre-700 bg-cendre-50 border-cendre-200'}`}>
            {facture.statut}
          </span>
        </div>

        {/* Client + Prestataire */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white border border-cendre-100 rounded-xl">
            <p className="text-xs text-cendre-400 font-semibold uppercase tracking-wide mb-1.5">Client</p>
            <p className="font-semibold text-cendre-800">{facture.clients?.prenom} {facture.clients?.nom}</p>
            {facture.clients?.telephone && <p className="text-xs text-cendre-500 mt-0.5">{facture.clients.telephone}</p>}
          </div>
          <div className="p-3 bg-white border border-cendre-100 rounded-xl">
            <p className="text-xs text-cendre-400 font-semibold uppercase tracking-wide mb-1.5">Prestataire</p>
            <p className="font-semibold text-cendre-800">{facture.prestataires ? `${facture.prestataires.prenom} ${facture.prestataires.nom}` : '—'}</p>
          </div>
        </div>

        {/* Lignes */}
        {loading ? <div className="spinner mx-auto" /> : (
          <div>
            <p className="text-xs text-cendre-400 font-semibold uppercase tracking-wide mb-2">Prestations & Produits</p>
            <div className="space-y-1.5">
              {lignes.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-cendre-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.type === 'prestation' ? 'bg-violet-500' : 'bg-blue-500'}`} />
                    <span className="text-sm text-cendre-800">{l.description}</span>
                    <span className="text-xs text-cendre-400">×{l.quantite}</span>
                  </div>
                  <span className="text-sm font-semibold text-cendre-800">{fcfa(l.sous_total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totaux */}
        <div className="p-4 bg-cendre-50 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between text-cendre-500"><span>Sous-total</span><span>{fcfa(facture.montant_total)}</span></div>
          {Number(facture.remise_montant) > 0 && (
            <div className="flex justify-between text-red-500"><span>Remise</span><span>−{fcfa(facture.remise_montant)}</span></div>
          )}
          <div className="flex justify-between font-bold text-cendre-800 border-t border-cendre-200 pt-2">
            <span>Total net</span><span>{fcfa(facture.montant_net)}</span>
          </div>
          <div className="flex justify-between text-green-600 font-medium"><span>Encaissé</span><span>{fcfa(facture.montant_paye)}</span></div>
          {restant > 0 && <div className="flex justify-between text-red-500 font-semibold"><span>Reste à payer</span><span>{fcfa(restant)}</span></div>}
        </div>

        {/* Historique paiements */}
        {paiements.length > 0 && (
          <div>
            <p className="text-xs text-cendre-400 font-semibold uppercase tracking-wide mb-2">Paiements</p>
            {paiements.map((p, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-cendre-100 last:border-0">
                <span className="text-cendre-500">{format(new Date(p.date_paiement), 'dd/MM/yyyy HH:mm')} · {p.mode_paiement}</span>
                <span className="font-semibold text-green-600">{fcfa(p.montant)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Fermer</button>
        <button onClick={onImprimer} className="btn-secondary">
          <Printer className="w-4 h-4" /> Imprimer
        </button>
        <button onClick={onDl} className="btn-primary">
          <Download className="w-4 h-4" /> Télécharger PDF
        </button>
      </div>
    </>
  )
}

// ===== PAGE PRINCIPALE =====
export default function VentesPage() {
  const [factures, setFactures]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filtreStatut, setFiltreStatut] = useState('Tous')
  const [modal, setModal]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [dlLoading, setDlLoading] = useState(null) // ID facture en cours de téléchargement

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const data = await db.get('factures', {
        select: '*, clients(nom,prenom,telephone), prestataires(nom,prenom), factures_lignes(*)',
        order: 'date_emission',
      })
      setFactures(data || [])
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const supprimer = async (id) => {
    try {
      await db.delete('factures', id)
      setFactures(prev => prev.filter(f => f.id !== id))
      toast.success('Facture supprimée.')
    } catch { toast.error('Impossible de supprimer.') }
  }

  // Imprimer facture (ouvre PDF dans nouvel onglet → Ctrl+P)
  const imprimerFacture = async (facture) => {
    setDlLoading(facture.id)
    try {
      const [lignes, paiements, salonInfo] = await Promise.all([
        db.get('factures_lignes', { eq: { facture_id: facture.id }, order: 'id' }),
        db.get('paiements', { eq: { facture_id: facture.id }, order: 'date_paiement' }),
        getSalonInfo(),
      ])
      const doc = await exportFacturePDF(facture, lignes || [], paiements || [], salonInfo)
      const blob = doc.output('blob')
      const url  = URL.createObjectURL(blob)
      const win  = window.open(url, '_blank')
      if (win) win.onload = () => { win.focus(); win.print() }
      else toast.error('Activez les popups pour imprimer.')
    } catch (e) {
      toast.error('Erreur impression : ' + e.message)
    } finally {
      setDlLoading(null)
    }
  }

  const telechargerFacture = async (facture) => {
    setDlLoading(facture.id)
    try {
      const [lignes, paiements, salonInfo] = await Promise.all([
        db.get('factures_lignes', { eq: { facture_id: facture.id }, order: 'id' }),
        db.get('paiements', { eq: { facture_id: facture.id }, order: 'date_paiement' }),
        getSalonInfo(),
      ])
      await downloadInvoice(facture, lignes || [], paiements || [], salonInfo)
      toast.success('Facture téléchargée !')
    } catch (e) {
      toast.error('Erreur génération PDF : ' + e.message)
    } finally {
      setDlLoading(null)
    }
  }

  const filtrees = factures.filter(f => {
    const q = search.toLowerCase()
    const matchQ = !q || (f.numero || '').toLowerCase().includes(q) ||
      `${f.clients?.prenom} ${f.clients?.nom}`.toLowerCase().includes(q)
    const matchS = filtreStatut === 'Tous' || f.statut === filtreStatut
    return matchQ && matchS
  })

  const caTot    = factures.reduce((s, f) => s + Number(f.montant_paye  || 0), 0)
  const encours  = factures.filter(f => f.statut !== 'Payée').length
  const impayeTot= factures.reduce((s, f) => s + Math.max(0, Number(f.montant_net || 0) - Number(f.montant_paye || 0)), 0)

  const close  = () => { setModal(null); setSelected(null) }
  const onSave = () => { charger(); close() }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary-600" /> Ventes & Facturation
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">{factures.length} facture(s)</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle facture
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-sm text-center">
          <p className="text-xl font-display font-bold text-primary-600">{fcfa(caTot)}</p>
          <p className="text-xs text-cendre-400 mt-0.5">Total encaissé</p>
        </div>
        <div className="card-sm text-center">
          <p className="text-xl font-display font-bold text-orange-600">{encours}</p>
          <p className="text-xs text-cendre-400 mt-0.5">En attente</p>
        </div>
        <div className="card-sm text-center">
          <p className="text-xl font-display font-bold text-red-600">{fcfa(impayeTot)}</p>
          <p className="text-xs text-cendre-400 mt-0.5">Impayés total</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="N° facture, nom client…" /></div>
        <div className="flex gap-1.5 flex-wrap">
          {['Tous', ...STATUTS].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${filtreStatut === s ? 'bg-primary-600 text-white' : 'bg-cendre-100 text-cendre-600 hover:bg-cendre-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : filtrees.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Aucune facture"
          description="Créez votre première facture."
          action={<button onClick={() => setModal('add')} className="btn-primary"><Plus className="w-4 h-4" /> Nouvelle facture</button>} />
      ) : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">N° Facture</th>
                  <th className="th">Client</th>
                  <th className="th hidden md:table-cell">Prestataire</th>
                  <th className="th hidden sm:table-cell">Date</th>
                  <th className="th">Total net</th>
                  <th className="th hidden lg:table-cell">Payé</th>
                  <th className="th">Statut</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtrees.map(f => {
                  const restant = Number(f.montant_net || 0) - Number(f.montant_paye || 0)
                  return (
                    <tr key={f.id} className="tr-hover">
                      <td className="td"><span className="font-mono text-sm font-semibold text-cendre-700">{f.numero}</span></td>
                      <td className="td"><span className="text-sm font-medium">{f.clients?.prenom} {f.clients?.nom}</span></td>
                      <td className="td hidden md:table-cell"><span className="text-sm text-cendre-500">{f.prestataires ? `${f.prestataires.prenom} ${f.prestataires.nom}` : '—'}</span></td>
                      <td className="td hidden sm:table-cell"><span className="text-sm text-cendre-500">{format(parseISO(f.date_emission), 'dd/MM/yyyy')}</span></td>
                      <td className="td"><span className="font-semibold text-primary-600">{fcfa(f.montant_net)}</span></td>
                      <td className="td hidden lg:table-cell">
                        <div>
                          <p className="text-sm text-green-600 font-semibold">{fcfa(f.montant_paye)}</p>
                          {restant > 0 && <p className="text-xs text-red-500">−{fcfa(restant)}</p>}
                        </div>
                      </td>
                      <td className="td"><span className={`badge ${statutColor[f.statut] || 'badge-gray'}`}>{f.statut}</span></td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Voir */}
                          <button onClick={() => { setSelected(f); setModal('view') }}
                            className="btn-icon text-cendre-400 hover:text-cendre-700 hover:bg-cendre-100" title="Voir la facture">
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Télécharger PDF */}
                          <button
                            onClick={() => telechargerFacture(f)}
                            disabled={dlLoading === f.id}
                            className="btn-icon text-primary-500 hover:bg-primary-50"
                            title="Télécharger la facture PDF"
                          >
                            {dlLoading === f.id
                              ? <span className="spinner w-3.5 h-3.5" />
                              : <Download className="w-4 h-4" />
                            }
                          </button>
                          {/* Imprimer */}
                          <button
                            onClick={() => imprimerFacture(f)}
                            disabled={dlLoading === f.id}
                            className="btn-icon text-violet-500 hover:bg-violet-50"
                            title="Imprimer la facture"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {/* Encaisser */}
                          {f.statut !== 'Payée' && (
                            <button onClick={() => { setSelected(f); setModal('paiement') }}
                              className="btn-icon text-green-500 hover:bg-green-50" title="Encaisser">
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          {/* Supprimer */}
                          <button onClick={() => setConfirmDel(f)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-cendre-100 text-xs text-cendre-400">
            {filtrees.length} facture(s) affichée(s)
          </div>
        </div>
      )}

      <Modal open={modal === 'view'} onClose={close} title="Détail de la facture" size="lg">
        {selected && <ModalVoirFacture facture={selected} onDl={() => telechargerFacture(selected)} onImprimer={() => imprimerFacture(selected)} onClose={close} />}
      </Modal>
      <Modal open={modal === 'add'}      onClose={close} title="Nouvelle Facture"  size="xl"><FormFacture onSave={onSave} onClose={close} /></Modal>
      <Modal open={modal === 'paiement'} onClose={close} title="Encaisser un paiement" size="md">
        {selected && <FormPaiement facture={selected} onSave={onSave} onClose={close} />}
      </Modal>
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => { supprimer(confirmDel?.id); setConfirmDel(null) }}
        title="Supprimer cette facture ?" message="Cette action est irréversible." danger />
    </div>
  )
}
