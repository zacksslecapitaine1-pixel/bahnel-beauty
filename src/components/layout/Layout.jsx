import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './Sidebar'
import Navbar  from './Navbar'
import { useAuthStore, useAppStore } from '../../store'

export default function Layout() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { sidebarOpen }     = useAppStore()

  useEffect(() => {
    if (!isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null

  return (
    <div style={{ minHeight:'100dvh', background:'#F9FAFB', display:'flex' }}>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background:'#1F2937', color:'#F9FAFB',
            borderRadius:'12px', fontSize:'14px',
            fontFamily:"'DM Sans', sans-serif",
            maxWidth:'90vw',
          },
          success: { iconTheme:{ primary:'#10B981', secondary:'#fff' } },
          error:   { iconTheme:{ primary:'#EF4444', secondary:'#fff' } },
        }}
      />

      <Sidebar />

      {/* Contenu principal — décalé de 256px (w-64) sur desktop quand sidebar ouverte */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        overflowX: 'hidden',
        transition: 'margin-left 0.3s ease',
      }}
        className={sidebarOpen ? 'lg:ml-64' : ''}
      >
        <Navbar />
        <main style={{ flex:1, padding:'1rem', overflowX:'hidden' }}
          className="sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
