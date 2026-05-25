import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, format } from 'date-fns'
import { fr } from 'date-fns/locale'

const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export function useDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const now       = new Date()
      const todayStart = startOfDay(now).toISOString()
      const todayEnd   = endOfDay(now).toISOString()
      const moisStart  = startOfMonth(now).toISOString()
      const moisEnd    = endOfMonth(now).toISOString()

      // 6 derniers mois pour graphiques
      const mois6 = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i)
        return {
          label: MOIS_FR[d.getMonth()],
          start: startOfMonth(d).toISOString(),
          end:   endOfMonth(d).toISOString(),
          startDate: format(startOfMonth(d), 'yyyy-MM-dd'),
          endDate:   format(endOfMonth(d),   'yyyy-MM-dd'),
        }
      })

      const [
        rdvAujourdhuiRes,
        rdvProchainsRes,
        facturesMoisRes,
        facturesEnRetardRes,
        depensesMoisRes,
        produitsStockRes,
        prestatairesRes,
        notificationsNLRes,
        facturesAujourdhuiRes,
      ] = await Promise.all([
        supabase.from('rendez_vous')
          .select('id, statut, date_heure, clients(nom,prenom), prestations_catalogue(nom), prestataires(nom,prenom)')
          .gte('date_heure', todayStart).lte('date_heure', todayEnd)
          .order('date_heure', { ascending: true }),

        supabase.from('rendez_vous')
          .select('id, statut, date_heure, clients(nom,prenom), prestations_catalogue(nom,prix), prestataires(nom,prenom)')
          .gte('date_heure', new Date().toISOString())
          .in('statut', ['Confirmé','En cours'])
          .order('date_heure', { ascending: true })
          .limit(6),

        supabase.from('factures')
          .select('id, montant_net, montant_paye, statut')
          .gte('date_emission', moisStart).lte('date_emission', moisEnd),

        supabase.from('factures')
          .select('id, numero, montant_net, montant_paye, clients(nom,prenom), date_emission')
          .in('statut', ['Non payée','En retard'])
          .order('date_emission', { ascending: true })
          .limit(5),

        supabase.from('depenses')
          .select('id, montant, categorie')
          .gte('date_depense', format(startOfMonth(now), 'yyyy-MM-dd'))
          .lte('date_depense', format(endOfMonth(now),   'yyyy-MM-dd')),

        supabase.from('produits')
          .select('id, nom, stock_actuel, stock_minimum, categories_produits(nom)')
          .eq('actif', true),

        supabase.from('prestataires')
          .select('id, nom, prenom, poste, taux_commission')
          .eq('actif', true),

        supabase.from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('lu', false),

        supabase.from('factures')
          .select('montant_paye, statut')
          .gte('date_emission', todayStart).lte('date_emission', todayEnd),
      ])

      const factures  = facturesMoisRes.data  || []
      const depenses  = depensesMoisRes.data  || []
      const rdvAuj    = rdvAujourdhuiRes.data || []
      const produits  = produitsStockRes.data || []
      const prests    = prestatairesRes.data  || []

      const caMois     = factures.filter(f => f.statut === 'Payée').reduce((s, f) => s + Number(f.montant_net  || 0), 0)
      const depMois    = depenses.reduce((s, d) => s + Number(d.montant || 0), 0)
      const encaisseMois = factures.reduce((s, f) => s + Number(f.montant_paye || 0), 0)
      const caJour     = (facturesAujourdhuiRes.data || []).reduce((s, f) => s + Number(f.montant_paye || 0), 0)

      // Alertes stock — filtre JS pour éviter le bug lte sur colonnes
      const alertesStock = produits.filter(p => Number(p.stock_actuel) <= Number(p.stock_minimum)).slice(0, 5)

      // Graphique 6 mois
      const graphMois = await Promise.all(
        mois6.map(async m => {
          const [facs, deps] = await Promise.all([
            supabase.from('factures').select('montant_paye').gte('date_emission', m.start).lte('date_emission', m.end),
            supabase.from('depenses').select('montant').gte('date_depense', m.startDate).lte('date_depense', m.endDate),
          ])
          const rev = (facs.data || []).reduce((s, f) => s + Number(f.montant_paye || 0), 0)
          const dep = (deps.data || []).reduce((s, d) => s + Number(d.montant || 0), 0)
          return { mois: m.label, revenus: rev, depenses: dep, benefice: rev - dep }
        })
      )

      // Dépenses par catégorie
      const depParCateg = {}
      depenses.forEach(d => {
        depParCateg[d.categorie] = (depParCateg[d.categorie] || 0) + Number(d.montant || 0)
      })
      const graphDepCateg = Object.entries(depParCateg)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      // Performances prestataires du mois
      const perfPrestataires = await Promise.all(
        prests.map(async p => {
          const { count } = await supabase.from('rendez_vous')
            .select('id', { count: 'exact', head: true })
            .eq('prestataire_id', p.id)
            .eq('statut', 'Terminé')
            .gte('date_heure', moisStart)
          return { ...p, prestations_mois: count || 0 }
        })
      )
      const topPrestataires = perfPrestataires
        .sort((a, b) => b.prestations_mois - a.prestations_mois)
        .slice(0, 5)

      setData({
        caJour,
        caMois,
        depMois,
        beneficeMois:    encaisseMois - depMois,
        rdvAujourdhuiCount: rdvAuj.length,
        rdvTerminesCount:   rdvAuj.filter(r => r.statut === 'Terminé').length,
        facturesEnAttente:  factures.filter(f => f.statut !== 'Payée').length,
        notificationsNL:    notificationsNLRes.count || 0,
        rdvAujourdhui:      rdvAuj,
        rdvProchains:       rdvProchainsRes.data || [],
        facturesEnRetard:   facturesEnRetardRes.data || [],
        alertesStock,
        topPrestataires,
        graphMois,
        graphDepCateg,
      })
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Erreur de chargement.')
      setData(getMockData())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  return { data, loading, error, refresh: fetchAll }
}

function getMockData() {
  return {
    caJour: 45000, caMois: 870000, depMois: 220000, beneficeMois: 650000,
    rdvAujourdhuiCount: 8, rdvTerminesCount: 5, facturesEnAttente: 3, notificationsNL: 2,
    rdvAujourdhui: [], rdvProchains: [], facturesEnRetard: [], alertesStock: [],
    topPrestataires: [
      { id:'1', prenom:'Aminata', nom:'Koffi',  poste:'Coiffeuse',     prestations_mois: 24 },
      { id:'2', prenom:'Fatou',   nom:'Mensah', poste:'Esthéticienne', prestations_mois: 18 },
      { id:'3', prenom:'Kofi',    nom:'Agbeko', poste:'Masseur',       prestations_mois: 15 },
    ],
    graphMois: [
      { mois:'Jan', revenus:620000, depenses:190000, benefice:430000 },
      { mois:'Fév', revenus:710000, depenses:210000, benefice:500000 },
      { mois:'Mar', revenus:680000, depenses:200000, benefice:480000 },
      { mois:'Avr', revenus:790000, depenses:230000, benefice:560000 },
      { mois:'Mai', revenus:840000, depenses:215000, benefice:625000 },
      { mois:'Jun', revenus:870000, depenses:220000, benefice:650000 },
    ],
    graphDepCateg: [
      { name:'Salaires', value:95000 }, { name:'Achat produits', value:55000 },
      { name:'Loyer', value:40000 },    { name:'Eau & Électricité', value:15000 },
    ],
  }
}
