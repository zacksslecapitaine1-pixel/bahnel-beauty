import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { Modal, ConfirmModal, Loader, EmptyState, SearchBar, FormGroup, StatutBadge } from '../../components/ui'

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'

function FormProduit({ produit, categories, fournisseurs, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: '', categorie_id: '', fournisseur_id: '', description: '',
    code_barre: '', prix_achat: '', prix_vente: '',
    stock_actuel: 0, stock_minimum: 5, date_expiration: '', actif: true,
    ...(produit || {})
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const benefice = form.prix_vente && form.prix_achat ? Number(form.prix_vente) - Number(form.prix_achat) : 0
  const marge    = form.prix_vente && form.prix_achat && form.prix_vente > 0
    ? ((benefice / Number(form.prix_vente)) * 100).toFixed(1)
    : 0

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.prix_vente) { toast.error('Nom et prix de vente requis.'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        prix_achat: Number(form.prix_achat) || 0,
        prix_vente: Number(form.prix_vente),
        stock_actuel: Number(form.stock_actuel) || 0,
        stock_minimum: Number(form.stock_minimum) || 5,
        categorie_id:   form.categorie_id   || null,
        fournisseur_id: form.fournisseur_id || null,
        date_expiration: form.date_expiration || null,
      }
      const saved = produit?.id
        ? await db.update('produits', produit.id, payload)
        : await db.insert('produits', payload)
      toast.success(produit?.id ? 'Produit modifié !' : 'Produit ajouté !')
      onSave(saved)
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormGroup label="Nom du produit" required>
            <input className="input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Crème hydratante Rose" />
          </FormGroup>
        </div>
        <FormGroup label="Catégorie">
          <select className="select" value={form.categorie_id} onChange={e => set('categorie_id', e.target.value)}>
            <option value="">-- Aucune --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Fournisseur">
          <select className="select" value={form.fournisseur_id} onChange={e => set('fournisseur_id', e.target.value)}>
            <option value="">-- Aucun --</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Code barre">
          <input className="input" value={form.code_barre} onChange={e => set('code_barre', e.target.value)} placeholder="Optionnel" />
        </FormGroup>
        <FormGroup label="Date d'expiration">
          <input className="input" type="date" value={form.date_expiration || ''} onChange={e => set('date_expiration', e.target.value)} />
        </FormGroup>
        <FormGroup label="Prix d'achat (FCFA)">
          <input className="input" type="number" min="0" value={form.prix_achat} onChange={e => set('prix_achat', e.target.value)} placeholder="0" />
        </FormGroup>
        <FormGroup label="Prix de vente (FCFA)" required>
          <input className="input" type="number" min="0" value={form.prix_vente} onChange={e => set('prix_vente', e.target.value)} placeholder="5000" />
        </FormGroup>
        {benefice > 0 && (
          <div className="sm:col-span-2 flex gap-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm">
            <div><span className="text-cendre-500">Bénéfice : </span><span className="font-bold text-green-700">{fcfa(benefice)}</span></div>
            <div><span className="text-cendre-500">Marge : </span><span className="font-bold text-green-700">{marge}%</span></div>
          </div>
        )}
        <FormGroup label="Stock actuel">
          <input className="input" type="number" min="0" value={form.stock_actuel} onChange={e => set('stock_actuel', e.target.value)} />
        </FormGroup>
        <FormGroup label="Stock minimum (alerte)">
          <input className="input" type="number" min="0" value={form.stock_minimum} onChange={e => set('stock_minimum', e.target.value)} />
        </FormGroup>
        <div className="sm:col-span-2">
          <FormGroup label="Description">
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </FormGroup>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : produit?.id ? 'Modifier' : 'Ajouter le produit'}
        </button>
      </div>
    </>
  )
}

function FormMouvement({ produit, onSave, onClose }) {
  const [form, setForm] = useState({ type: 'entrée', quantite: 1, motif: '', reference: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.quantite || form.quantite <= 0) { toast.error('Quantité invalide.'); return }
    setSaving(true)
    try {
      await db.insert('stock_mouvements', {
        produit_id: produit.id, type: form.type,
        quantite: Number(form.quantite), motif: form.motif, reference: form.reference,
        date_mouvement: new Date().toISOString(),
      })
      // Mettre à jour stock
      const delta = form.type === 'entrée' ? Number(form.quantite) : -Number(form.quantite)
      await db.update('produits', produit.id, { stock_actuel: Math.max(0, produit.stock_actuel + delta) })
      toast.success('Mouvement enregistré !')
      onSave()
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="modal-body space-y-4">
        <div className="p-3 bg-cendre-50 rounded-xl flex items-center gap-3">
          <Package className="w-5 h-5 text-primary-600" />
          <div>
            <p className="font-semibold text-sm">{produit.nom}</p>
            <p className="text-xs text-cendre-400">Stock actuel : <strong>{produit.stock_actuel}</strong></p>
          </div>
        </div>
        <FormGroup label="Type de mouvement">
          <div className="grid grid-cols-3 gap-2">
            {['entrée', 'sortie', 'ajustement'].map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className={`py-2 px-3 rounded-xl text-sm font-medium capitalize border-2 transition-all ${form.type === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-cendre-200 text-cendre-600 hover:border-cendre-300'}`}>
                {t}
              </button>
            ))}
          </div>
        </FormGroup>
        <FormGroup label="Quantité" required>
          <input className="input" type="number" min="1" value={form.quantite} onChange={e => set('quantite', e.target.value)} />
        </FormGroup>
        <FormGroup label="Motif">
          <input className="input" value={form.motif} onChange={e => set('motif', e.target.value)} placeholder="Réception commande, vente, perte…" />
        </FormGroup>
        <FormGroup label="Référence">
          <input className="input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="N° bon de livraison…" />
        </FormGroup>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer le mouvement'}
        </button>
      </div>
    </>
  )
}

