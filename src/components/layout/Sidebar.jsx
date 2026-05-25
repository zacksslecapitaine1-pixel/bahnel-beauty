import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Scissors, Package,
  ShoppingCart, TrendingDown, BarChart2, Bell, Settings,
  LogOut, Sparkles, UserCheck, X, Truck
} from 'lucide-react'
import { useAuthStore, useAppStore, useNotifStore } from '../../store'

const NAV_DIRECTRICE = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/rendez-vous',  icon: Calendar,        label: 'Rendez-vous' },
  { to: '/clients',      icon: Users,           label: 'Clients' },
  { to: '/prestations',  icon: Scissors,        label: 'Prestations' },
  { to: '/prestataires', icon: UserCheck,       label: 'Prestataires' },
  { to: '/produits',     icon: Package,         label: 'Produits & Stock' },
  { to: '/fournisseurs', icon: Truck,           label: 'Fournisseurs' },
  { to: '/ventes',       icon: ShoppingCart,    label: 'Ventes & Factures' },
  { to: '/finances',     icon: TrendingDown,    label: 'Finances' },
  { to: '/rapports',     icon: BarChart2,       label: 'Rapports' },
  { to: '/notifications',icon: Bell,            label: 'Notifications', badge: true },
  { to: '/parametres',   icon: Settings,        label: 'Paramètres' },
]

const NAV_PRESTATAIRE = [
  { to: '/prestataire',             icon: LayoutDashboard, label: 'Mon planning',       perm: null },
  { to: '/prestataire/clients',     icon: Users,           label: 'Clients',             perm: 'clients_voir' },
  { to: '/prestataire/ventes',      icon: ShoppingCart,    label: 'Enregistrer vente',   perm: 'ventes' },
  { to: '/prestataire/stock',       icon: Package,         label: 'Stock',               perm: 'stock_voir' },
  { to: '/prestataire/commissions', icon: TrendingDown,    label: 'Mes commissions',     perm: 'commissions_voir' },
  { to: '/notifications',           icon: Bell,            label: 'Notifications',       perm: null, badge: true },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { role, prestataire, logout, hasPermission } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const { unread } = useNotifStore()

  const isDirectrice = role === 'directrice'
  const navItems = isDirectrice
    ? NAV_DIRECTRICE
    : NAV_PRESTATAIRE.filter(item => !item.perm || hasPermission(item.perm))

  const handleLogout = () => { logout(); navigate('/') }
  const handleNavClick = () => { if (window.innerWidth < 1024) toggleSidebar() }

  return (
    <>
      {/* Overlay mobile semi-transparent */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          style={{
            position:'fixed', inset:0,
            background:'rgba(0,0,0,0.35)',
            zIndex:30, display:'block',
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position:'fixed', top:0, left:0, height:'100%', zIndex:40,
        background:'#fff', borderRight:'1px solid #F3F4F6',
        boxShadow:'2px 0 15px rgba(0,0,0,0.05)',
        display:'flex', flexDirection:'column',
        width: sidebarOpen ? '256px' : '0',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
      }}>
        {/* Contenu avec largeur fixe pour éviter le recalcul */}
        <div style={{ width:'256px', display:'flex', flexDirection:'column', height:'100%' }}>

          {/* Logo */}
          <div style={{ padding:'1.25rem', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'#10B981', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px -4px rgba(16,185,129,0.4)', flexShrink:0 }}>
                <Sparkles size={18} color="#fff" />
              </div>
              <div>
                <p style={{ margin:0, fontSize:'0.875rem', fontFamily:'var(--font-display)', fontWeight:600, color:'#111827', lineHeight:1.2 }}>Bahnel Beauty</p>
                <p style={{ margin:0, fontSize:'0.7rem', color:'#9CA3AF' }}>Institute</p>
              </div>
            </div>
            <button onClick={toggleSidebar} className="btn-icon lg:hidden">
              <X size={16} />
            </button>
          </div>

          {/* Profil */}
          <div style={{ padding:'0.75rem 1rem', borderBottom:'1px solid #F3F4F6', background:'#F9FAFB' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{
                width:'36px', height:'36px', borderRadius:'10px', flexShrink:0,
                background: isDirectrice ? '#1F2937' : '#D1FAE5',
                color:      isDirectrice ? '#fff'    : '#065f46',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.875rem', fontWeight:600,
              }}>
                {isDirectrice ? '👑' : `${prestataire?.prenom?.[0] || ''}${prestataire?.nom?.[0] || ''}`}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ margin:0, fontSize:'0.875rem', fontWeight:600, color:'#1F2937', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {isDirectrice ? 'Directrice' : `${prestataire?.prenom || ''} ${prestataire?.nom || ''}`}
                </p>
                <p style={{ margin:0, fontSize:'0.7rem', color:'#9CA3AF', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {isDirectrice ? 'Accès complet' : prestataire?.poste || 'Prestataire'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex:1, overflowY:'auto', padding:'0.75rem' }}>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard' || item.to === '/prestataire'}
                onClick={handleNavClick}
                style={{ display:'block', marginBottom:'2px', textDecoration:'none' }}
              >
                {({ isActive }) => (
                  <div className={isActive ? 'nav-item nav-item-active' : 'nav-item nav-item-inactive'}>
                    <item.icon size={16} style={{ flexShrink:0 }} />
                    <span style={{ flex:1, fontSize:'0.875rem' }}>{item.label}</span>
                    {item.badge && unread > 0 && (
                      <span style={{
                        background: isActive ? '#fff' : '#10B981',
                        color:      isActive ? '#10B981' : '#fff',
                        fontSize:'0.65rem', fontWeight:700,
                        padding:'1px 6px', borderRadius:'999px',
                      }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Déconnexion */}
          <div style={{ padding:'0.75rem', borderTop:'1px solid #F3F4F6' }}>
            <button
              onClick={handleLogout}
              style={{
                display:'flex', alignItems:'center', gap:'0.75rem',
                width:'100%', padding:'0.625rem 0.75rem',
                borderRadius:'0.75rem', border:'none', cursor:'pointer',
                background:'transparent', color:'#EF4444', fontSize:'0.875rem',
                fontWeight:500, transition:'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
              <LogOut size={16} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
