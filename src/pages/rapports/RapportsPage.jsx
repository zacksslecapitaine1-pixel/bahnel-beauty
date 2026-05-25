import { useState, useEffect, useCallback, useRef } from 'react'
import { BarChart2, Download, RefreshCw, TrendingUp, TrendingDown, Users, Scissors, Package, Award } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { db } from '../../lib/supabase'
import { exportRapportPDF } from '../../lib/pdfExport'
import { Loader } from '../../components/ui'
import toast from 'react-hot-toast'

const fcfa    = v => new Intl.NumberFormat('fr-FR').format(Number(v || 0)) + ' FCFA'
const COULEURS = ['#10B981','#6366F1','#F59E0B','#EC4899','#06B6D4','#EF4444','#F97316','#8B5CF6']

const PERIODES = [
  { label: 'Ce mois', value: 'mois' },
  { label: '3 mois',  value: '3mois' },
  { label: '6 mois',  value: '6mois' },
  { label: 'Cette année', value: 'annee' },
]

function getPeriode(value) {
  const now = new Date()
  switch (value) {
    case 'mois':  return { start: startOfMonth(now), end: endOfMonth(now) }
    case '3mois': return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    case '6mois': return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) }
    case 'annee': return { start: startOfYear(now), end: endOfYear(now) }
    default:      return { start: startOfMonth(now), end: endOfMonth(now) }
  }
}

