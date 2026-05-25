-- ============================================================
-- BAHNEL BEAUTY INSTITUTE — SCHÉMA SUPABASE COMPLET
-- Copier-coller dans : Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. PARAMÈTRES GÉNÉRAUX
CREATE TABLE IF NOT EXISTS settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle        TEXT UNIQUE NOT NULL,
  valeur     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (cle, valeur) VALUES
  ('directrice_password',      'bahnel2025'),
  ('salon_nom',                'Bahnel Beauty Institute'),
  ('salon_telephone',          ''),
  ('salon_adresse',            ''),
  ('salon_email',              ''),
  ('devise',                   'FCFA'),
  ('points_par_prestation',    '10'),
  ('permissions_prestataires', '{"planning":true,"clients_voir":true,"clients_modifier":false,"ventes":true,"stock_voir":true,"commissions_voir":true}')
ON CONFLICT (cle) DO NOTHING;

-- 2. PRESTATAIRES
CREATE TABLE IF NOT EXISTS prestataires (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom            TEXT NOT NULL,
  prenom         TEXT NOT NULL,
  poste          TEXT,
  telephone      TEXT,
  email          TEXT,
  salaire_base   NUMERIC(12,2) DEFAULT 0,
  taux_commission NUMERIC(5,2) DEFAULT 0,
  actif          BOOLEAN DEFAULT TRUE,
  photo_url      TEXT,
  date_embauche  DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom              TEXT NOT NULL,
  prenom           TEXT NOT NULL,
  telephone        TEXT,
  email            TEXT,
  adresse          TEXT,
  sexe             TEXT CHECK (sexe IN ('Homme','Femme','Autre')),
  date_naissance   DATE,
  photo_url        TEXT,
  points_fidelite  INTEGER DEFAULT 0,
  statut           TEXT DEFAULT 'Actif' CHECK (statut IN ('Actif','Inactif','Mauvais payeur')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATÉGORIES DE PRESTATIONS
CREATE TABLE IF NOT EXISTS categories_prestations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        TEXT NOT NULL,
  couleur    TEXT DEFAULT '#10B981',
  icone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories_prestations (nom, couleur) VALUES
  ('Coiffure',            '#8B5CF6'),
  ('Massage & Bien-être', '#10B981'),
  ('Onglerie',            '#EC4899'),
  ('Soins du visage',     '#F59E0B'),
  ('Soins du corps',      '#06B6D4'),
  ('Maquillage',          '#EF4444'),
  ('Épilation',           '#F97316'),
  ('Barbering',           '#6366F1'),
  ('Nettoyage esthétique','#14B8A6')
ON CONFLICT DO NOTHING;

-- 5. CATALOGUE DES PRESTATIONS
CREATE TABLE IF NOT EXISTS prestations_catalogue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id UUID REFERENCES categories_prestations(id),
  nom          TEXT NOT NULL,
  description  TEXT,
  prix         NUMERIC(12,2) NOT NULL,
  duree_minutes INTEGER DEFAULT 60,
  actif        BOOLEAN DEFAULT TRUE,
  promo_prix   NUMERIC(12,2),
  promo_fin    DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRESTATAIRES QUALIFIÉS PAR PRESTATION
CREATE TABLE IF NOT EXISTS prestations_prestataires (
  prestation_id  UUID REFERENCES prestations_catalogue(id) ON DELETE CASCADE,
  prestataire_id UUID REFERENCES prestataires(id) ON DELETE CASCADE,
  PRIMARY KEY (prestation_id, prestataire_id)
);

-- 7. RENDEZ-VOUS
CREATE TABLE IF NOT EXISTS rendez_vous (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID REFERENCES clients(id),
  prestataire_id UUID REFERENCES prestataires(id),
  prestation_id  UUID REFERENCES prestations_catalogue(id),
  date_heure     TIMESTAMPTZ NOT NULL,
  duree_minutes  INTEGER DEFAULT 60,
  statut         TEXT DEFAULT 'Confirmé' CHECK (statut IN ('Confirmé','En cours','Terminé','Annulé','Absent')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FACTURES
CREATE TABLE IF NOT EXISTS factures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           TEXT UNIQUE NOT NULL,
  client_id        UUID REFERENCES clients(id),
  prestataire_id   UUID REFERENCES prestataires(id),
  rendez_vous_id   UUID REFERENCES rendez_vous(id),
  date_emission    TIMESTAMPTZ DEFAULT NOW(),
  montant_total    NUMERIC(12,2) NOT NULL DEFAULT 0,
  remise_montant   NUMERIC(12,2) DEFAULT 0,
  montant_net      NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye     NUMERIC(12,2) DEFAULT 0,
  statut           TEXT DEFAULT 'Non payée' CHECK (statut IN ('Non payée','Partiellement payée','Payée','En retard')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 9. LIGNES DE FACTURE
CREATE TABLE IF NOT EXISTS factures_lignes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id    UUID REFERENCES factures(id) ON DELETE CASCADE,
  type          TEXT CHECK (type IN ('prestation','produit')),
  description   TEXT NOT NULL,
  quantite      INTEGER DEFAULT 1,
  prix_unitaire NUMERIC(12,2) NOT NULL,
  sous_total    NUMERIC(12,2) NOT NULL
);

-- 10. PAIEMENTS
CREATE TABLE IF NOT EXISTS paiements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id     UUID REFERENCES factures(id) ON DELETE CASCADE,
  montant        NUMERIC(12,2) NOT NULL,
  mode_paiement  TEXT NOT NULL CHECK (mode_paiement IN ('Espèces','Flooz','T-Money','Virement bancaire','Carte bancaire','Autre')),
  reference      TEXT,
  date_paiement  TIMESTAMPTZ DEFAULT NOW(),
  notes          TEXT
);

-- 11. CATÉGORIES PRODUITS
CREATE TABLE IF NOT EXISTS categories_produits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories_produits (nom) VALUES
  ('Cosmétiques'),('Crèmes & Soins'),('Huiles'),('Shampoings'),
  ('Accessoires'),('Matériel esthétique'),('Produits capillaires'),('Divers')
ON CONFLICT DO NOTHING;

-- 12. FOURNISSEURS
CREATE TABLE IF NOT EXISTS fournisseurs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        TEXT NOT NULL,
  contact    TEXT,
  telephone  TEXT,
  email      TEXT,
  specialite TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PRODUITS / STOCK
CREATE TABLE IF NOT EXISTS produits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie_id    UUID REFERENCES categories_produits(id),
  fournisseur_id  UUID REFERENCES fournisseurs(id),
  nom             TEXT NOT NULL,
  description     TEXT,
  code_barre      TEXT,
  prix_achat      NUMERIC(12,2) DEFAULT 0,
  prix_vente      NUMERIC(12,2) NOT NULL,
  stock_actuel    INTEGER DEFAULT 0,
  stock_minimum   INTEGER DEFAULT 5,
  date_expiration DATE,
  photo_url       TEXT,
  actif           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 14. MOUVEMENTS DE STOCK
CREATE TABLE IF NOT EXISTS stock_mouvements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id      UUID REFERENCES produits(id),
  type            TEXT CHECK (type IN ('entrée','sortie','ajustement')),
  quantite        INTEGER NOT NULL,
  motif           TEXT,
  reference       TEXT,
  fournisseur_id  UUID REFERENCES fournisseurs(id),
  date_mouvement  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 15. DÉPENSES
CREATE TABLE IF NOT EXISTS depenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie      TEXT NOT NULL CHECK (categorie IN ('Achat matériel','Achat produits','Salaires','Loyer','Eau & Électricité','Maintenance','Marketing','Transport','Divers')),
  description    TEXT NOT NULL,
  montant        NUMERIC(12,2) NOT NULL,
  mode_paiement  TEXT CHECK (mode_paiement IN ('Espèces','Flooz','T-Money','Virement bancaire','Carte bancaire','Autre')),
  fournisseur_id UUID REFERENCES fournisseurs(id),
  reference      TEXT,
  recurrente     BOOLEAN DEFAULT FALSE,
  frequence      TEXT CHECK (frequence IN ('mensuelle','hebdomadaire','annuelle')),
  date_depense   DATE NOT NULL DEFAULT CURRENT_DATE,
  preuve_url     TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 16. COMMISSIONS PRESTATAIRES
CREATE TABLE IF NOT EXISTS commissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestataire_id     UUID REFERENCES prestataires(id),
  facture_id         UUID REFERENCES factures(id),
  montant_prestation NUMERIC(12,2),
  taux_commission    NUMERIC(5,2),
  montant_commission NUMERIC(12,2),
  mois               INTEGER,
  annee              INTEGER,
  statut             TEXT DEFAULT 'En attente' CHECK (statut IN ('En attente','Payée')),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT CHECK (type IN ('info','alerte','succès','erreur')),
  cible      TEXT DEFAULT 'tous' CHECK (cible IN ('tous','directrice','prestataires')),
  lu         BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. ABONNEMENTS / FIDÉLITÉ
CREATE TABLE IF NOT EXISTS abonnements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id),
  nom         TEXT NOT NULL,
  description TEXT,
  prix        NUMERIC(12,2),
  date_debut  DATE,
  date_fin    DATE,
  statut      TEXT DEFAULT 'Actif' CHECK (statut IN ('Actif','Expiré','Suspendu')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DÉSACTIVER RLS POUR LE MODE DÉVELOPPEMENT
-- (Activer et configurer les policies en production)
-- ============================================================

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

-- ============================================================
-- DONNÉES DE TEST (optionnel — supprimer en production)
-- ============================================================

INSERT INTO prestataires (nom, prenom, poste, taux_commission) VALUES
  ('Koffi',  'Aminata', 'Coiffeuse',      15),
  ('Mensah', 'Fatou',   'Esthéticienne',  12),
  ('Agbeko', 'Kofi',    'Masseur',        10),
  ('Dossou', 'Abla',    'Onglerie',       15),
  ('Tete',   'Edem',    'Barbier',        10)
ON CONFLICT DO NOTHING;

-- ✅ Schéma prêt ! Vérifiez dans Table Editor que toutes les tables sont créées.
