import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Plus, Users, Package, AlertTriangle, Phone, Star, Search } from 'lucide-react'
import { format, parseISO, differenceInYears } from 'date-fns'
import toast from 'react-hot-toast'
import { db, supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import { Loader, EmptyState, SearchBar, FormGroup } from '../../components/ui'

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'
const MODES = ['Espèces','Flooz','T-Money','Virement bancaire','Carte bancaire','Autre']

// ============================================================
// PAGE CLIENTS (version prestataire — lecture + RDV uniquement)
// ============================================================
export function PrestataireClientsPage() {
  const { prestataire, hasPermission } = useAuthStore()
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    db.get('clients', { order: 'prenom', asc: true })
      .then(d => setClients(d || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtres = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.prenom} ${c.nom}`.toLowerCase().includes(q) || (c.telephone || '').includes(q)
  })

  const peutModifier = hasPermission('clients_modifier')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-600" /> Mes Clients
        </h1>
      </div>
      <div className="card-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un client…" />
      </div>
      {loading ? <Loader /> : filtres.length === 0 ? (
        <EmptyState icon={Users} title="Aucun client trouvé" description="Aucun résultat pour cette recherche." />
      ) : (
        <div className="space-y-2.5">
          {filtres.map(c => (
            <div key={c.id}
              onClick={() => setSelected(c === selected ? null : c)}
              className="card-sm cursor-pointer hover:shadow-medium transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
                  {c.prenom?.[0]}{c.nom?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-cendre-800">{c.prenom} {c.nom}</p>
                  <div className="flex items-center gap-3 text-xs text-cendre-400 mt-0.5">
                    {c.telephone && <a href={`tel:${c.telephone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-primary-600 hover:underline"><Phone className="w-3 h-3" />{c.telephone}</a>}
                    {c.date_naissance && <span>{differenceInYears(new Date(), parseISO(c.date_naissance))} ans</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="text-xs font-semibold">{c.points_fidelite || 0}</span>
                  </div>
                  <span className={`badge ${c.statut === 'Actif' ? 'badge-green' : c.statut === 'Mauvais payeur' ? 'badge-red' : 'badge-gray'}`}>{c.statut}</span>
                </div>
              </div>
              {/* Notes si déplié */}
              {selected?.id === c.id && c.notes && (
                <div className="mt-3 pt-3 border-t border-cendre-100">
                  <p className="text-xs text-cendre-500 font-semibold uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-cendre-700">{c.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// PAGE VENTES PRESTATAIRE (simplifiée — vente rapide)
// ============================================================
export function PrestataireVentesPage() {
  const { prestataire } = useAuthStore()
  const [clients, setClients]       = useState([])
  const [prestations, setPrestations] = useState([])
  const [produits, setProduits]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [lignes, setLignes]         = useState([])
  const [form, setForm] = useState({
    client_id: '', mode_paiement: 'Espèces', montant_paye: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    Promise.all([
      db.get('clients', { order: 'prenom', asc: true }),
      db.get('prestations_catalogue', { eq: { actif: true }, select: 'id,nom,prix,categories_prestations(nom)', order: 'nom', asc: true }),
      db.get('produits', { eq: { actif: true }, select: 'id,nom,prix_vente,stock_actuel', order: 'nom', asc: true }),
    ]).then(([c, p, pd]) => {
      setClients(c || [])
      setPrestations(p || [])
      setProduits(pd || [])
    }).finally(() => setLoading(false))
  }, [])

  const ajouterLigne = (type, item) => {
    const prix = type === 'prestation' ? item.prix : item.prix_vente
    setLignes(prev => {
      const existe = prev.find(l => l.ref_id === item.id && l.type === type)
      if (existe) return prev.map(l => l.ref_id === item.id && l.type === type
        ? { ...l, quantite: l.quantite + 1, sous_total: (l.quantite + 1) * l.prix_unitaire }
        : l)
      return [...prev, { id: Date.now(), type, description: item.nom, quantite: 1, prix_unitaire: prix, sous_total: prix, ref_id: item.id }]
    })
  }

  const removeLigne  = id => setLignes(prev => prev.filter(l => l.id !== id))
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const montantTotal = lignes.reduce((s, l) => s + l.sous_total, 0)
  const montantPaye  = Number(form.montant_paye) || 0
  const statut       = montantPaye >= montantTotal ? 'Payée' : montantPaye > 0 ? 'Partiellement payée' : 'Non payée'

  const handleSubmit = async () => {
    if (!form.client_id)    { toast.error('Sélectionnez un client.'); return }
    if (lignes.length === 0) { toast.error('Ajoutez au moins un article.'); return }
    setSaving(true)
    try {
      const annee  = new Date().getFullYear()
      const { count } = await supabase.from('factures').select('id', { count: 'exact', head: true })
      const numero = `BBI-${annee}-${String((count || 0) + 1).padStart(4, '0')}`

      const facture = await db.insert('factures', {
        numero, client_id: form.client_id,
        prestataire_id: prestataire?.id || null,
        montant_total: montantTotal, remise_montant: 0,
        montant_net: montantTotal, montant_paye: montantPaye, statut, notes: form.notes,
      })

      await db.insertMany('factures_lignes', lignes.map(l => ({
        facture_id: facture.id, type: l.type, description: l.description,
        quantite: l.quantite, prix_unitaire: l.prix_unitaire, sous_total: l.sous_total,
      })))

      if (montantPaye > 0) {
        await db.insert('paiements', {
          facture_id: facture.id, montant: montantPaye,
          mode_paiement: form.mode_paiement, date_paiement: new Date().toISOString(),
        })
      }

      // Commission auto
      if (prestataire?.taux_commission > 0) {
        const montPrest = lignes.filter(l => l.type === 'prestation').reduce((s, l) => s + l.sous_total, 0)
        const comm = montPrest * (prestataire.taux_commission / 100)
        if (comm > 0) {
          await db.insert('commissions', {
            prestataire_id: prestataire.id, facture_id: facture.id,
            montant_prestation: montPrest, taux_commission: prestataire.taux_commission,
            montant_commission: comm, mois: new Date().getMonth() + 1, annee: new Date().getFullYear(),
          })
        }
      }

      setSuccess({ numero, montantTotal, montantPaye })
      setLignes([])
      setForm({ client_id: '', mode_paiement: 'Espèces', montant_paye: '', notes: '' })
      toast.success(`Vente ${numero} enregistrée !`)
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <Loader />

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl mx-auto">
      <h1 className="page-title flex items-center gap-2">
        <ShoppingCart className="w-6 h-6 text-primary-600" /> Enregistrer une Vente
      </h1>

      {/* Succès */}
      {success && (
        <div className="card bg-green-50 border-green-200 text-center py-6">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-lg font-display font-semibold text-green-700">Vente enregistrée !</p>
          <p className="text-sm text-green-600 mt-1">Facture <strong>{success.numero}</strong> — {fcfa(success.montantTotal)}</p>
          <button onClick={() => setSuccess(null)} className="btn-primary mt-4 mx-auto">
            <Plus className="w-4 h-4" /> Nouvelle vente
          </button>
        </div>
      )}

      {!success && (
        <>
          {/* Client */}
          <div className="card">
            <FormGroup label="Client" required>
              <select className="select" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                <option value="">-- Sélectionner un client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
              </select>
            </FormGroup>
          </div>

          {/* Ajout articles */}
          <div className="card space-y-3">
            <p className="label">Ajouter des prestations</p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {prestations.map(p => (
                <button key={p.id} onClick={() => ajouterLigne('prestation', p)}
                  className="flex items-center justify-between px-4 py-3 bg-cendre-50 hover:bg-primary-50 hover:border-primary-300 border border-transparent rounded-xl transition-all text-left">
                  <div>
                    <p className="text-sm font-medium text-cendre-800">{p.nom}</p>
                    <p className="text-xs text-cendre-400">{p.categories_prestations?.nom}</p>
                  </div>
                  <span className="text-sm font-bold text-primary-600">{fcfa(p.prix)}</span>
                </button>
              ))}
            </div>
            {produits.length > 0 && (
              <>
                <p className="label mt-2">Ajouter des produits</p>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-1">
                  {produits.map(p => (
                    <button key={p.id} onClick={() => ajouterLigne('produit', p)}
                      disabled={p.stock_actuel === 0}
                      className="flex items-center justify-between px-4 py-2.5 bg-cendre-50 hover:bg-blue-50 hover:border-blue-300 border border-transparent rounded-xl transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed">
                      <div>
                        <p className="text-sm font-medium text-cendre-800">{p.nom}</p>
                        <p className="text-xs text-cendre-400">Stock : {p.stock_actuel}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">{fcfa(p.prix_vente)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Récap commande */}
          {lignes.length > 0 && (
            <div className="card space-y-3">
              <p className="label">Récapitulatif</p>
              <div className="space-y-2">
                {lignes.map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-cendre-50 rounded-xl">
                    <span className={`badge ${l.type === 'prestation' ? 'badge-violet' : 'badge-blue'} text-[10px]`}>{l.type}</span>
                    <span className="flex-1 text-sm font-medium text-cendre-800">{l.description}</span>
                    <span className="text-xs text-cendre-500">{l.quantite}×</span>
                    <span className="text-sm font-bold text-primary-600">{fcfa(l.sous_total)}</span>
                    <button onClick={() => removeLigne(l.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
              </div>

              <div className="border-t border-cendre-200 pt-3 space-y-2">
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary-600">{fcfa(montantTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormGroup label="Mode de paiement">
                    <select className="select" value={form.mode_paiement} onChange={e => set('mode_paiement', e.target.value)}>
                      {MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </FormGroup>
                  <FormGroup label="Montant reçu" hint="0 = non payé">
                    <input className="input" type="number" min="0" value={form.montant_paye} onChange={e => set('montant_paye', e.target.value)} placeholder="0" />
                  </FormGroup>
                </div>
                {montantPaye > 0 && (
                  <div className={`text-xs font-semibold p-2 rounded-lg ${statut === 'Payée' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {statut === 'Payée' ? `✅ Payée — Rendu : ${fcfa(montantPaye - montantTotal)}` : `⚠️ ${statut} — Reste : ${fcfa(montantTotal - montantPaye)}`}
                  </div>
                )}
                <FormGroup label="Notes">
                  <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optionnel…" />
                </FormGroup>
                <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full justify-center py-3">
                  {saving ? 'Enregistrement…' : `Valider la vente — ${fcfa(montantTotal)}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// PAGE STOCK PRESTATAIRE (lecture seule)
// ============================================================
export function PrestataireStockPage() {
  const [produits, setProduits] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    db.get('produits', {
      select: '*, categories_produits(nom)',
      eq: { actif: true }, order: 'nom', asc: true,
    }).then(d => setProduits(d || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const alertes  = produits.filter(p => p.stock_actuel <= p.stock_minimum)
  const filtres  = produits.filter(p => {
    const q = search.toLowerCase()
    return !q || p.nom.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="page-title flex items-center gap-2">
        <Package className="w-6 h-6 text-primary-600" /> Consultation Stock
      </h1>

      {alertes.length > 0 && (
        <div className="card-sm bg-orange-50 border-orange-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700">
            <strong>{alertes.length} produit(s)</strong> en alerte de stock — Signalez-le à la directrice.
          </p>
        </div>
      )}

      <div className="card-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un produit…" />
      </div>

      {loading ? <Loader /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtres.map(p => {
            const enAlerte = p.stock_actuel <= p.stock_minimum
            const rupture  = p.stock_actuel === 0
            return (
              <div key={p.id} className={`card-sm ${rupture ? 'border-red-200 bg-red-50' : enAlerte ? 'border-orange-200 bg-orange-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-cendre-800 text-sm truncate">{p.nom}</p>
                    <p className="text-xs text-cendre-400 mt-0.5">{p.categories_produits?.nom || '—'}</p>
                  </div>
                  {rupture
                    ? <span className="badge badge-red shrink-0">Rupture</span>
                    : enAlerte
                    ? <span className="badge badge-orange shrink-0">Faible</span>
                    : <span className="badge badge-green shrink-0">{p.stock_actuel}</span>
                  }
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-cendre-500">
                  <span>Stock : <strong>{p.stock_actuel}</strong> / min {p.stock_minimum}</span>
                  <span className="font-semibold text-primary-600">{fcfa(p.prix_vente)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
