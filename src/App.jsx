import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import Setup from './pages/Setup'
import Landing           from './pages/Landing'
import Layout            from './components/layout/Layout'
import DashboardPage     from './pages/dashboard/DashboardPage'
import ClientsPage       from './pages/clients/ClientsPage'
import RendezVousPage    from './pages/rendez-vous/RendezVousPage'
import PrestationsPage   from './pages/prestations/PrestationsPage'
import PrestatairesPage  from './pages/prestataires/PrestatairesPage'
import ProduitsPage      from './pages/produits/ProduitsPage'
import FournisseursPage  from './pages/fournisseurs/FournisseursPage'
import VentesPage        from './pages/ventes/VentesPage'
import FinancesPage      from './pages/finances/FinancesPage'
import RapportsPage      from './pages/rapports/RapportsPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import ParametresPage    from './pages/parametres/ParametresPage'
import { PrestataireHomePage, PrestataireCommissionsPage } from './pages/prestataire/PrestatairePage'
import { PrestataireClientsPage, PrestataireVentesPage, PrestataireStockPage } from './pages/prestataire/PrestataireModules'

function App() {
  const [configured, setConfigured] = useState(null) // null = en cours de vérification

  useEffect(() => {
    // Vérifier si Supabase est déjà configuré dans localStorage
    setConfigured(isConfigured())
  }, [])

  // Chargement initial
  if (configured === null) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F9FAFB', flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div style={{
          width: '36px', height: '36px', border: '3px solid #D1FAE5',
          borderTopColor: '#10B981', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#9CA3AF' }}>Chargement…</p>
      </div>
    )
  }

  // Pas encore configuré → page Setup
  if (!configured) {
    return <Setup onComplete={() => setConfigured(true)} />
  }

  // Configuré → application complète
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<Layout />}>
          {/* Directrice */}
          <Route path="/dashboard"       element={<DashboardPage />} />
          <Route path="/rendez-vous"     element={<RendezVousPage />} />
          <Route path="/clients"         element={<ClientsPage />} />
          <Route path="/prestations"     element={<PrestationsPage />} />
          <Route path="/prestataires"    element={<PrestatairesPage />} />
          <Route path="/produits"        element={<ProduitsPage />} />
          <Route path="/fournisseurs"    element={<FournisseursPage />} />
          <Route path="/ventes"          element={<VentesPage />} />
          <Route path="/finances"        element={<FinancesPage />} />
          <Route path="/rapports"        element={<RapportsPage />} />
          <Route path="/parametres"      element={<ParametresPage />} />
          {/* Prestataires */}
          <Route path="/prestataire"             element={<PrestataireHomePage />} />
          <Route path="/prestataire/clients"     element={<PrestataireClientsPage />} />
          <Route path="/prestataire/ventes"      element={<PrestataireVentesPage />} />
          <Route path="/prestataire/stock"       element={<PrestataireStockPage />} />
          <Route path="/prestataire/commissions" element={<PrestataireCommissionsPage />} />
          {/* Commun */}
          <Route path="/notifications"   element={<NotificationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
