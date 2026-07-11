-- ================================================================
--  MIGRATION v3 — Ajout du type de contrat "En formation"
-- ================================================================
--  ⚠️ CETTE MIGRATION NE TOUCHE À AUCUNE DONNÉE EXISTANTE.
--  Elle modifie uniquement la RÈGLE (contrainte CHECK) qui définit
--  les valeurs autorisées pour la colonne "type_contrat".
--
--  • Aucune ligne n'est supprimée, modifiée ou déplacée.
--  • Tous les prestataires déjà enregistrés (Salarié(e) / Sous-traitant(e))
--    restent exactement comme ils sont.
--  • Elle ajoute simplement "En formation" à la liste des valeurs
--    acceptées, pour que le nouveau bouton de l'application fonctionne.
--
--  À exécuter UNE SEULE FOIS dans : Supabase → SQL Editor → New query
-- ================================================================

DO $$
DECLARE
  contrainte_existante TEXT;
BEGIN
  -- On recherche le nom réel de la contrainte CHECK actuelle sur type_contrat
  -- (au cas où elle ne s'appellerait pas exactement "prestataires_type_contrat_check")
  SELECT con.conname INTO contrainte_existante
  FROM pg_constraint con
  JOIN pg_class rel      ON rel.oid = con.conrelid
  JOIN pg_attribute att  ON att.attrelid = rel.oid
  WHERE rel.relname = 'prestataires'
    AND con.contype = 'c'
    AND att.attname = 'type_contrat'
    AND att.attnum = ANY (con.conkey)
  LIMIT 1;

  IF contrainte_existante IS NOT NULL THEN
    EXECUTE format('ALTER TABLE prestataires DROP CONSTRAINT %I', contrainte_existante);
  END IF;

  ALTER TABLE prestataires
    ADD CONSTRAINT prestataires_type_contrat_check
      CHECK (type_contrat IN ('Salarié(e)', 'Sous-traitant(e)', 'En formation'));
END $$;

-- ✅ Migration v3 appliquée ! Vos données existantes n'ont pas bougé.
