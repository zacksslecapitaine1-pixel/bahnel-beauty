import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Calendar, DollarSign,
  Users, Package, AlertTriangle, Clock, RefreshCw,
  ChevronRight, Sparkles, CheckCircle2, XCircle, Loader2
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useDashboard } from './useDashboard'
import { GraphRevenusDep, GraphDepCateg, GraphPrestataires } from './Graphiques'

// Formateur montant FCFA
const fcfa = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' FCFA'

// Statut couleur RDV
const statutRdv = {
  'Confirmé': { cls: 'badge-green',  dot: 'bg-green-500'  },
  'En cours': { cls: 'badge-blue',   dot: 'bg-blue-500'   },
  'Terminé':  { cls: 'badge-gray',   dot: 'bg-gray-400'   },
  'Annulé':   { cls: 'badge-red',    dot: 'bg-red-500'    },
  'Absent':   { cls: 'badge-orange', dot: 'bg-orange-500' },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useDashboard()

  if (loading) return (
    <div className="page-loader flex-col gap-3">
      <div className="spinner" />
      <p className="text-sm text-cendre-400">Chargement du tableau de bord…</p>
    </div>
  )

  if (error && !data) return (
    <div className="card text-center py-12">
      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-cendre-600">{error}</p>
      <button onClick={refresh} className="btn-primary mt-4 mx-auto">
        <RefreshCw className="w-4 h-4" /> Réessayer
      </button>
    </div>
  )

  const d = data

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== EN-TÊTE ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold text-cendre-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary-600" />
            Tableau de Bord
          </h1>
          <p className="text-cendre-400 text-sm mt-0.5 capitalize">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <button onClick={refresh} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"1rem" }} className="lg-4col">
        <KpiCard
          title="CA Aujourd'hui"
          value={fcfa(d.caJour)}
          icon={DollarSign}
          color="green"
          sub={`${d.rdvTerminesCount} prestation(s) facturée(s)`}
        />
        <KpiCard
          title="CA du Mois"
          value={fcfa(d.caMois)}
          icon={TrendingUp}
          color="blue"
          sub="Factures payées"
        />
        <KpiCard
          title="Dépenses du Mois"
          value={fcfa(d.depMois)}
          icon={TrendingDown}
          color="orange"
          sub="Toutes catégories"
        />
        <KpiCard
          title="Bénéfice Net"
          value={fcfa(d.beneficeMois)}
          icon={Sparkles}
          color={d.beneficeMois >= 0 ? 'violet' : 'red'}
          sub="Revenus − Dépenses"
        />
      </div>

      {/* ===== RDV + ALERTES (ligne secondaire KPI) ===== */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"0.75rem" }}>
        <MiniKpi label="RDV Aujourd'hui" value={d.rdvAujourdhuiCount} icon="📅" color="text-primary-600 bg-primary-50" onClick={() => navigate('/rendez-vous')} />
        <MiniKpi label="RDV Terminés" value={d.rdvTerminesCount} icon="✅" color="text-green-600 bg-green-50" onClick={() => navigate('/rendez-vous')} />
        <MiniKpi label="Factures en attente" value={d.facturesEnAttente} icon="🧾" color="text-orange-600 bg-orange-50" onClick={() => navigate('/ventes')} />
        <MiniKpi label="Alertes Stock" value={d.alertesStock.length} icon="📦" color={d.alertesStock.length > 0 ? "text-red-600 bg-red-50" : "text-cendre-600 bg-cendre-50"} onClick={() => navigate('/produits')} />
      </div>

      {/* ===== GRAPHIQUES ===== */}
      <div style={{ display:"grid", gap:"1.25rem" }} className="lg-3col">
        {/* Revenus vs Dépenses */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-display font-semibold text-cendre-900">Revenus & Dépenses</h2>
              <p className="text-xs text-cendre-400 mt-0.5">6 derniers mois</p>
            </div>
            <span className="badge-green text-xs">{fcfa(d.beneficeMois)} ce mois</span>
          </div>
          {d.graphMois.length > 0 ? <GraphRevenusDep data={d.graphMois} /> : <Vide />}
        </div>

        {/* Dépenses par catégorie */}
        <div className="card">
          <div className="mb-5">
            <h2 className="text-lg font-display font-semibold text-cendre-900">Dépenses</h2>
            <p className="text-xs text-cendre-400 mt-0.5">Par catégorie ce mois</p>
          </div>
          {d.graphDepCateg.length > 0 ? <GraphDepCateg data={d.graphDepCateg} /> : <Vide />}
        </div>
      </div>

      {/* ===== PROCHAINS RDV + TOPS ===== */}
      <div style={{ display:"grid", gap:"1.25rem" }} className="lg-2col">
        {/* Prochains RDV */}
        <div className="card">
          <SectionHead title="Prochains Rendez-vous" link="/rendez-vous" onLink={() => navigate('/rendez-vous')} />
          {d.rdvProchains.length === 0 ? (
            <Vide text="Aucun rendez-vous à venir" />
          ) : (
            <div className="space-y-2.5 mt-4">
              {d.rdvProchains.map(rdv => {
                const s = statutRdv[rdv.statut] || statutRdv['Confirmé']
                return (
                  <div key={rdv.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-cendre-50 transition-colors cursor-pointer" onClick={() => navigate('/rendez-vous')}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cendre-800 truncate">
                        {rdv.clients?.prenom} {rdv.clients?.nom}
                      </p>
                      <p className="text-xs text-cendre-400 truncate">
                        {rdv.prestations_catalogue?.nom} · {rdv.prestataires?.prenom} {rdv.prestataires?.nom}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-cendre-700">
                        {format(parseISO(rdv.date_heure), 'HH:mm')}
                      </p>
                      <p className="text-xs text-cendre-400">
                        {format(parseISO(rdv.date_heure), 'dd/MM')}
                      </p>
                    </div>
                    <span className={`badge text-xs ${s.cls} shrink-0`}>{rdv.statut}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Prestataires */}
        <div className="card">
          <SectionHead title="Top Prestataires" subtitle="Prestations ce mois" link="/prestataires" onLink={() => navigate('/prestataires')} />
          {d.topPrestataires.length === 0 ? (
            <Vide text="Aucune donnée ce mois" />
          ) : (
            <div className="mt-4">
              <GraphPrestataires data={d.topPrestataires} />
              <div className="mt-3 space-y-1.5">
                {d.topPrestataires.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-2">
                    <span className={`text-sm font-bold w-5 text-center ${i === 0 ? 'text-primary-600' : 'text-cendre-400'}`}>{i + 1}</span>
                    <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-xs font-semibold text-primary-700">
                      {p.prenom?.[0]}{p.nom?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cendre-800 truncate">{p.prenom} {p.nom}</p>
                      <p className="text-xs text-cendre-400">{p.poste}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary-600">{p.prestations_mois}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== ALERTES ===== */}
      <div style={{ display:"grid", gap:"1.25rem" }} className="lg-2col">
        {/* Factures en retard */}
        <div className="card">
          <SectionHead title="Factures Impayées" link="/ventes" onLink={() => navigate('/ventes')} />
          {d.facturesEnRetard.length === 0 ? (
            <div className="flex items-center gap-2 mt-4 text-green-600 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Toutes les factures sont à jour !
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {d.facturesEnRetard.map(f => {
                const jours = differenceInDays(new Date(), parseISO(f.date_emission))
                const restant = Number(f.montant_net || 0) - Number(f.montant_paye || 0)
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors" onClick={() => navigate('/ventes')}>
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cendre-800">{f.numero}</p>
                      <p className="text-xs text-cendre-500">{f.clients?.prenom} {f.clients?.nom} · il y a {jours} j</p>
                    </div>
                    <span className="text-sm font-bold text-red-600 shrink-0">{fcfa(restant)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Alertes stock */}
        <div className="card">
          <SectionHead title="Alertes Stock" link="/produits" onLink={() => navigate('/produits')} />
          {d.alertesStock.length === 0 ? (
            <div className="flex items-center gap-2 mt-4 text-green-600 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Tous les stocks sont suffisants !
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {d.alertesStock.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => navigate('/produits')}>
                  <Package className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cendre-800 truncate">{p.nom}</p>
                    <p className="text-xs text-cendre-500">{p.categories_produits?.nom}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${p.stock_actuel === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {p.stock_actuel === 0 ? 'Rupture' : `${p.stock_actuel} restant`}
                    </p>
                    <p className="text-xs text-cendre-400">Min: {p.stock_minimum}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== SOUS-COMPOSANTS =====

function KpiCard({ title, value, icon: Icon, color, sub }) {
  const themes = {
    green:  { bg: 'bg-primary-600', light: 'bg-primary-50', text: 'text-primary-700' },
    blue:   { bg: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700'   },
    orange: { bg: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-700' },
    red:    { bg: 'bg-red-500',     light: 'bg-red-50',     text: 'text-red-700'    },
    violet: { bg: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700' },
  }
  const t = themes[color] || themes.green
  return (
    <div className="card hover:shadow-medium transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-cendre-500 uppercase tracking-wide leading-tight">{title}</p>
        <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-display font-semibold text-cendre-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-cendre-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function MiniKpi({ label, value, icon, color, onClick }) {
  return (
    <button onClick={onClick} className={`card-sm flex items-center gap-3 hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5 text-left w-full ${color}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xl font-display font-bold">{value}</p>
        <p className="text-xs font-medium opacity-80 leading-tight">{label}</p>
      </div>
    </button>
  )
}

function SectionHead({ title, subtitle, onLink }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-display font-semibold text-cendre-900">{title}</h2>
        {subtitle && <p className="text-xs text-cendre-400 mt-0.5">{subtitle}</p>}
      </div>
      <button onClick={onLink} className="text-primary-600 hover:text-primary-700 text-xs font-medium flex items-center gap-1 transition-colors">
        Voir tout <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  )
}

function Vide({ text = 'Aucune donnée disponible' }) {
  return (
    <div className="flex items-center justify-center h-28 text-cendre-300 text-sm">
      {text}
    </div>
  )
}
