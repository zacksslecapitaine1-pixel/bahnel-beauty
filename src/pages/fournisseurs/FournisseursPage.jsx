import { useState, useEffect, useCallback } from 'react'
import { Truck, Plus, Edit2, Trash2, Phone, Mail, ShoppingBag, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { Modal, ConfirmModal, Loader, EmptyState, SearchBar, FormGroup } from '../../components/ui'

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'

// ===== FORMULAIRE FOURNISSEUR =====
function FormFournisseur({ fournisseur, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: '', contact: '', telephone: '', email: '', specialite: '', notes: '',
    ...(fournisseur || {})
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.nom.trim()) { toast.error('Le nom du fournisseur est requis.'); return }
    setSaving(true)
    try {
      const saved = fournisseur?.id
        ? await db.update('fournisseurs', fournisseur.id, form)
        : await db.insert('fournisseurs', form)
      toast.success(fournisseur?.id ? 'Fournisseur modifié !' : 'Fournisseur ajouté !')
      onSave(saved)
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormGroup label="Nom du fournisseur" required>
            <input className="input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Cosmétiques Pro Lomé" />
          </FormGroup>
        </div>
        <FormGroup label="Personne de contact">
          <input className="input" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Nom du responsable" />
        </FormGroup>
        <FormGroup label="Téléphone">
          <input className="input" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+228 90 00 00 00" />
        </FormGroup>
        <FormGroup label="Email">
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@fournisseur.com" />
        </FormGroup>
        <FormGroup label="Spécialité">
          <input className="input" value={form.specialite} onChange={e => set('specialite', e.target.value)} placeholder="Ex: Produits capillaires" />
        </FormGroup>
        <div className="sm:col-span-2">
          <FormGroup label="Notes">
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Conditions de paiement, délais de livraison…" />
          </FormGroup>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : fournisseur?.id ? 'Modifier' : 'Ajouter le fournisseur'}
        </button>
      </div>
    </>
  )
}

