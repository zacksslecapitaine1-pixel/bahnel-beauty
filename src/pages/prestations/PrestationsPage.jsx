import { useState, useEffect, useCallback } from 'react'
import { Scissors, Plus, Edit2, Trash2, Tag, Clock, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { Modal, ConfirmModal, Loader, EmptyState, SearchBar, FormGroup } from '../../components/ui'

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'

function FormPrestation({ prestation, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: '', categorie_id: '', description: '',
    prix: '', duree_minutes: 60, actif: true,
    promo_prix: '', promo_fin: '',
    ...(prestation || {})
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.prix || !form.categorie_id) {
      toast.error('Nom, catégorie et prix sont requis.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nom: form.nom, categorie_id: form.categorie_id,
        description: form.description,
        prix: Number(form.prix),
        duree_minutes: Number(form.duree_minutes),
        actif: form.actif,
        promo_prix: form.promo_prix ? Number(form.promo_prix) : null,
        promo_fin: form.promo_fin || null,
      }
      const saved = prestation?.id
        ? await db.update('prestations_catalogue', prestation.id, payload)
        : await db.insert('prestations_catalogue', payload)
      toast.success(prestation?.id ? 'Prestation modifiée !' : 'Prestation créée !')
      onSave(saved)
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormGroup label="Nom de la prestation" required>
            <input className="input" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Coiffure tresses" />
          </FormGroup>
        </div>
        <FormGroup label="Catégorie" required>
          <select className="select" value={form.categorie_id} onChange={e => set('categorie_id', e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Durée (minutes)">
          <select className="select" value={form.duree_minutes} onChange={e => set('duree_minutes', Number(e.target.value))}>
            {[15,30,45,60,90,120,180].map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Prix (FCFA)" required>
          <input className="input" type="number" min="0" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="15000" />
        </FormGroup>
        <FormGroup label="Prix promo (FCFA)" hint="Laisser vide si pas de promotion">
          <input className="input" type="number" min="0" value={form.promo_prix} onChange={e => set('promo_prix', e.target.value)} placeholder="Optionnel" />
        </FormGroup>
        {form.promo_prix && (
          <FormGroup label="Fin de promotion">
            <input className="input" type="date" value={form.promo_fin} onChange={e => set('promo_fin', e.target.value)} />
          </FormGroup>
        )}
        <div className="sm:col-span-2">
          <FormGroup label="Description">
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description détaillée de la prestation…" />
          </FormGroup>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="button" onClick={() => set('actif', !form.actif)} className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.actif ? 'bg-primary-600' : 'bg-cendre-300'}`}>
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${form.actif ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <label className="text-sm text-cendre-700">{form.actif ? 'Prestation active' : 'Prestation désactivée'}</label>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : prestation?.id ? 'Modifier' : 'Créer la prestation'}
        </button>
      </div>
    </>
  )
}

export default function PrestationsPage() {
  const [prestations, setPrestations] = useState([])
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filtreCateg, setFiltreCateg] = useState('Toutes')
  const [modal, setModal]             = useState(null)
  const [selected, setSelected]       = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        db.get('prestations_catalogue', {
          select: '*, categories_prestations(id, nom, couleur)',
          order: 'nom', asc: true,
        }),
        db.get('categories_prestations', { order: 'nom', asc: true }),
      ])
      setPrestations(p || [])
      setCategories(c || [])
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const toggleActif = async (p) => {
    try {
      await db.update('prestations_catalogue', p.id, { actif: !p.actif })
      setPrestations(prev => prev.map(x => x.id === p.id ? { ...x, actif: !x.actif } : x))
      toast.success(p.actif ? 'Prestation désactivée' : 'Prestation activée')
    } catch { toast.error('Erreur mise à jour') }
  }

  const supprimer = async (id) => {
    try {
      await db.delete('prestations_catalogue', id)
      setPrestations(prev => prev.filter(x => x.id !== id))
      toast.success('Prestation supprimée.')
    } catch { toast.error('Impossible de supprimer.') }
  }

  const filtrees = prestations.filter(p => {
    const q = search.toLowerCase()
    const matchQ = !q || p.nom.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    const matchC = filtreCateg === 'Toutes' || p.categories_prestations?.nom === filtreCateg
    return matchQ && matchC
  })

  // Grouper par catégorie
  const parCateg = {}
  filtrees.forEach(p => {
    const nom = p.categories_prestations?.nom || 'Autres'
    if (!parCateg[nom]) parCateg[nom] = { couleur: p.categories_prestations?.couleur || '#10B981', items: [] }
    parCateg[nom].items.push(p)
  })

  const close  = () => { setModal(null); setSelected(null) }
  const onSave = () => { charger(); close() }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary-600" /> Catalogue des Prestations
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">{prestations.length} prestation(s)</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle prestation
        </button>
      </div>

      <div className="card-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher une prestation…" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Toutes', ...categories.map(c => c.nom)].map(c => (
            <button key={c} onClick={() => setFiltreCateg(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${filtreCateg === c ? 'bg-primary-600 text-white shadow-green' : 'bg-cendre-100 text-cendre-600 hover:bg-cendre-200'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : filtrees.length === 0 ? (
        <EmptyState icon={Scissors} title="Aucune prestation"
          description="Commencez par créer votre catalogue de prestations."
          action={<button onClick={() => setModal('add')} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="space-y-5">
          {Object.entries(parCateg).map(([catNom, catData]) => (
            <div key={catNom} className="card p-0 overflow-hidden">
              {/* En-tête catégorie */}
              <div className="px-5 py-3 flex items-center gap-3 border-b border-cendre-100" style={{ borderLeftColor: catData.couleur, borderLeftWidth: 4 }}>
                <div className="w-3 h-3 rounded-full" style={{ background: catData.couleur }} />
                <h2 className="font-display font-semibold text-cendre-800">{catNom}</h2>
                <span className="badge badge-gray ml-auto">{catData.items.length}</span>
              </div>
              {/* Grille de prestations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-cendre-100">
                {catData.items.map(p => {
                  const enPromo = p.promo_prix && (!p.promo_fin || new Date(p.promo_fin) >= new Date())
                  return (
                    <div key={p.id} className={`p-4 hover:bg-cendre-50 transition-colors ${!p.actif ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-cendre-800 text-sm leading-tight">{p.nom}</p>
                          {p.description && <p className="text-xs text-cendre-400 mt-0.5 line-clamp-2">{p.description}</p>}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-cendre-500">
                              <Clock className="w-3 h-3" /> {p.duree_minutes} min
                            </span>
                            <div className="flex items-center gap-1.5">
                              {enPromo ? (
                                <>
                                  <span className="text-xs text-cendre-400 line-through">{fcfa(p.prix)}</span>
                                  <span className="text-sm font-bold text-green-600">{fcfa(p.promo_prix)}</span>
                                  <span className="badge badge-green text-[10px]">Promo</span>
                                </>
                              ) : (
                                <span className="text-sm font-bold text-primary-600">{fcfa(p.prix)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => { setSelected(p); setModal('edit') }} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => toggleActif(p)} className={`btn-icon ${p.actif ? 'text-primary-600' : 'text-cendre-400'}`} title={p.actif ? 'Désactiver' : 'Activer'}>
                            {p.actif ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setConfirmDel(p)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === 'add'} onClose={close} title="Nouvelle Prestation" size="lg">
        <FormPrestation categories={categories} onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'edit'} onClose={close} title="Modifier la Prestation" size="lg">
        <FormPrestation prestation={selected} categories={categories} onSave={onSave} onClose={close} />
      </Modal>
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => supprimer(confirmDel?.id)}
        title="Supprimer cette prestation ?" message="Cette action est irréversible." danger />
    </div>
  )
}
