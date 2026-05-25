import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Sparkles, Crown, Users, AlertCircle, Loader2, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../store'
import { db } from '../lib/supabase'

const BG = { minHeight:'100dvh', background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'1rem', position:'relative', overflow:'hidden' }
const TOPBAR = { position:'absolute', top:0, left:0, right:0, height:'4px', background:'linear-gradient(90deg,#34D399,#10B981,#34D399)' }

export default function Landing() {
  const navigate = useNavigate()
  const { loginDirectrice, loginPrestataire, isAuthenticated, role } = useAuthStore()
  const [view, setView]         = useState('home')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [prestataires, setPrestataires] = useState([])
  const [loadingP, setLoadingP] = useState(false)
  // Étape mot de passe prestataire
  const [selectedPrestataire, setSelectedPrestataire] = useState(null)
  const [pwdPrest, setPwdPrest] = useState('')
  const [showPwdPrest, setShowPwdPrest] = useState(false)
  const [errorPrest, setErrorPrest] = useState('')
  const [loadingPrest, setLoadingPrest] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate(role === 'directrice' ? '/dashboard' : '/prestataire', { replace: true })
    }
  }, [isAuthenticated, role, navigate])

  useEffect(() => {
    if (view === 'prestataire') {
      setLoadingP(true)
      db.get('prestataires', { eq:{ actif:true }, order:'prenom', asc:true })
        .then(d => setPrestataires(d || []))
        .catch(() => setPrestataires([]))
        .finally(() => setLoadingP(false))
    }
  }, [view])

  const handleDirectrice = async (e) => {
    e.preventDefault()
    if (!password.trim()) { setError('Veuillez saisir votre mot de passe.'); return }
    setLoading(true); setError('')
    const r = await loginDirectrice(password)
    setLoading(false)
    if (r.success) navigate('/dashboard')
    else setError(r.message)
  }

  // Étape 1 : sélection de la prestataire → ouvre la saisie du mot de passe
  const handleSelectPrestataire = (p) => {
    setSelectedPrestataire(p)
    setPwdPrest('')
    setErrorPrest('')
    setShowPwdPrest(false)
  }

  // Étape 2 : validation du mot de passe prestataire
  const handlePwdPrestataire = async (e) => {
    e.preventDefault()
    if (!pwdPrest.trim()) { setErrorPrest('Veuillez saisir votre mot de passe.'); return }
    setLoadingPrest(true); setErrorPrest('')
    try {
      // Vérification du mot de passe (stocké en clair ou hashé côté Supabase)
      // On compare avec password_hash stocké dans la table prestataires
      const data = await db.get('prestataires', {
        select: 'id, password_hash',
        eq: { id: selectedPrestataire.id },
        single: true,
      })
      const storedPwd = data?.password_hash
      if (!storedPwd) {
        // Pas encore de mot de passe défini → on autorise avec n'importe quel mot de passe
        // et on affiche un avertissement (la directrice doit configurer un MDP)
        setErrorPrest('Aucun mot de passe configuré pour cette prestataire. Contactez la directrice.')
        setLoadingPrest(false)
        return
      }
      if (pwdPrest !== storedPwd) {
        setErrorPrest('Mot de passe incorrect.')
        setLoadingPrest(false)
        return
      }
      // Mise à jour last_login
      await db.update('prestataires', selectedPrestataire.id, { last_login: new Date().toISOString() }).catch(() => {})
      await loginPrestataire(selectedPrestataire)
      navigate('/prestataire')
    } catch (e) {
      setErrorPrest('Erreur de connexion. Réessayez.')
    } finally {
      setLoadingPrest(false)
    }
  }

  const goBack = () => { setView('home'); setPassword(''); setError(''); setSelectedPrestataire(null) }
  const goBackToList = () => { setSelectedPrestataire(null); setPwdPrest(''); setErrorPrest('') }

  // ===== HOME =====
  if (view === 'home') return (
    <div style={BG}>
      <div style={TOPBAR} />
      <div style={{ position:'absolute', top:'-100px', left:'-100px', width:'300px', height:'300px', background:'#F0FDF4', borderRadius:'50%', opacity:0.6 }} />
      <div style={{ position:'absolute', bottom:'-80px', right:'-80px', width:'250px', height:'250px', background:'#F0FDF4', borderRadius:'50%', opacity:0.4 }} />

      <div style={{ position:'relative', zIndex:1, textAlign:'center', width:'100%', maxWidth:'500px', animation:'slideUp 0.5s ease forwards' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'18px', background:'#10B981', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', boxShadow:'0 4px 20px -4px rgba(16,185,129,0.5)' }}>
          <Sparkles size={30} color="#fff" />
        </div>
        <h1 style={{ margin:'0', fontSize:'clamp(2rem,8vw,3.5rem)', fontFamily:'var(--font-display)', fontWeight:300, color:'#111827', lineHeight:1.1 }}>
          Bahnel <span style={{ fontWeight:600, color:'#10B981' }}>Beauty</span>
        </h1>
        <p style={{ margin:'4px 0 0', fontFamily:'var(--font-display)', fontStyle:'italic', color:'#9CA3AF', fontSize:'1.1rem' }}>Institute</p>
        <p style={{ margin:'0.75rem 0 0', fontSize:'0.7rem', color:'#D1D5DB', letterSpacing:'0.15em', textTransform:'uppercase' }}>Logiciel de Gestion</p>

        <div style={{ width:'60px', height:'2px', background:'#D1FAE5', margin:'1.5rem auto' }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem', marginBottom:'2rem' }}>
          <button onClick={() => setView('directrice')} style={{
            background:'#111827', color:'#fff', border:'none', borderRadius:'1.25rem',
            padding:'1.75rem 1rem', cursor:'pointer', textAlign:'left',
            transition:'all 0.3s', position:'relative', overflow:'hidden',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#1F2937'; e.currentTarget.style.transform='translateY(-3px)' }}
          onMouseLeave={e => { e.currentTarget.style.background='#111827'; e.currentTarget.style.transform='translateY(0)' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
              <Crown size={22} color="#fff" />
            </div>
            <p style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:'clamp(0.9rem,3vw,1.1rem)', fontWeight:600 }}>Espace Directrice</p>
            <p style={{ margin:0, fontSize:'0.7rem', color:'rgba(255,255,255,0.5)', lineHeight:1.4 }}>Accès complet</p>
          </button>

          <button onClick={() => setView('prestataire')} style={{
            background:'#fff', color:'#111827', border:'2px solid #E5E7EB',
            borderRadius:'1.25rem', padding:'1.75rem 1rem', cursor:'pointer',
            textAlign:'left', transition:'all 0.3s', position:'relative', overflow:'hidden',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#10B981'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#10B981'; e.currentTarget.style.transform='translateY(-3px)' }}
          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#111827'; e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.transform='translateY(0)' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
              <Users size={22} color="#10B981" />
            </div>
            <p style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:'clamp(0.9rem,3vw,1.1rem)', fontWeight:600 }}>Prestataires</p>
            <p style={{ margin:0, fontSize:'0.7rem', color:'#9CA3AF', lineHeight:1.4 }}>Planning & ventes</p>
          </button>
        </div>

        <p style={{ margin:0, fontSize:'0.7rem', color:'#D1D5DB' }}>
          © {new Date().getFullYear()} Bahnel Beauty Institute
        </p>
      </div>
    </div>
  )

  // ===== LOGIN DIRECTRICE =====
  if (view === 'directrice') return (
    <div style={BG}>
      <div style={TOPBAR} />
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'400px', animation:'slideUp 0.4s ease forwards' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'16px', background:'#111827', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>
            <Crown size={26} color="#fff" />
          </div>
          <h1 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:'1.75rem', color:'#111827' }}>Espace Directrice</h1>
          <p style={{ margin:0, fontSize:'0.875rem', color:'#9CA3AF' }}>Identifiez-vous pour continuer</p>
        </div>

        <div className="card">
          <form onSubmit={handleDirectrice}>
            <div className="label" style={{ marginBottom:'0.5rem' }}>Mot de passe</div>
            <div style={{ position:'relative', marginBottom:'1rem' }}>
              <Lock size={15} style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                className="input"
                style={{ paddingLeft:'2.5rem', paddingRight:'2.75rem' }}
                autoFocus
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position:'absolute', right:'0.875rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'0.75rem', padding:'0.75rem 1rem', marginBottom:'1rem' }}>
                <AlertCircle size={15} color="#DC2626" style={{ flexShrink:0 }} />
                <span style={{ fontSize:'0.875rem', color:'#DC2626' }}>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.875rem' }}>
              {loading ? <Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> : <Lock size={16} />}
              {loading ? 'Vérification…' : 'Accéder au tableau de bord'}
            </button>
          </form>
        </div>

        <button onClick={goBack} style={{ display:'block', margin:'1rem auto 0', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:'0.875rem' }}>
          ← Retour
        </button>
      </div>
    </div>
  )

  // ===== SAISIE MOT DE PASSE PRESTATAIRE =====
  if (view === 'prestataire' && selectedPrestataire) return (
    <div style={BG}>
      <div style={TOPBAR} />
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'400px', animation:'slideUp 0.4s ease forwards' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          {/* Avatar */}
          <div style={{ width:'72px', height:'72px', borderRadius:'22px', background:'linear-gradient(135deg,#D1FAE5,#A7F3D0)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', fontSize:'1.5rem', fontFamily:'var(--font-display)', fontWeight:700, color:'#065f46' }}>
            {selectedPrestataire.prenom?.[0]}{selectedPrestataire.nom?.[0]}
          </div>
          <h1 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:'1.75rem', color:'#111827' }}>
            {selectedPrestataire.prenom} {selectedPrestataire.nom}
          </h1>
          <p style={{ margin:0, fontSize:'0.875rem', color:'#9CA3AF' }}>{selectedPrestataire.poste || 'Prestataire'}</p>
        </div>

        <div className="card">
          <form onSubmit={handlePwdPrestataire}>
            <div className="label" style={{ marginBottom:'0.5rem' }}>Mot de passe</div>
            <div style={{ position:'relative', marginBottom:'1rem' }}>
              <Lock size={15} style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
              <input
                type={showPwdPrest ? 'text' : 'password'}
                value={pwdPrest}
                onChange={e => { setPwdPrest(e.target.value); setErrorPrest('') }}
                placeholder="••••••••"
                className="input"
                style={{ paddingLeft:'2.5rem', paddingRight:'2.75rem' }}
                autoFocus
              />
              <button type="button" onClick={() => setShowPwdPrest(!showPwdPrest)}
                style={{ position:'absolute', right:'0.875rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                {showPwdPrest ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {errorPrest && (
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'0.75rem', padding:'0.75rem 1rem', marginBottom:'1rem' }}>
                <AlertCircle size={15} color="#DC2626" style={{ flexShrink:0 }} />
                <span style={{ fontSize:'0.875rem', color:'#DC2626' }}>{errorPrest}</span>
              </div>
            )}

            <button type="submit" disabled={loadingPrest} className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.875rem' }}>
              {loadingPrest ? <Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> : <Lock size={16} />}
              {loadingPrest ? 'Vérification…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <button onClick={goBackToList} style={{ display:'flex', alignItems:'center', gap:'0.35rem', margin:'1rem auto 0', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:'0.875rem' }}>
          <ChevronLeft size={14} /> Changer de prestataire
        </button>
      </div>
    </div>
  )

  // ===== SÉLECTION PRESTATAIRE =====
  return (
    <div style={BG}>
      <div style={TOPBAR} />
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'500px', animation:'slideUp 0.4s ease forwards' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'16px', background:'#10B981', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', boxShadow:'0 4px 20px -4px rgba(16,185,129,0.5)' }}>
            <Users size={26} color="#fff" />
          </div>
          <h1 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:'1.75rem', color:'#111827' }}>Espace Prestataires</h1>
          <p style={{ margin:0, fontSize:'0.875rem', color:'#9CA3AF' }}>Sélectionnez votre profil</p>
        </div>

        <div className="card">
          {loadingP ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'3rem 0' }}>
              <div className="spinner" />
            </div>
          ) : prestataires.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
              <Users size={40} color="#D1D5DB" style={{ marginBottom:'0.75rem' }} />
              <p style={{ color:'#9CA3AF', fontSize:'0.875rem', margin:0 }}>Aucun prestataire configuré.<br />Contactez la directrice.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'0.75rem' }}>
              {prestataires.map(p => (
                <button key={p.id} onClick={() => handleSelectPrestataire(p)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:'0.625rem',
                    padding:'1rem 0.5rem', borderRadius:'0.875rem',
                    border:'2px solid #F3F4F6', background:'#fff',
                    cursor:'pointer', transition:'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#10B981'; e.currentTarget.style.background='#F0FDF4'; e.currentTarget.style.transform='translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#F3F4F6'; e.currentTarget.style.background='#fff'; e.currentTarget.style.transform='translateY(0)' }}>
                  <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'linear-gradient(135deg,#D1FAE5,#A7F3D0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.125rem', fontFamily:'var(--font-display)', fontWeight:600, color:'#065f46' }}>
                    {p.prenom?.[0]}{p.nom?.[0]}
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ margin:0, fontSize:'0.8rem', fontWeight:600, color:'#1F2937', lineHeight:1.2 }}>{p.prenom}</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.65rem', color:'#9CA3AF' }}>{p.poste || 'Prestataire'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={goBack} style={{ display:'block', margin:'1rem auto 0', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:'0.875rem' }}>
          ← Retour
        </button>
      </div>
    </div>
  )
}
