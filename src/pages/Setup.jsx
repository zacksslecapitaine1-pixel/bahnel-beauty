import { useState } from 'react'
import { Sparkles, Database, Key, CheckCircle, AlertCircle, Copy, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { saveCredentials, reinitSupabase, supabase } from '../lib/supabase'

// SQL Schema complet à copier dans Supabase
const SQL_SCHEMA = `-- ============================================================
-- BAHNEL BEAUTY INSTITUTE — Copier dans Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle TEXT UNIQUE NOT NULL, valeur TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO settings (cle, valeur) VALUES
  ('directrice_password','bahnel2025'),
  ('salon_nom','Bahnel Beauty Institute'),
  ('salon_telephone',''),('salon_adresse',''),('salon_email',''),
  ('devise','FCFA'),
  ('permissions_prestataires','{"planning":true,"clients_voir":true,"clients_modifier":false,"ventes":true,"stock_voir":true,"commissions_voir":true}')
ON CONFLICT (cle) DO NOTHING;

CREATE TABLE IF NOT EXISTS prestataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL, prenom TEXT NOT NULL, poste TEXT,
  telephone TEXT, email TEXT, salaire_base NUMERIC(12,2) DEFAULT 0,
  taux_commission NUMERIC(5,2) DEFAULT 0, actif BOOLEAN DEFAULT TRUE,
  photo_url TEXT, date_embauche DATE, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL, prenom TEXT NOT NULL, telephone TEXT, email TEXT,
  adresse TEXT, sexe TEXT CHECK (sexe IN ('Homme','Femme','Autre')),
  date_naissance DATE, photo_url TEXT, points_fidelite INTEGER DEFAULT 0,
  statut TEXT DEFAULT 'Actif' CHECK (statut IN ('Actif','Inactif','Mauvais payeur')),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS categories_prestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL, couleur TEXT DEFAULT '#10B981', icone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO categories_prestations (nom, couleur) VALUES
  ('Coiffure','#8B5CF6'),('Massage & Bien-être','#10B981'),('Onglerie','#EC4899'),
  ('Soins du visage','#F59E0B'),('Soins du corps','#06B6D4'),('Maquillage','#EF4444'),
  ('Épilation à la cire','#F97316'),('Épilation laser','#EF4444'),('Barbering','#6366F1'),('Nettoyage esthétique','#14B8A6')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS prestations_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID REFERENCES categories_prestations(id),
  nom TEXT NOT NULL, description TEXT, prix NUMERIC(12,2) NOT NULL,
  duree_minutes INTEGER DEFAULT 60, actif BOOLEAN DEFAULT TRUE,
  promo_prix NUMERIC(12,2), promo_fin DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS prestations_prestataires (
  prestation_id UUID REFERENCES prestations_catalogue(id) ON DELETE CASCADE,
  prestataire_id UUID REFERENCES prestataires(id) ON DELETE CASCADE,
  PRIMARY KEY (prestation_id, prestataire_id)
);
CREATE TABLE IF NOT EXISTS rendez_vous (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id), prestataire_id UUID REFERENCES prestataires(id),
  prestation_id UUID REFERENCES prestations_catalogue(id),
  date_heure TIMESTAMPTZ NOT NULL, duree_minutes INTEGER DEFAULT 60,
  statut TEXT DEFAULT 'Confirmé' CHECK (statut IN ('Confirmé','En cours','Terminé','Annulé','Absent')),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL, client_id UUID REFERENCES clients(id),
  prestataire_id UUID REFERENCES prestataires(id), rendez_vous_id UUID REFERENCES rendez_vous(id),
  date_emission TIMESTAMPTZ DEFAULT NOW(), montant_total NUMERIC(12,2) DEFAULT 0,
  remise_montant NUMERIC(12,2) DEFAULT 0, montant_net NUMERIC(12,2) DEFAULT 0,
  montant_paye NUMERIC(12,2) DEFAULT 0,
  statut TEXT DEFAULT 'Non payée' CHECK (statut IN ('Non payée','Partiellement payée','Payée','En retard')),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS factures_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID REFERENCES factures(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('prestation','produit')), description TEXT NOT NULL,
  quantite INTEGER DEFAULT 1, prix_unitaire NUMERIC(12,2) NOT NULL, sous_total NUMERIC(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID REFERENCES factures(id) ON DELETE CASCADE,
  montant NUMERIC(12,2) NOT NULL,
  mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('Espèces','Flooz','T-Money','Virement bancaire','Carte bancaire','Autre')),
  reference TEXT, date_paiement TIMESTAMPTZ DEFAULT NOW(), notes TEXT
);
CREATE TABLE IF NOT EXISTS categories_produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO categories_produits (nom) VALUES
  ('Cosmétiques'),('Crèmes & Soins'),('Huiles'),('Shampoings'),
  ('Accessoires'),('Matériel esthétique'),('Produits capillaires'),('Divers')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL, contact TEXT, telephone TEXT, email TEXT,
  specialite TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID REFERENCES categories_produits(id),
  fournisseur_id UUID REFERENCES fournisseurs(id),
  nom TEXT NOT NULL, description TEXT, code_barre TEXT,
  prix_achat NUMERIC(12,2) DEFAULT 0, prix_vente NUMERIC(12,2) NOT NULL,
  stock_actuel INTEGER DEFAULT 0, stock_minimum INTEGER DEFAULT 5,
  date_expiration DATE, photo_url TEXT, actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS stock_mouvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id UUID REFERENCES produits(id),
  type TEXT CHECK (type IN ('entrée','sortie','ajustement')),
  quantite INTEGER NOT NULL, motif TEXT, reference TEXT,
  fournisseur_id UUID REFERENCES fournisseurs(id),
  date_mouvement TIMESTAMPTZ DEFAULT NOW(), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS depenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie TEXT NOT NULL CHECK (categorie IN ('Achat matériel','Achat produits','Salaires','Loyer','Eau & Électricité','Maintenance','Marketing','Transport','Divers')),
  description TEXT NOT NULL, montant NUMERIC(12,2) NOT NULL,
  mode_paiement TEXT CHECK (mode_paiement IN ('Espèces','Flooz','T-Money','Virement bancaire','Carte bancaire','Autre')),
  fournisseur_id UUID REFERENCES fournisseurs(id), reference TEXT,
  recurrente BOOLEAN DEFAULT FALSE, frequence TEXT CHECK (frequence IN ('mensuelle','hebdomadaire','annuelle')),
  date_depense DATE DEFAULT CURRENT_DATE, preuve_url TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id UUID REFERENCES prestataires(id), facture_id UUID REFERENCES factures(id),
  montant_prestation NUMERIC(12,2), taux_commission NUMERIC(5,2), montant_commission NUMERIC(12,2),
  mois INTEGER, annee INTEGER,
  statut TEXT DEFAULT 'En attente' CHECK (statut IN ('En attente','Payée')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL, message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info','alerte','succès','erreur')),
  cible TEXT DEFAULT 'tous' CHECK (cible IN ('tous','directrice','prestataires')),
  lu BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS abonnements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id), nom TEXT NOT NULL, description TEXT,
  prix NUMERIC(12,2), date_debut DATE, date_fin DATE,
  statut TEXT DEFAULT 'Actif' CHECK (statut IN ('Actif','Expiré','Suspendu')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Désactiver RLS pour commencer (activer en production si besoin)
ALTER TABLE settings              DISABLE ROW LEVEL SECURITY;
ALTER TABLE prestataires          DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients               DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories_prestations DISABLE ROW LEVEL SECURITY;
ALTER TABLE prestations_catalogue DISABLE ROW LEVEL SECURITY;
ALTER TABLE prestations_prestataires DISABLE ROW LEVEL SECURITY;
ALTER TABLE rendez_vous           DISABLE ROW LEVEL SECURITY;
ALTER TABLE factures              DISABLE ROW LEVEL SECURITY;
ALTER TABLE factures_lignes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE paiements             DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories_produits   DISABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE produits              DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mouvements      DISABLE ROW LEVEL SECURITY;
ALTER TABLE depenses              DISABLE ROW LEVEL SECURITY;
ALTER TABLE commissions           DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         DISABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements           DISABLE ROW LEVEL SECURITY;

-- Données de test prestataires (modifier selon votre équipe)
INSERT INTO prestataires (nom, prenom, poste, taux_commission) VALUES
  ('Koffi','Aminata','Coiffeuse',15),('Mensah','Fatou','Esthéticienne',12),
  ('Agbeko','Kofi','Masseur',10),('Dossou','Abla','Onglerie',15),('Tete','Edem','Barbier',10)
ON CONFLICT DO NOTHING;`

export default function Setup({ onComplete }) {
  const [step, setStep] = useState(1)  // 1=SQL, 2=Credentials
  const [url, setUrl]   = useState('')
  const [key, setKey]   = useState('')
  const [testing, setTesting]   = useState(false)
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const [sqlOpen, setSqlOpen]   = useState(false)

  const copierSQL = () => {
    navigator.clipboard.writeText(SQL_SCHEMA).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  const testerEtSauvegarder = async () => {
    setError('')
    if (!url.trim().startsWith('https://')) {
      setError("L'URL Supabase doit commencer par https://")
      return
    }
    if (url.includes('placeholder')) {
      setError("Veuillez saisir votre vraie URL Supabase.")
      return
    }
    if (key.trim().length < 20) {
      setError("La clé API semble incorrecte (trop courte).")
      return
    }
    setTesting(true)
    try {
      // Test de connexion réel
      const { createClient } = await import('@supabase/supabase-js')
      const testClient = createClient(url.trim(), key.trim(), { auth: { persistSession: false } })
      const { error: testError } = await testClient.from('settings').select('cle').limit(1)
      if (testError) {
        if (testError.message.includes('relation "settings" does not exist')) {
          setError("Connexion réussie mais les tables n'existent pas encore. Avez-vous exécuté le SQL à l'étape 1 ?")
        } else {
          setError(`Erreur de connexion : ${testError.message}`)
        }
        setTesting(false)
        return
      }
      // Succès
      saveCredentials(url.trim(), key.trim())
      reinitSupabase()
      onComplete()
    } catch (e) {
      setError(`Erreur : ${e.message}. Vérifiez votre URL et votre clé API.`)
    }
    setTesting(false)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 50%, #f0fdf4 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '1rem',
    }}>
      {/* Barre verte */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'4px', background:'linear-gradient(90deg,#34D399,#10B981,#34D399)' }} />

      <div style={{ width:'100%', maxWidth:'600px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'18px', background:'#10B981', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', boxShadow:'0 4px 20px -4px rgba(16,185,129,0.5)' }}>
            <Sparkles size={30} color="#fff" />
          </div>
          <h1 style={{ margin:0, fontFamily:'Cormorant Garamond,serif', fontSize:'1.875rem', color:'#111827' }}>
            Bahnel <span style={{ color:'#10B981', fontWeight:600 }}>Beauty Institute</span>
          </h1>
          <p style={{ margin:'0.5rem 0 0', fontSize:'0.875rem', color:'#6B7280' }}>
            Configuration initiale — à faire une seule fois
          </p>
        </div>

        {/* Indicateur d'étapes */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', marginBottom:'1.5rem' }}>
          {[1,2].map(s => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{
                width:'32px', height:'32px', borderRadius:'50%',
                background: step >= s ? '#10B981' : '#E5E7EB',
                color: step >= s ? '#fff' : '#9CA3AF',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'0.875rem', fontWeight:600, transition:'all 0.3s',
              }}>{s}</div>
              {s < 2 && <div style={{ width:'60px', height:'2px', background: step > s ? '#10B981' : '#E5E7EB', transition:'background 0.3s' }} />}
            </div>
          ))}
        </div>

        {/* ===== ÉTAPE 1 : SQL ===== */}
        {step === 1 && (
          <div className="card" style={{ animation:'slideUp 0.4s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Database size={20} color="#10B981" />
              </div>
              <div>
                <h2 style={{ margin:0, fontFamily:'Cormorant Garamond,serif', fontSize:'1.25rem', color:'#111827' }}>
                  Étape 1 — Créer la base de données
                </h2>
                <p style={{ margin:0, fontSize:'0.75rem', color:'#9CA3AF' }}>Exécuter le SQL dans Supabase</p>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ background:'#F9FAFB', borderRadius:'0.75rem', padding:'1rem', marginBottom:'1rem' }}>
              <p style={{ margin:'0 0 0.75rem', fontSize:'0.875rem', fontWeight:600, color:'#374151' }}>Instructions :</p>
              {[
                { n:1, text:'Allez sur', link:'https://supabase.com', label:'supabase.com' },
                { n:2, text:'Créez un compte gratuit (ou connectez-vous)', link:null },
                { n:3, text:'Créez un nouveau projet', link:null },
                { n:4, text:'Dans le menu gauche → SQL Editor', link:null },
                { n:5, text:'Copiez le SQL ci-dessous et cliquez Run', link:null },
              ].map(step => (
                <div key={step.n} style={{ display:'flex', gap:'0.625rem', marginBottom:'0.5rem', alignItems:'flex-start' }}>
                  <span style={{ width:'20px', height:'20px', borderRadius:'50%', background:'#10B981', color:'#fff', fontSize:'0.65rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:'1px' }}>{step.n}</span>
                  <p style={{ margin:0, fontSize:'0.8rem', color:'#4B5563' }}>
                    {step.text}{' '}
                    {step.link && <a href={step.link} target="_blank" rel="noreferrer" style={{ color:'#10B981', textDecoration:'none', fontWeight:600 }}>{step.label} ↗</a>}
                  </p>
                </div>
              ))}
            </div>

            {/* SQL Bloc */}
            <div style={{ border:'1.5px solid #E5E7EB', borderRadius:'0.75rem', overflow:'hidden', marginBottom:'1rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem 1rem', background:'#1F2937', borderBottom:'1px solid #374151' }}>
                <span style={{ color:'#9CA3AF', fontSize:'0.75rem', fontFamily:'monospace' }}>SQL — À copier dans Supabase SQL Editor</span>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button onClick={() => setSqlOpen(!sqlOpen)} style={{ display:'flex', alignItems:'center', gap:'0.375rem', background:'#374151', border:'none', color:'#D1D5DB', fontSize:'0.75rem', padding:'0.25rem 0.625rem', borderRadius:'6px', cursor:'pointer' }}>
                    {sqlOpen ? <><ChevronUp size={12} /> Réduire</> : <><ChevronDown size={12} /> Voir le SQL</>}
                  </button>
                  <button onClick={copierSQL} style={{ display:'flex', alignItems:'center', gap:'0.375rem', background: copied ? '#10B981' : '#3B82F6', border:'none', color:'#fff', fontSize:'0.75rem', padding:'0.25rem 0.625rem', borderRadius:'6px', cursor:'pointer' }}>
                    {copied ? <><CheckCircle size={12} /> Copié !</> : <><Copy size={12} /> Copier</>}
                  </button>
                </div>
              </div>
              {sqlOpen && (
                <pre style={{ margin:0, padding:'1rem', background:'#111827', color:'#86EFAC', fontSize:'0.65rem', lineHeight:1.6, maxHeight:'250px', overflowY:'auto', fontFamily:'monospace', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                  {SQL_SCHEMA}
                </pre>
              )}
              {!sqlOpen && (
                <div style={{ padding:'0.75rem 1rem', background:'#111827', color:'#4B5563', fontSize:'0.75rem', fontFamily:'monospace' }}>
                  {SQL_SCHEMA.split('\n').length} lignes de SQL · Cliquez "Voir le SQL" ou "Copier"
                </div>
              )}
            </div>

            <button onClick={() => setStep(2)} className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.875rem' }}>
              SQL exécuté avec succès → Étape suivante
            </button>
          </div>
        )}

        {/* ===== ÉTAPE 2 : CREDENTIALS ===== */}
        {step === 2 && (
          <div className="card" style={{ animation:'slideUp 0.4s ease' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1rem' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Key size={20} color="#10B981" />
              </div>
              <div>
                <h2 style={{ margin:0, fontFamily:'Cormorant Garamond,serif', fontSize:'1.25rem', color:'#111827' }}>
                  Étape 2 — Connecter Supabase
                </h2>
                <p style={{ margin:0, fontSize:'0.75rem', color:'#9CA3AF' }}>Entrez vos clés API Supabase</p>
              </div>
            </div>

            {/* Où trouver les clés */}
            <div style={{ background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:'0.75rem', padding:'0.875rem', marginBottom:'1.25rem' }}>
              <p style={{ margin:'0 0 0.5rem', fontSize:'0.8rem', fontWeight:600, color:'#1E40AF' }}>📍 Où trouver vos clés API ?</p>
              <p style={{ margin:0, fontSize:'0.75rem', color:'#1E40AF', lineHeight:1.5 }}>
                Dans votre projet Supabase → <strong>Settings</strong> (icône engrenage) → <strong>API</strong><br />
                Vous y trouverez votre <strong>Project URL</strong> et votre <strong>anon public key</strong>
              </p>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'1rem' }}>
              <div>
                <label className="label">URL du projet Supabase</label>
                <input
                  className="input"
                  type="url"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError('') }}
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                />
              </div>
              <div>
                <label className="label">Clé API publique (anon key)</label>
                <input
                  className="input"
                  type="text"
                  value={key}
                  onChange={e => { setKey(e.target.value); setError('') }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  style={{ fontFamily:'monospace', fontSize:'0.75rem' }}
                />
              </div>
            </div>

            {error && (
              <div style={{ display:'flex', alignItems:'flex-start', gap:'0.625rem', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:'0.75rem', padding:'0.75rem 1rem', marginBottom:'1rem' }}>
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink:0, marginTop:'1px' }} />
                <span style={{ fontSize:'0.8rem', color:'#DC2626', lineHeight:1.4 }}>{error}</span>
              </div>
            )}

            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex:'0 0 auto' }}>
                ← Retour
              </button>
              <button
                onClick={testerEtSauvegarder}
                disabled={testing || !url || !key}
                className="btn-primary"
                style={{ flex:1, justifyContent:'center', padding:'0.875rem' }}
              >
                {testing
                  ? <><Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} /> Test de connexion…</>
                  : <><CheckCircle size={16} /> Tester et démarrer</>
                }
              </button>
            </div>

            <p style={{ margin:'1rem 0 0', fontSize:'0.7rem', color:'#9CA3AF', textAlign:'center' }}>
              Ces informations sont sauvegardées uniquement dans votre navigateur.<br />
              Elles ne quittent jamais votre appareil.
            </p>
          </div>
        )}

        <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'0.7rem', color:'#D1D5DB' }}>
          Bahnel Beauty Institute © {new Date().getFullYear()} · Développé par{' '}
          <a href="https://dev-zak.netlify.app" target="_blank" rel="noreferrer" style={{ color:'#10B981', textDecoration:'none' }}>Dev.zak</a>
        </p>
      </div>
    </div>
  )
}