export default function ProduitsPage() {
  const [produits, setProduits]         = useState([])
  const [categories, setCategories]     = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filtreAlerte, setFiltreAlerte] = useState(false)
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)
  const [confirmDel, setConfirmDel]     = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c, f] = await Promise.all([
        db.get('produits', { select: '*, categories_produits(nom), fournisseurs(nom)', order: 'nom', asc: true }),
        db.get('categories_produits', { order: 'nom', asc: true }),
        db.get('fournisseurs', { order: 'nom', asc: true }),
      ])
      setProduits(p || [])
      setCategories(c || [])
      setFournisseurs(f || [])
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const supprimer = async (id) => {
    try {
      await db.delete('produits', id)
      setProduits(prev => prev.filter(x => x.id !== id))
      toast.success('Produit supprimé.')
    } catch { toast.error('Impossible de supprimer.') }
  }

  const filtres = produits.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.nom.toLowerCase().includes(q) || (p.code_barre || '').includes(q)
    const matchA = !filtreAlerte || p.stock_actuel <= p.stock_minimum
    return matchQ && matchA
  })

  const alertes = produits.filter(p => p.stock_actuel <= p.stock_minimum)
  const close   = () => { setModal(null); setSelected(null) }
  const onSave  = () => { charger(); close() }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" /> Produits & Stock
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">{produits.length} produit(s) · {alertes.length} alerte(s)</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouveau produit
        </button>
      </div>

      {/* Alertes bannière */}
      {alertes.length > 0 && (
        <div className="card-sm bg-red-50 border-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            <strong>{alertes.length} produit(s)</strong> en alerte de stock.{' '}
            <button onClick={() => setFiltreAlerte(!filtreAlerte)} className="underline">
              {filtreAlerte ? 'Voir tout' : 'Filtrer'}
            </button>
          </p>
        </div>
      )}

      <div className="card-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher un produit, code barre…" /></div>
        <button
          onClick={() => setFiltreAlerte(!filtreAlerte)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${filtreAlerte ? 'bg-red-500 text-white border-red-500' : 'bg-white text-cendre-600 border-cendre-200 hover:border-red-300'}`}>
          <AlertTriangle className="w-4 h-4" /> {filtreAlerte ? 'Toutes les alertes' : 'Alertes stock'}
        </button>
      </div>

      {loading ? <Loader /> : filtres.length === 0 ? (
        <EmptyState icon={Package} title="Aucun produit" description="Ajoutez vos produits pour gérer votre stock."
          action={<button onClick={() => setModal('add')} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Produit</th>
                  <th className="th hidden sm:table-cell">Catégorie</th>
                  <th className="th">Stock</th>
                  <th className="th hidden md:table-cell">Prix achat</th>
                  <th className="th">Prix vente</th>
                  <th className="th hidden lg:table-cell">Bénéfice/u</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtres.map(p => {
                  const enAlerte  = p.stock_actuel <= p.stock_minimum
                  const rupture   = p.stock_actuel === 0
                  const benefice  = Number(p.prix_vente) - Number(p.prix_achat)
                  return (
                    <tr key={p.id} className="tr-hover">
                      <td className="td">
                        <div>
                          <p className="font-semibold text-cendre-800 text-sm">{p.nom}</p>
                          {p.code_barre && <p className="text-xs text-cendre-400 font-mono">{p.code_barre}</p>}
                          {p.fournisseurs && <p className="text-xs text-cendre-400">{p.fournisseurs.nom}</p>}
                        </div>
                      </td>
                      <td className="td hidden sm:table-cell">
                        <span className="text-sm text-cendre-600">{p.categories_produits?.nom || '—'}</span>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {rupture
                            ? <span className="badge badge-red">Rupture</span>
                            : enAlerte
                            ? <span className="badge badge-orange">{p.stock_actuel} / {p.stock_minimum} min</span>
                            : <span className="badge badge-green">{p.stock_actuel}</span>
                          }
                        </div>
                      </td>
                      <td className="td hidden md:table-cell"><span className="text-sm text-cendre-600">{fcfa(p.prix_achat)}</span></td>
                      <td className="td"><span className="text-sm font-semibold text-primary-600">{fcfa(p.prix_vente)}</span></td>
                      <td className="td hidden lg:table-cell">
                        {benefice > 0
                          ? <span className="text-sm font-semibold text-green-600">+{fcfa(benefice)}</span>
                          : <span className="text-sm text-cendre-400">—</span>
                        }
                      </td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setSelected(p); setModal('mouvement') }} className="btn-icon text-blue-500 hover:bg-blue-50" title="Mouvement de stock">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelected(p); setModal('edit') }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmDel(p)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-cendre-100 text-xs text-cendre-400">
            {filtres.length} produit(s) affiché(s)
          </div>
        </div>
      )}

      <Modal open={modal === 'add'} onClose={close} title="Nouveau Produit" size="lg">
        <FormProduit categories={categories} fournisseurs={fournisseurs} onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'edit'} onClose={close} title="Modifier le Produit" size="lg">
        <FormProduit produit={selected} categories={categories} fournisseurs={fournisseurs} onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'mouvement'} onClose={close} title="Mouvement de Stock" size="md">
        {selected && <FormMouvement produit={selected} onSave={onSave} onClose={close} />}
      </Modal>
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => supprimer(confirmDel?.id)}
        title="Supprimer ce produit ?" message="Cette action est irréversible." danger />
    </div>
  )
}
