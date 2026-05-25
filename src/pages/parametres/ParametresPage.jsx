import { useState, useEffect, useCallback } from 'react'
import { Settings, Lock, Eye, EyeOff, Save, Building, ToggleLeft, ToggleRight, Shield, CheckCircle, Database, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { db, clearCredentials } from '../../lib/supabase'
import { useAuthStore } from '../../store'
import { FormGroup } from '../../components/ui'

const MODULES_PERM = [
  { key: 'planning',         label: 'Voir le planning',        desc: 'Accès au calendrier des rendez-vous'  },
  { key: 'clients_voir',     label: 'Voir les clients',        desc: 'Consultation des fiches clients'      },
  { key: 'clients_modifier', label: 'Modifier les clients',    desc: 'Création et modification des fiches'  },
  { key: 'ventes',           label: 'Enregistrer des ventes',  desc: 'Création de factures et encaissements'},
  { key: 'stock_voir',       label: 'Voir le stock',           desc: 'Consultation des produits et stocks'  },
  { key: 'commissions_voir', label: 'Voir leurs commissions',  desc: 'Accès aux statistiques personnelles'  },
]

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-cendre-100">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        <h2 className="text-lg font-display font-semibold text-cendre-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function ParametresPage() {
  const { updatePermissions } = useAuthStore()

  // Infos salon
  const [salon, setSalon] = useState({ nom: '', telephone: '', adresse: '', email: '' })
  const [savingSalon, setSavingSalon] = useState(false)
  const [salonSaved, setSalonSaved]   = useState(false)

  // Mot de passe
  const [pwd, setPwd]         = useState({ actuel: '', nouveau: '', confirme: '' })
  const [showPwd, setShowPwd] = useState({ actuel: false, nouveau: false, confirme: false })
  const [savingPwd, setSavingPwd]   = useState(false)

  // Permissions prestataires
  const [perms, setPerms]     = useState({
    planning: true, clients_voir: true, clients_modifier: false,
    ventes: true, stock_voir: true, commissions_voir: true,
  })
  const [savingPerms, setSavingPerms] = useState(false)
  const [permsSaved, setPermsSaved]   = useState(false)

  // Charger les paramètres
  useEffect(() => {
    const charger = async () => {
      try {
        const [nom, tel, adr, email, permsStr] = await Promise.all([
          db.getSetting('salon_nom'),
          db.getSetting('salon_telephone'),
          db.getSetting('salon_adresse'),
          db.getSetting('salon_email'),
          db.getSetting('permissions_prestataires'),
        ])
        setSalon({ nom: nom || '', telephone: tel || '', adresse: adr || '', email: email || '' })
        if (permsStr) {
          try { setPerms(JSON.parse(permsStr)) } catch {}
        }
      } catch {}
    }
    charger()
  }, [])

  // Sauvegarder salon
  const saveSalon = async () => {
    setSavingSalon(true)
    try {
      await Promise.all([
        db.setSetting('salon_nom',       salon.nom),
        db.setSetting('salon_telephone', salon.telephone),
        db.setSetting('salon_adresse',   salon.adresse),
        db.setSetting('salon_email',     salon.email),
      ])
      setSalonSaved(true)
      setTimeout(() => setSalonSaved(false), 3000)
      toast.success('Informations du salon sauvegardées !')
    } catch { toast.error('Erreur de sauvegarde.') }
    finally { setSavingSalon(false) }
  }

  // Changer mot de passe
  const changePwd = async () => {
    if (!pwd.actuel || !pwd.nouveau || !pwd.confirme) { toast.error('Remplissez tous les champs.'); return }
    if (pwd.nouveau !== pwd.confirme) { toast.error('Les nouveaux mots de passe ne correspondent pas.'); return }
    if (pwd.nouveau.length < 4) { toast.error('Le mot de passe doit comporter au moins 4 caractères.'); return }
    setSavingPwd(true)
    try {
      const actuel = await db.getSetting('directrice_password')
      if (pwd.actuel !== (actuel || 'bahnel2025')) {
        toast.error('Mot de passe actuel incorrect.')
        return
      }
      await db.setSetting('directrice_password', pwd.nouveau)
      setPwd({ actuel: '', nouveau: '', confirme: '' })
      toast.success('Mot de passe modifié avec succès !')
    } catch { toast.error('Erreur lors du changement.') }
    finally { setSavingPwd(false) }
  }

  // Sauvegarder permissions
  const savePerms = async () => {
    setSavingPerms(true)
    try {
      await db.setSetting('permissions_prestataires', JSON.stringify(perms))
      updatePermissions(perms)
      setPermsSaved(true)
      setTimeout(() => setPermsSaved(false), 3000)
      toast.success('Permissions mises à jour !')
    } catch { toast.error('Erreur de sauvegarde.') }
    finally { setSavingPerms(false) }
  }

  const togglePerm = (key) => setPerms(p => ({ ...p, [key]: !p[key] }))
  const setP = (k, v) => setSalon(s => ({ ...s, [k]: v }))
  const setPwdF = (k, v) => setPwd(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-600" /> Paramètres
        </h1>
        <p className="text-sm text-cendre-400 mt-0.5">Configuration générale du logiciel</p>
      </div>

      {/* Informations du salon */}
      <SectionCard title="Informations du Salon" icon={Building}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormGroup label="Nom de l'établissement">
              <input className="input" value={salon.nom} onChange={e => setP('nom', e.target.value)} placeholder="Bahnel Beauty Institute" />
            </FormGroup>
          </div>
          <FormGroup label="Téléphone">
            <input className="input" value={salon.telephone} onChange={e => setP('telephone', e.target.value)} placeholder="+228 00 00 00 00" />
          </FormGroup>
          <FormGroup label="Email">
            <input className="input" type="email" value={salon.email} onChange={e => setP('email', e.target.value)} placeholder="contact@bahnel.com" />
          </FormGroup>
          <div className="sm:col-span-2">
            <FormGroup label="Adresse">
              <input className="input" value={salon.adresse} onChange={e => setP('adresse', e.target.value)} placeholder="Lomé, Togo" />
            </FormGroup>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={saveSalon} disabled={savingSalon} className={`btn-primary ${salonSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
            {salonSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {salonSaved ? 'Sauvegardé !' : savingSalon ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </SectionCard>

      {/* Mot de passe */}
      <SectionCard title="Sécurité — Mot de Passe Directrice" icon={Lock}>
        <div className="space-y-4">
          {[
            { key: 'actuel',   label: 'Mot de passe actuel'   },
            { key: 'nouveau',  label: 'Nouveau mot de passe'  },
            { key: 'confirme', label: 'Confirmer le nouveau'  },
          ].map(({ key, label }) => (
            <FormGroup key={key} label={label}>
              <div className="relative">
                <input
                  type={showPwd[key] ? 'text' : 'password'}
                  className="input pr-11"
                  value={pwd[key]}
                  onChange={e => setPwdF(key, e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button"
                  onClick={() => setShowPwd(s => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cendre-400 hover:text-cendre-600">
                  {showPwd[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormGroup>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
          <strong>💡 Conseil :</strong> Choisissez un mot de passe d'au moins 8 caractères, mélange de lettres et chiffres.
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={changePwd} disabled={savingPwd} className="btn-primary">
            <Lock className="w-4 h-4" />
            {savingPwd ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </div>
      </SectionCard>

      {/* Permissions prestataires */}
      <SectionCard title="Permissions des Prestataires" icon={Shield}>
        <p className="text-sm text-cendre-500 -mt-2">
          Contrôlez les fonctionnalités accessibles aux prestataires dans leur espace.
        </p>
        <div className="space-y-3">
          {MODULES_PERM.map(m => (
            <div key={m.key}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${perms[m.key] ? 'border-primary-200 bg-primary-50' : 'border-cendre-100 bg-white hover:border-cendre-200'}`}
              onClick={() => togglePerm(m.key)}>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${perms[m.key] ? 'text-primary-800' : 'text-cendre-700'}`}>{m.label}</p>
                <p className="text-xs text-cendre-400 mt-0.5">{m.desc}</p>
              </div>
              <div className={`relative inline-flex h-6 w-11 rounded-full transition-colors shrink-0 ${perms[m.key] ? 'bg-primary-600' : 'bg-cendre-300'}`}>
                <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-1 ${perms[m.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Modules jamais accessibles */}
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Toujours bloqués pour les prestataires
          </p>
          <div className="space-y-1 text-xs text-red-600">
            <p>🔒 Gestion financière & dépenses</p>
            <p>🔒 Rapports & statistiques globales</p>
            <p>🔒 Paramètres du logiciel</p>
            <p>🔒 Gestion des prestataires</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={savePerms} disabled={savingPerms} className={`btn-primary ${permsSaved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
            {permsSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {permsSaved ? 'Sauvegardé !' : savingPerms ? 'Sauvegarde…' : 'Sauvegarder les permissions'}
          </button>
        </div>
      </SectionCard>

      {/* Reset configuration Supabase */}
      <SectionCard title="Connexion Supabase" icon={Database}>
        <p className="text-sm text-cendre-500">
          Si vous souhaitez changer de base de données Supabase ou reconfigurer la connexion,
          vous pouvez réinitialiser la configuration. Le logiciel affichera à nouveau la page de configuration.
        </p>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              if (window.confirm('Êtes-vous sûr ? Vous devrez reconfigurer la connexion Supabase.')) {
                clearCredentials()
                window.location.reload()
              }
            }}
            className="btn-danger"
          >
            <LogOut className="w-4 h-4" /> Réinitialiser la configuration
          </button>
        </div>
      </SectionCard>

      {/* Version */}
      <div className="text-center text-xs text-cendre-300 py-4">
        Bahnel Beauty Institute — Logiciel de Gestion v1.0 · Développé par <a href="https://dev-zak.netlify.app" target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">Dev.zak</a>
      </div>
    </div>
  )
}
