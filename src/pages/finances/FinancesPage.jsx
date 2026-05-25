import { useState, useEffect, useCallback } from 'react'
import { TrendingDown, Plus, Edit2, Trash2, Filter, Upload, Download } from 'lucide-react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'
import { db } from '../../lib/supabase'
import { exportDepensesPDF } from '../../lib/pdfExport'
import { Modal, ConfirmModal, Loader, EmptyState, SearchBar, FormGroup } from '../../components/ui'

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'
const CATEGORIES = ['Achat matériel','Achat produits','Salaires','Loyer','Eau & Électricité','Maintenance','Marketing','Transport','Divers']
const MODES      = ['Espèces','Flooz','T-Money','Virement bancaire','Carte bancaire','Autre']
const COULEURS   = ['#10B981','#6366F1','#F59E0B','#EC4899','#06B6D4','#EF4444','#F97316','#8B5CF6','#14B8A6']

function FormDepense({ depense, fournisseurs, onSave, onClose }) {
  const [form, setForm] = useState({
    categorie: 'Divers', description: '', montant: '',
    mode_paiement: 'Espèces', fournisseur_id: '',
    reference: '', date_depense: format(new Date(), 'yyyy-MM-dd'),
    recurrente: false, frequence: 'mensuelle', notes: '',
    ...(depense || {})
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.description.trim() || !form.montant || !form.date_depense) {
      toast.error('Description, montant et date sont requis.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        montant: Number(form.montant),
        fournisseur_id: form.fournisseur_id || null,
      }
      const saved = depense?.id
        ? await db.update('depenses', depense.id, payload)
        : await db.insert('depenses', payload)
      toast.success(depense?.id ? 'Dépense modifiée !' : 'Dépense ajoutée !')
      onSave(saved)
    } catch (e) { toast.error('Erreur : ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormGroup label="Description" required>
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Achat de produits cosmétiques…" />
          </FormGroup>
        </div>
        <FormGroup label="Catégorie">
          <select className="select" value={form.categorie} onChange={e => set('categorie', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Montant (FCFA)" required>
          <input className="input" type="number" min="0" value={form.montant} onChange={e => set('montant', e.target.value)} placeholder="10000" />
        </FormGroup>
        <FormGroup label="Date" required>
          <input className="input" type="date" value={form.date_depense} onChange={e => set('date_depense', e.target.value)} />
        </FormGroup>
        <FormGroup label="Mode de paiement">
          <select className="select" value={form.mode_paiement} onChange={e => set('mode_paiement', e.target.value)}>
            {MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Fournisseur (optionnel)">
          <select className="select" value={form.fournisseur_id} onChange={e => set('fournisseur_id', e.target.value)}>
            <option value="">-- Aucun --</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Référence / N° facture">
          <input className="input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Optionnel" />
        </FormGroup>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="button" onClick={() => set('recurrente', !form.recurrente)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.recurrente ? 'bg-primary-600' : 'bg-cendre-300'}`}>
            <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${form.recurrente ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <label className="text-sm text-cendre-700">Dépense récurrente</label>
          {form.recurrente && (
            <select className="select w-36" value={form.frequence} onChange={e => set('frequence', e.target.value)}>
              <option value="mensuelle">Mensuelle</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="annuelle">Annuelle</option>
            </select>
          )}
        </div>
        <div className="sm:col-span-2">
          <FormGroup label="Notes">
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </FormGroup>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={onClose} className="btn-secondary">Annuler</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : depense?.id ? 'Modifier' : 'Ajouter la dépense'}
        </button>
      </div>
    </>
  )
}

export default function FinancesPage() {
  const [depenses, setDepenses]         = useState([])
  const [fournisseurs, setFournisseurs] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filtreCateg, setFiltreCateg]   = useState('Toutes')
  const [periodeStart, setPeriodeStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [periodeEnd, setPeriodeEnd]     = useState(format(endOfMonth(new Date()),   'yyyy-MM-dd'))
  const [modal, setModal]               = useState(null)
  const [selected, setSelected]         = useState(null)
  const [confirmDel, setConfirmDel]     = useState(null)

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [dep, four] = await Promise.all([
        db.get('depenses', {
          select: '*, fournisseurs(nom)',
          order: 'date_depense',
        }),
        db.get('fournisseurs', { order: 'nom', asc: true }),
      ])
      setDepenses(dep || [])
      setFournisseurs(four || [])
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { charger() }, [charger])

  const supprimer = async (id) => {
    try {
      await db.delete('depenses', id)
      setDepenses(prev => prev.filter(d => d.id !== id))
      toast.success('Dépense supprimée.')
    } catch { toast.error('Impossible de supprimer.') }
  }

  // Filtrage
  const filtrees = depenses.filter(d => {
    const q = search.toLowerCase()
    const matchQ = !q || d.description.toLowerCase().includes(q) || (d.reference || '').toLowerCase().includes(q)
    const matchC = filtreCateg === 'Toutes' || d.categorie === filtreCateg
    const matchP = (!periodeStart || d.date_depense >= periodeStart) && (!periodeEnd || d.date_depense <= periodeEnd)
    return matchQ && matchC && matchP
  })

  const totalPeriode = filtrees.reduce((s, d) => s + Number(d.montant || 0), 0)

  // Graphique par catégorie
  const parCateg = {}
  filtrees.forEach(d => { parCateg[d.categorie] = (parCateg[d.categorie] || 0) + Number(d.montant || 0) })
  const graphCateg = Object.entries(parCateg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const close  = () => { setModal(null); setSelected(null) }
  const onSave = () => { charger(); close() }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-primary-600" /> Gestion Financière
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5">{depenses.length} dépense(s) enregistrée(s)</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle dépense
        </button>
        <button
          onClick={() => exportDepensesPDF(filtrees, `Du ${periodeStart} au ${periodeEnd}`, totalPeriode)}
          className="btn-secondary">
          <Download className="w-4 h-4" /> Exporter PDF
        </button>
      </div>

      {/* KPI total période */}
      <div className="card bg-gradient-to-br from-cendre-800 to-cendre-900 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Total des dépenses (période sélectionnée)</p>
            <p className="text-4xl font-display font-semibold mt-1">{fcfa(totalPeriode)}</p>
            <p className="text-white/40 text-xs mt-1">{filtrees.length} transaction(s)</p>
          </div>
          <TrendingDown className="w-16 h-16 text-white/10" />
        </div>
      </div>

      {/* Graphique catégories */}
      {graphCateg.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-display font-semibold mb-4">Dépenses par catégorie</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={graphCateg} margin={{ top: 0, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} angle={-30} textAnchor="end" />
              <YAxis tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip
                contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 10, fontSize: 12, color: '#F9FAFB' }}
                formatter={v => [fcfa(v), 'Montant']}
              />
              <Bar dataKey="value" radius={[6,6,0,0]} maxBarSize={50}>
                {graphCateg.map((_, i) => <Cell key={i} fill={COULEURS[i % COULEURS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtres */}
      <div className="card-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Rechercher…" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <input className="input text-sm" type="date" value={periodeStart} onChange={e => setPeriodeStart(e.target.value)} />
            </div>
            <div className="flex-1">
              <input className="input text-sm" type="date" value={periodeEnd} onChange={e => setPeriodeEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <select className="select" value={filtreCateg} onChange={e => setFiltreCateg(e.target.value)}>
              <option value="Toutes">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Loader /> : filtrees.length === 0 ? (
        <EmptyState icon={TrendingDown} title="Aucune dépense" description="Commencez à enregistrer vos dépenses."
          action={<button onClick={() => setModal('add')} className="btn-primary"><Plus className="w-4 h-4" /> Ajouter</button>} />
      ) : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Description</th>
                  <th className="th hidden sm:table-cell">Catégorie</th>
                  <th className="th">Date</th>
                  <th className="th">Montant</th>
                  <th className="th hidden md:table-cell">Mode</th>
                  <th className="th hidden lg:table-cell">Fournisseur</th>
                  <th className="th hidden lg:table-cell">Récurrent</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtrees.map(d => (
                  <tr key={d.id} className="tr-hover">
                    <td className="td">
                      <p className="font-medium text-cendre-800 text-sm">{d.description}</p>
                      {d.reference && <p className="text-xs text-cendre-400 font-mono">{d.reference}</p>}
                    </td>
                    <td className="td hidden sm:table-cell">
                      <span className="badge badge-gray text-xs">{d.categorie}</span>
                    </td>
                    <td className="td"><span className="text-sm text-cendre-600">{format(parseISO(d.date_depense), 'dd/MM/yyyy')}</span></td>
                    <td className="td"><span className="font-semibold text-red-600 text-sm">{fcfa(d.montant)}</span></td>
                    <td className="td hidden md:table-cell"><span className="text-sm text-cendre-500">{d.mode_paiement}</span></td>
                    <td className="td hidden lg:table-cell"><span className="text-sm text-cendre-500">{d.fournisseurs?.nom || '—'}</span></td>
                    <td className="td hidden lg:table-cell">
                      {d.recurrente
                        ? <span className="badge badge-blue capitalize">{d.frequence}</span>
                        : <span className="text-cendre-300 text-sm">—</span>}
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setSelected(d); setModal('edit') }} className="btn-icon"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDel(d)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-cendre-100 flex justify-between text-xs text-cendre-500">
            <span>{filtrees.length} dépense(s)</span>
            <span className="font-semibold text-red-600">Total : {fcfa(totalPeriode)}</span>
          </div>
        </div>
      )}

      <Modal open={modal === 'add'} onClose={close} title="Nouvelle Dépense" size="lg">
        <FormDepense fournisseurs={fournisseurs} onSave={onSave} onClose={close} />
      </Modal>
      <Modal open={modal === 'edit'} onClose={close} title="Modifier la Dépense" size="lg">
        <FormDepense depense={selected} fournisseurs={fournisseurs} onSave={onSave} onClose={close} />
      </Modal>
      <ConfirmModal open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => supprimer(confirmDel?.id)}
        title="Supprimer cette dépense ?" message="Cette action est irréversible." danger />
    </div>
  )
}