export default function RapportsPage() {
  const [periode, setPeriode]   = useState('mois')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const printRef                = useRef()

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getPeriode(periode)
      const startStr = start.toISOString()
      const endStr   = end.toISOString()
      const startDate = format(start, 'yyyy-MM-dd')
      const endDate   = format(end,   'yyyy-MM-dd')

      const [factures, depenses, rdvs, clients, prestataires, produits] = await Promise.all([
        db.get('factures', { select: 'montant_net, montant_paye, statut, date_emission', order: 'date_emission', asc: true }),
        db.get('depenses', { select: 'montant, categorie, date_depense', order: 'date_depense', asc: true }),
        db.get('rendez_vous', {
          select: '*, clients(nom,prenom), prestations_catalogue(nom,prix,categories_prestations(nom)), prestataires(nom,prenom,taux_commission)',
          order: 'date_heure', asc: true,
        }),
        db.get('clients', { select: 'id, created_at, statut' }),
        db.get('prestataires', { select: 'id, nom, prenom, poste, taux_commission', eq: { actif: true } }),
        db.get('produits', { select: 'id, nom, prix_vente, prix_achat, stock_actuel, categories_produits(nom)' }),
      ])

      // Filtrer par période
      const facsP  = (factures || []).filter(f => f.date_emission >= startStr && f.date_emission <= endStr)
      const depsP  = (depenses || []).filter(d => d.date_depense >= startDate && d.date_depense <= endDate)
      const rdvsP  = (rdvs     || []).filter(r => r.date_heure  >= startStr && r.date_heure  <= endStr)

      // KPIs financiers
      const caTot      = facsP.filter(f => f.statut === 'Payée').reduce((s, f) => s + Number(f.montant_net || 0), 0)
      const caEncaisse = facsP.reduce((s, f) => s + Number(f.montant_paye || 0), 0)
      const depTot     = depsP.reduce((s, d) => s + Number(d.montant || 0), 0)
      const benefice   = caEncaisse - depTot
      const rdvTermines= rdvsP.filter(r => r.statut === 'Terminé').length

      // Top prestations
      const prestCount = {}
      rdvsP.filter(r => r.statut === 'Terminé').forEach(r => {
        const nom = r.prestations_catalogue?.nom || 'Inconnu'
        if (!prestCount[nom]) prestCount[nom] = { count: 0, ca: 0 }
        prestCount[nom].count++
        prestCount[nom].ca += Number(r.prestations_catalogue?.prix || 0)
      })
      const topPrestations = Object.entries(prestCount)
        .map(([nom, v]) => ({ nom, ...v }))
        .sort((a, b) => b.count - a.count).slice(0, 7)

      // Top prestataires
      const prestPerf = {}
      rdvsP.filter(r => r.statut === 'Terminé').forEach(r => {
        const id = r.prestataire_id
        if (!id) return
        if (!prestPerf[id]) prestPerf[id] = {
          nom: `${r.prestataires?.prenom} ${r.prestataires?.nom}`,
          poste: r.prestataires?.poste, count: 0, ca: 0,
          taux: Number(r.prestataires?.taux_commission || 0)
        }
        prestPerf[id].count++
        prestPerf[id].ca += Number(r.prestations_catalogue?.prix || 0)
      })
      const topPrestataires = Object.values(prestPerf)
        .map(p => ({ ...p, commission: p.ca * p.taux / 100 }))
        .sort((a, b) => b.count - a.count).slice(0, 5)

      // Évolution mensuelle (nb de mois selon période)
      const nbMois = periode === 'mois' ? 1 : periode === '3mois' ? 3 : periode === '6mois' ? 6 : 12
      const graphMois = Array.from({ length: nbMois }, (_, i) => {
        const d  = subMonths(end, nbMois - 1 - i)
        const ms = startOfMonth(d).toISOString()
        const me = endOfMonth(d).toISOString()
        const md = format(startOfMonth(d), 'yyyy-MM-dd')
        const mf = format(endOfMonth(d), 'yyyy-MM-dd')
        const rev = (factures || []).filter(f => f.date_emission >= ms && f.date_emission <= me)
          .reduce((s, f) => s + Number(f.montant_paye || 0), 0)
        const dep = (depenses || []).filter(d => d.date_depense >= md && d.date_depense <= mf)
          .reduce((s, d) => s + Number(d.montant || 0), 0)
        return {
          mois: format(d, 'MMM', { locale: fr }),
          revenus: rev, depenses: dep, benefice: rev - dep
        }
      })

      // Dépenses par catégorie
      const depCateg = {}
      depsP.forEach(d => { depCateg[d.categorie] = (depCateg[d.categorie] || 0) + Number(d.montant || 0) })
      const graphDepCateg = Object.entries(depCateg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

      // Nouveaux clients période
      const nvClients = (clients || []).filter(c => c.created_at >= startStr && c.created_at <= endStr).length

      setData({
        caTot, caEncaisse, depTot, benefice, rdvTermines, nvClients,
        topPrestations, topPrestataires, graphMois, graphDepCateg,
        totalClients: clients?.length || 0,
      })
    } catch (err) {
      console.error(err)
      toast.error('Erreur chargement des rapports')
    } finally {
      setLoading(false)
    }
  }, [periode])

  useEffect(() => { charger() }, [charger])

  const handlePrint = () => {
    exportRapportPDF(data, PERIODES.find(p => p.value === periode)?.label || periode)
  }

  if (loading) return <div className="page-loader flex-col gap-3"><div className="spinner" /><p className="text-sm text-cendre-400">Génération du rapport…</p></div>
  if (!data)   return null

  return (
    <div className="space-y-6 animate-fade-in" ref={printRef}>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary-600" /> Rapports & Statistiques
          </h1>
          <p className="text-sm text-cendre-400 mt-0.5 capitalize">
            Rapport généré le {format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={charger} className="btn-secondary"><RefreshCw className="w-4 h-4" /> Actualiser</button>
          <button onClick={handlePrint} className="btn-primary"><Download className="w-4 h-4" /> Imprimer</button>
        </div>
      </div>

      {/* Sélecteur période */}
      <div className="flex gap-2 flex-wrap">
        {PERIODES.map(p => (
          <button key={p.value} onClick={() => setPeriode(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${periode === p.value ? 'bg-primary-600 text-white border-primary-600 shadow-green' : 'bg-white text-cendre-600 border-cendre-200 hover:border-primary-300'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'CA Encaissé',    value: fcfa(data.caEncaisse), icon: TrendingUp,   color: 'text-green-600',  bg: 'bg-green-50'  },
          { title: 'Dépenses',       value: fcfa(data.depTot),     icon: TrendingDown, color: 'text-red-600',    bg: 'bg-red-50'    },
          { title: 'Bénéfice Net',   value: fcfa(data.benefice),   icon: Award,        color: data.benefice >= 0 ? 'text-primary-600' : 'text-red-600', bg: data.benefice >= 0 ? 'bg-primary-50' : 'bg-red-50' },
          { title: 'RDV Terminés',   value: data.rdvTermines,      icon: Scissors,     color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(k => (
          <div key={k.title} className="card">
            <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
              <k.icon className={`w-5 h-5 ${k.color}`} />
            </div>
            <p className={`text-2xl font-display font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-cendre-500 mt-1">{k.title}</p>
          </div>
        ))}
      </div>

      {/* Graphique évolution */}
      {data.graphMois.length > 1 && (
        <div className="card">
          <h2 className="text-lg font-display font-semibold mb-5">Évolution Revenus / Dépenses</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.graphMois}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${v/1000}k` : v} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 12, fontSize: 12, color: '#F9FAFB' }} formatter={v => [fcfa(v)]} />
              <Legend />
              <Area type="monotone" dataKey="revenus"  name="Revenus"  stroke="#10B981" strokeWidth={2} fill="url(#gRev)" />
              <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#EF4444" strokeWidth={2} fill="url(#gDep)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top prestations */}
        <div className="card">
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary-600" /> Top Prestations
          </h2>
          {data.topPrestations.length === 0 ? (
            <p className="text-sm text-cendre-400 italic">Aucune prestation sur cette période.</p>
          ) : (
            <div className="space-y-3">
              {data.topPrestations.map((p, i) => (
                <div key={p.nom} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-primary-600' : 'text-cendre-400'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-cendre-800 truncate">{p.nom}</p>
                      <p className="text-xs text-cendre-500 shrink-0 ml-2">{p.count}×</p>
                    </div>
                    <div className="h-1.5 bg-cendre-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${(p.count / data.topPrestations[0].count) * 100}%`, background: COULEURS[i % COULEURS.length] }} />
                    </div>
                    <p className="text-xs text-primary-600 font-semibold mt-0.5">{fcfa(p.ca)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top prestataires */}
        <div className="card">
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" /> Performances Prestataires
          </h2>
          {data.topPrestataires.length === 0 ? (
            <p className="text-sm text-cendre-400 italic">Aucune donnée sur cette période.</p>
          ) : (
            <div className="space-y-3">
              {data.topPrestataires.map((p, i) => (
                <div key={p.nom} className="flex items-center gap-3 p-3 bg-cendre-50 rounded-xl">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-primary-600' : 'bg-cendre-400'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-cendre-800 truncate">{p.nom}</p>
                    <p className="text-xs text-cendre-400">{p.poste}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary-600">{p.count} prest.</p>
                    <p className="text-xs text-cendre-400">{fcfa(p.ca)}</p>
                    <p className="text-xs text-violet-500">comm. {fcfa(p.commission)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dépenses par catégorie */}
        {data.graphDepCateg.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" /> Dépenses par Catégorie
            </h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={data.graphDepCateg} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                    {data.graphDepCateg.map((_, i) => <Cell key={i} fill={COULEURS[i % COULEURS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1F2937', border: 'none', borderRadius: 10, fontSize: 12, color: '#F9FAFB' }} formatter={v => [fcfa(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {data.graphDepCateg.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COULEURS[i % COULEURS.length] }} />
                    <span className="text-cendre-600 flex-1 truncate">{d.name}</span>
                    <span className="font-semibold text-cendre-800">{fcfa(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Résumé clients */}
        <div className="card">
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" /> Résumé Clients
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-primary-50 rounded-xl text-center">
              <p className="text-3xl font-display font-bold text-primary-600">{data.totalClients}</p>
              <p className="text-xs text-primary-500 mt-1">Total clients</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <p className="text-3xl font-display font-bold text-green-600">{data.nvClients}</p>
              <p className="text-xs text-green-500 mt-1">Nouveaux (période)</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-3xl font-display font-bold text-blue-600">{data.rdvTermines}</p>
              <p className="text-xs text-blue-500 mt-1">Prestations réalisées</p>
            </div>
            <div className="p-4 bg-violet-50 rounded-xl text-center">
              <p className="text-3xl font-display font-bold text-violet-600">
                {data.rdvTermines > 0 && data.totalClients > 0
                  ? (data.rdvTermines / data.totalClients).toFixed(1)
                  : '0'}
              </p>
              <p className="text-xs text-violet-500 mt-1">Prest. / client moy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