// ===== FICHE DÉTAIL FOURNISSEUR =====
function FicheFournisseur({ fournisseur, onEdit, onClose }) {
  const [produits, setProduits]   = useState([])
  const [depenses, setDepenses]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      db.get('produits',  { eq: { fournisseur_id: fournisseur.id }, select: 'id,nom,prix_achat,prix_vente,stock_actuel', order: 'nom', asc: true }),
      db.get('depenses',  { eq: { fournisseur_id: fournisseur.id }, select: 'id,description,montant,date_depense', order: 'date_depense' }),
    ]).then(([p, d]) => {
      setProduits(p || [])
      setDepenses(d || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [fournisseur.id])

  const totalAchats = depenses.reduce((s, d) => s + Number(d.montant || 0), 0)
  const nbProduits  = produits.length

  return (
    <>
      <div className="modal-body space-y-5">
        {/* En-tête */}
        <div className="flex items-center gap-4 p-4 bg-cendre-50 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-display font-semibold text-2xl">
            {fournisseur.nom[0]}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-display font-semibold text-cendre-900">{fournisseur.nom}</h3>
            {fournisseur.specialite && <p className="text-sm text-cendre-500 mt-0.5">{fournisseur.specialite}</p>}
          </div>
        </div>

        {/* Coordonnées */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {fournisseur.contact && (
            <div className="card-sm flex items-center gap-2">
              <div className="w-7 h-7 bg-cendre-100 rounded-lg flex items-center justify-center text-sm">👤</div>
              <span className="text-sm text-cendre-700">{fournisseur.contact}</span>
            </div>
          )}
          {fournisseur.telephone && (
            <a href={`tel:${fournisseur.telephone}`} className="card-sm flex items-center gap-2 hover:border-primary-300 transition-colors">
              <Phone className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-cendre-700">{fournisseur.telephone}</span>
            </a>
          )}
          {fournisseur.email && (
            <a href={`mailto:${fournisseur.email}`} className="card-sm flex items-center gap-2 hover:border-primary-300 transition-colors">
              <Mail className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-cendre-700 truncate">{fournisseur.email}</span>
            </a>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-3xl font-display font-bold text-blue-700">{nbProduits}</p>
            <p className="text-xs text-blue-500 mt-1">Produits référencés</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-xl font-display font-bold text-red-700">{fcfa(totalAchats)}</p>
            <p className="text-xs text-red-500 mt-1">Total dépensé</p>
          </div>
        </div>

        {/* Liste des produits */}
        {loading ? <div className="spinner mx-auto" /> : (
          <>
            {produits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-cendre-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <ShoppingBag className="w-4 h-4" /> Produits ({produits.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {produits.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 bg-cendre-50 rounded-xl text-sm">
                      <span className="font-medium text-cendre-800">{p.nom}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-cendre-400">Stock: {p.stock_actuel}</span>
                        <span className="font-semibold text-primary-600">{fcfa(p.prix_vente)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historique dépenses */}
            {depenses.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-cendre-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <TrendingDown className="w-4 h-4" /> Historique achats ({depenses.length})
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {depenses.slice().reverse().map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 bg-orange-50 rounded-xl text-sm">
                      <div>
                        <p className="font-medium text-cendre-800">{d.description}</p>
                        <p className="text-xs text-cendre-400">{d.date_depense}</p>
                      </div>
                      <span className="font-bold text-red-600 shrink-0">{fcfa(d.montant)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Notes */}
        {fournisseur.notes && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-cendre-700">{fournisseur.notes}</p>
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

// ===== PAGE PRINCIPALE =====
export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)
  const [confirmDel, setConfirmDel]     = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const data = await db.get('fournisseurs', { order: 'nom', asc: true })
      setFournisseurs(data || [])
    } catch { toast.error('Erreur chargement fournisseurs') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const supprimer = async (id) => {
    try {
      await db.delete('fournisseurs', id)
      setFournisseurs(prev => prev.filter(f => f.id !== id))
      toast.success('Fournisseur supprimé.')
    } catch { toast.error('Impossible de supprimer — ce fournisseur est lié à des produits ou dépenses.') }
  }

  const filtres = fournisseurs.filter(f => {
    const q = search.toLowerCase()
    return !q || f.nom.toLowerCase().includes(q) || (f.specialite || '').toLowerCase().includes(q) || (f.contact || '').toLowerCase().includes(q)
  })

  const close  = () => { setModal(null); setSelected(null) }
  const onSave = () => { charger(); close() }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary-600" /> Gestion des Fournisseurs
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">{fournisseurs.length} fournisseur(s) référencé(s)</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouveau fournisseur
        </button>
      </div>

      <div className="card-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un fournisseur, spécialité…" />
      </div>

      {loading ? <Loader /> : filtres.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun fournisseur"
          description="Ajoutez vos fournisseurs pour les associer aux produits et dépenses."
          action={<button onClick={() => setModal('add')} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtres.map(f => (
            <div key={f.id} className="card hover:shadow-medium transition-all duration-200 group cursor-pointer"
              onClick={() => { setSelected(f); setModal('view') }}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-display font-bold text-xl group-hover:from-primary-500 group-hover:to-primary-600 group-hover:text-white transition-all shrink-0">
                  {f.nom[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-cendre-900 truncate">{f.nom}</p>
                  {f.specialite && <p className="text-xs text-primary-600 mt-0.5">{f.specialite}</p>}
                  {f.contact && <p className="text-xs text-cendre-400 mt-0.5">{f.contact}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cendre-100">
                {f.telephone && (
                  <a href={`tel:${f.telephone}`} onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-cendre-500 hover:text-primary-600 transition-colors">
                    <Phone className="w-3 h-3" /> {f.telephone}
                  </a>
                )}
                <div className="flex gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setSelected(f); setModal('edit') }} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmDel(f)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === 'add'}  onClose={close} title="Nouveau Fournisseur" size="lg">
        <FormFournisseur onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'edit'} onClose={close} title="Modifier le Fournisseur" size="lg">
        <FormFournisseur fournisseur={selected} onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'view'} onClose={close} title="Fiche Fournisseur" size="lg">
        {selected && <FicheFournisseur fournisseur={selected}
          onEdit={() => { close(); setTimeout(() => { setSelected(selected); setModal('edit') }, 100) }}
          onClose={close} />}
      </Modal>
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => supprimer(confirmDel?.id)}
        title="Supprimer ce fournisseur ?"
        message="Attention : cette action échouera si ce fournisseur est lié à des produits ou des dépenses."
        danger />
    </div>
  )
}
