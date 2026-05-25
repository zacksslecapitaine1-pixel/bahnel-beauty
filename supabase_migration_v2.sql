-- ============================================================
-- BAHNEL BEAUTY INSTITUTE — MIGRATION v2
-- Modifications selon le cahier des charges
-- ============================================================

-- 1. PRESTATAIRES : ajout mot de passe et last_login
ALTER TABLE prestataires
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 2. RENDEZ-VOUS : gestion types de prestation
ALTER TABLE rendez_vous
  ADD COLUMN IF NOT EXISTS type_prestation TEXT DEFAULT 'Normale'
    CHECK (type_prestation IN ('Normale', 'Gratuite', 'Sous abonnement')),
  ADD COLUMN IF NOT EXISTS raison_gratuite TEXT,
  ADD COLUMN IF NOT EXISTS abonnement_id UUID REFERENCES abonnements(id),
  ADD COLUMN IF NOT EXISTS numero_seance INTEGER,
  ADD COLUMN IF NOT EXISTS total_seances INTEGER;

-- 3. ABONNEMENTS : ajout total_seances et seances_consommees
ALTER TABLE abonnements
  ADD COLUMN IF NOT EXISTS total_seances INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seances_consommees INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestation_id UUID REFERENCES prestations_catalogue(id);

-- 4. COMMISSIONS : ajout montant_encaisse pour traçabilité
ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS montant_encaisse NUMERIC(12,2);

-- 5. FACTURES : ajout champ fichier_pdf et numero_facture séquentiel
ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS fichier_pdf TEXT,
  ADD COLUMN IF NOT EXISTS type_prestation TEXT DEFAULT 'Normale';

-- ============================================================
-- DONNÉES DE TEST pour les abonnements
-- ============================================================
-- (Décommenter si besoin)
-- INSERT INTO abonnements (client_id, nom, description, prix, total_seances, statut, date_debut, date_fin)
-- SELECT id, 'Forfait Soin 8 séances', 'Soins du visage - 8 séances', 80000, 8, 'Actif', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months'
-- FROM clients LIMIT 1;

-- ✅ Migration v2 appliquée avec succès !

-- ============================================================
-- MIGRATION v2.1 — Clients abonnés + Sous-traitants
-- ============================================================

-- Clients : type standard ou abonné
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS type_client TEXT DEFAULT 'Standard'
    CHECK (type_client IN ('Standard', 'Abonnement'));

-- Abonnements : colonnes manquantes
ALTER TABLE abonnements
  ADD COLUMN IF NOT EXISTS total_seances      INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seances_consommees INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestation_nom     TEXT,
  ADD COLUMN IF NOT EXISTS statut             TEXT DEFAULT 'Actif'
    CHECK (statut IN ('Actif','Expiré','Suspendu','Terminé'));

-- Prestataires : type de contrat + spécialités multiples
ALTER TABLE prestataires
  ADD COLUMN IF NOT EXISTS type_contrat TEXT DEFAULT 'Salarié(e)'
    CHECK (type_contrat IN ('Salarié(e)', 'Sous-traitant(e)')),
  ADD COLUMN IF NOT EXISTS specialites  JSONB DEFAULT '[]';

-- ✅ Migration v2.1 appliquée !
