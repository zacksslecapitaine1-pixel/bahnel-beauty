// Pages placeholder — seront remplacées session par session
import { Construction } from 'lucide-react'

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-primary-600" />
      </div>
      <h2 className="text-2xl font-display font-semibold text-cendre-800 mb-2">{title}</h2>
      <p className="text-cendre-400 text-sm">Ce module sera disponible dans une prochaine session.</p>
    </div>
  )
}

export const DashboardPage        = () => <ComingSoon title="Tableau de Bord" />
export const ClientsPage          = () => <ComingSoon title="Gestion des Clients" />
export const RendezVousPage       = () => <ComingSoon title="Gestion des Rendez-vous" />
export const PrestationsPage      = () => <ComingSoon title="Catalogue des Prestations" />
export const PrestatairesPage     = () => <ComingSoon title="Gestion des Prestataires" />
export const ProduitsPage         = () => <ComingSoon title="Produits & Stock" />
export const VentesPage           = () => <ComingSoon title="Ventes & Facturation" />
export const FinancesPage         = () => <ComingSoon title="Gestion Financière" />
export const RapportsPage         = () => <ComingSoon title="Rapports & Statistiques" />
export const NotificationsPage    = () => <ComingSoon title="Notifications" />
export const ParametresPage       = () => <ComingSoon title="Paramètres" />
export const PrestataireHome      = () => <ComingSoon title="Mon Planning" />
export const PrestataireClients   = () => <ComingSoon title="Mes Clients" />
export const PrestataireVentes    = () => <ComingSoon title="Enregistrer une Vente" />
export const PrestataireStock     = () => <ComingSoon title="Stock" />
export const PrestataireCommissions = () => <ComingSoon title="Mes Commissions" />
