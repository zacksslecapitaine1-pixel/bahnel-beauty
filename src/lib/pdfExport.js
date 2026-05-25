import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ================================================================
//  CHARTE GRAPHIQUE — BAHNEL BEAUTY INSTITUTE
// ================================================================
const C = {
  or:       [191, 155, 90],    // #BF9B5A — or chaud
  orClair:  [245, 235, 210],   // fond or très pâle
  orFonce:  [139, 105, 50],    // or foncé
  noir:     [18,  18,  18],    // quasi-noir
  gris1:    [45,  45,  45],    // gris très foncé
  gris2:    [100, 100, 100],   // gris moyen
  gris3:    [160, 160, 160],   // gris clair
  gris4:    [230, 230, 230],   // gris très clair
  gris5:    [248, 246, 243],   // fond crème
  blanc:    [255, 255, 255],
  vert:     [39,  174, 96],
  rouge:    [220, 53,  69],
  bleu:     [52,  131, 211],
  violet:   [111, 66,  193],
  rose:     [232, 90,  133],
}

const fcfa = v => new Intl.NumberFormat('fr-FR').format(Math.abs(Number(v || 0))) + ' FCFA'
const fmt  = (d, p = 'dd/MM/yyyy') => { try { return format(new Date(d), p, { locale: fr }) } catch { return '—' } }

// ================================================================
//  UTILITAIRES DESSIN
// ================================================================

// Trait fin orné
function orneLine(doc, x1, y, x2, color = C.or) {
  doc.setDrawColor(...color)
  doc.setLineWidth(0.3)
  doc.line(x1, y, x2, y)
}

// Filigrane décoratif (cercles concentriques discrets)
function drawWatermark(doc, x, y, r = 60) {
  doc.setDrawColor(...C.gris4)
  doc.setLineWidth(0.15)
  for (let i = 1; i <= 5; i++) {
    doc.circle(x, y, r * i * 0.22, 'S')
  }
}

// ================================================================
//  EN-TÊTE LUXE
// ================================================================
function drawLuxeHeader(doc, salonInfo = {}) {
  const W = doc.internal.pageSize.getWidth()

  // Fond header très sombre
  doc.setFillColor(...C.noir)
  doc.rect(0, 0, W, 46, 'F')

  // Bande or en bas du header
  doc.setFillColor(...C.or)
  doc.rect(0, 43, W, 3, 'F')

  // Filigrane décoratif dans le header
  doc.setDrawColor(255, 255, 255, 0.05)
  doc.setLineWidth(0.2)
  doc.setDrawColor(60, 60, 60)
  for (let i = 1; i <= 4; i++) {
    doc.circle(W - 30, 22, i * 9, 'S')
  }

  // Losanges décoratifs gauche
  const drawDiamond = (cx, cy, size) => {
    doc.setDrawColor(...C.or)
    doc.setLineWidth(0.4)
    doc.line(cx, cy - size, cx + size, cy)
    doc.line(cx + size, cy, cx, cy + size)
    doc.line(cx, cy + size, cx - size, cy)
    doc.line(cx - size, cy, cx, cy - size)
  }
  drawDiamond(26, 22, 4)
  drawDiamond(34, 22, 2)

  // Nom du salon
  doc.setTextColor(...C.blanc)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text((salonInfo.nom || 'BAHNEL BEAUTY INSTITUTE').toUpperCase(), 44, 17)

  // Sous-titre salon
  doc.setTextColor(...C.or)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setCharSpace(2.5)
  doc.text('SALON DE BEAUTÉ & BIEN-ÊTRE', 44, 25)
  doc.setCharSpace(0)

  // Infos contact (droite)
  doc.setTextColor(200, 200, 200)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  const infos = [
    salonInfo.telephone,
    salonInfo.email,
    salonInfo.adresse,
  ].filter(Boolean)
  infos.forEach((info, i) => {
    doc.text(info, W - 14, 12 + i * 6, { align: 'right' })
  })

  return 52  // y de départ après header
}

// ================================================================
//  PIED DE PAGE LUXE
// ================================================================
function drawLuxeFooter(doc, salonInfo = {}, numero = '') {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Bande or supérieure du footer
  doc.setFillColor(...C.or)
  doc.rect(0, H - 20, W, 0.8, 'F')

  // Fond footer
  doc.setFillColor(...C.noir)
  doc.rect(0, H - 19, W, 19, 'F')

  // Texte footer
  doc.setTextColor(180, 180, 180)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const genDate = fmt(new Date(), "d MMMM yyyy 'à' HH:mm")
  doc.text(`Document généré le ${genDate}`, 14, H - 11)
  doc.text(salonInfo.adresse || 'Lomé, Togo', W / 2, H - 11, { align: 'center' })

  doc.setTextColor(...C.or)
  doc.setFont('helvetica', 'bold')
  doc.text(numero ? `N° ${numero}` : (salonInfo.nom || 'Bahnel Beauty Institute'), W - 14, H - 11, { align: 'right' })

  // Mention bas
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('Merci de votre confiance — Ce document tient lieu de facture officielle.', W / 2, H - 5, { align: 'center' })
}

// ================================================================
//  SECTION TITRE (avec lignes ornées)
// ================================================================
function sectionTitle(doc, y, title, W) {
  orneLine(doc, 14, y, 14 + 18, y, C.or)
  doc.setTextColor(...C.or)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.8)
  doc.text(title.toUpperCase(), 36, y + 0.5)
  doc.setCharSpace(0)
  orneLine(doc, 36 + doc.getTextWidth(title.toUpperCase() * 1.05) + 8, y, W - 14, y, C.gris4)
  return y + 6
}

// ================================================================
//  EXPORT FACTURE PDF — DESIGN LUXE BEAUTÉ
// ================================================================
export async function exportFacturePDF(facture, lignes, paiements, salonInfo = {}, rdv = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  let y     = drawLuxeHeader(doc, salonInfo)

  // Filigrane fond page
  drawWatermark(doc, W - 50, 170, 50)
  drawWatermark(doc, 30, 240, 30)

  // ── BANDEAU FACTURE ──────────────────────────────────────────
  // Titre FACTURE
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.noir)
  doc.text('FACTURE', 14, y + 10)

  // Badge type de prestation
  const typePrest = rdv?.type_prestation || facture.type_prestation
  if (typePrest === 'Gratuite') {
    doc.setFillColor(...C.violet)
    doc.roundedRect(67, y + 2, 26, 9, 2, 2, 'F')
    doc.setTextColor(...C.blanc)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setCharSpace(0.8)
    doc.text('OFFERTE', 80, y + 8, { align: 'center' })
    doc.setCharSpace(0)
  } else if (typePrest === 'Sous abonnement') {
    doc.setFillColor(...C.bleu)
    doc.roundedRect(67, y + 2, 32, 9, 2, 2, 'F')
    doc.setTextColor(...C.blanc)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setCharSpace(0.8)
    doc.text('ABONNEMENT', 83, y + 8, { align: 'center' })
    doc.setCharSpace(0)
  }

  // Numéro & date (droite)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.gris2)
  doc.text('Numéro de facture', W - 14, y + 4, { align: 'right' })
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.or)
  doc.text(facture.numero || '—', W - 14, y + 11, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.gris2)
  doc.text(`Émise le ${fmt(facture.date_emission || new Date())}`, W - 14, y + 17, { align: 'right' })

  y += 22

  // Ligne or
  doc.setFillColor(...C.or)
  doc.rect(14, y, W - 28, 0.6, 'F')
  y += 8

  // ── BLOC CLIENT + PRESTATAIRE ─────────────────────────────────
  const blockW = (W - 28 - 6) / 2

  // --- Client ---
  doc.setFillColor(...C.gris5)
  doc.roundedRect(14, y, blockW, 36, 3, 3, 'F')
  // Bande or à gauche
  doc.setFillColor(...C.or)
  doc.roundedRect(14, y, 3, 36, 1.5, 1.5, 'F')

  doc.setTextColor(...C.or)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text('FACTURÉ À', 22, y + 8)
  doc.setCharSpace(0)

  const clientNom = `${facture.clients?.prenom || ''} ${facture.clients?.nom || ''}`.trim()
  doc.setTextColor(...C.noir)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(clientNom || '—', 22, y + 16)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.gris2)
  let cy2 = y + 23
  if (facture.clients?.telephone) {
    doc.text(`📞 ${facture.clients.telephone}`, 22, cy2)
    cy2 += 5.5
  }
  if (facture.clients?.email) {
    doc.text(`✉ ${facture.clients.email}`, 22, cy2)
  }

  // Abonnement client visible
  if (facture.clients?.type_client === 'Abonnement' || typePrest === 'Sous abonnement') {
    if (rdv?.numero_seance && rdv?.total_seances) {
      doc.setFillColor(...C.bleu)
      doc.roundedRect(22, y + 28, 40, 6, 1.5, 1.5, 'F')
      doc.setTextColor(...C.blanc)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`Séance ${rdv.numero_seance} / ${rdv.total_seances}`, 42, y + 32.5, { align: 'center' })
    }
  }

  // --- Prestataire ---
  const x2 = 14 + blockW + 6
  doc.setFillColor(...C.gris5)
  doc.roundedRect(x2, y, blockW, 36, 3, 3, 'F')
  doc.setFillColor(...C.or)
  doc.roundedRect(x2, y, 3, 36, 1.5, 1.5, 'F')

  doc.setTextColor(...C.or)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(1.5)
  doc.text('PRESTATAIRE', x2 + 8, y + 8)
  doc.setCharSpace(0)

  if (facture.prestataires) {
    const pNom = `${facture.prestataires.prenom || ''} ${facture.prestataires.nom || ''}`.trim()
    doc.setTextColor(...C.noir)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(pNom, x2 + 8, y + 16)
    if (facture.prestataires.poste) {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.gris2)
      doc.text(facture.prestataires.poste, x2 + 8, y + 23)
    }
  } else {
    doc.setTextColor(...C.gris3)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Vente directe', x2 + 8, y + 16)
  }

  // Info salon (bloc de droite)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.gris2)
  doc.text(salonInfo.adresse || '', x2 + 8, y + 30)

  y += 43

  // ── TABLEAU DES PRESTATIONS ───────────────────────────────────
  y = sectionTitle(doc, y, 'Détail des prestations et produits', W)
  y += 2

  // En-tête tableau
  doc.setFillColor(...C.noir)
  doc.roundedRect(14, y, W - 28, 9, 2, 2, 'F')
  doc.setTextColor(...C.or)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setCharSpace(0.5)
  doc.text('DÉSIGNATION',    20,      y + 6)
  doc.text('CATÉGORIE',      105,     y + 6)
  doc.text('QTÉ',            134,     y + 6, { align: 'center' })
  doc.text('PRIX UNIT.',     158,     y + 6, { align: 'right' })
  doc.text('MONTANT',        W - 16,  y + 6, { align: 'right' })
  doc.setCharSpace(0)
  y += 9

  // Lignes
  ;(lignes || []).forEach((l, i) => {
    const bg = i % 2 === 0 ? C.blanc : C.gris5
    doc.setFillColor(...bg)
    doc.rect(14, y, W - 28, 9, 'F')

    // Bordure gauche colorée selon type
    if (l.type === 'prestation') {
      doc.setFillColor(...C.or)
    } else {
      doc.setFillColor(...C.bleu)
    }
    doc.rect(14, y, 2, 9, 'F')

    doc.setTextColor(...C.noir)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', l.type === 'prestation' ? 'bold' : 'normal')
    const desc = (l.description || '').length > 40 ? (l.description || '').substring(0, 40) + '…' : (l.description || '')
    doc.text(desc, 20, y + 6)

    // Badge catégorie
    const bColor = l.type === 'prestation' ? C.orClair : [219, 234, 254]
    const bText  = l.type === 'prestation' ? C.orFonce : C.bleu
    doc.setFillColor(...bColor)
    doc.roundedRect(101, y + 1.8, l.type === 'prestation' ? 24 : 18, 5.5, 1.5, 1.5, 'F')
    doc.setTextColor(...bText)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(l.type === 'prestation' ? 'Prestation' : 'Produit',
      l.type === 'prestation' ? 113 : 110, y + 6, { align: 'center' })

    doc.setTextColor(...C.gris1)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text(String(l.quantite || 1), 134, y + 6, { align: 'center' })
    doc.text(fcfa(l.prix_unitaire),   158, y + 6, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.noir)
    doc.text(fcfa(l.sous_total),      W - 16, y + 6, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 9
  })

  // Bordure bas tableau
  doc.setFillColor(...C.or)
  doc.rect(14, y, W - 28, 0.4, 'F')
  y += 8

  // ── TOTAUX ────────────────────────────────────────────────────
  const totX = W - 90

  const ligneTotal = (label, val, opts = {}) => {
    const { bold = false, colorVal = C.gris1, bg = null, grande = false, barreVerte = false } = opts
    if (bg) {
      doc.setFillColor(...bg)
      doc.roundedRect(totX - 4, y - 3, W - totX - 10, grande ? 12 : 9, 2, 2, 'F')
    }
    doc.setFontSize(bold || grande ? (grande ? 11 : 9.5) : 8.5)
    doc.setFont('helvetica', bold || grande ? 'bold' : 'normal')
    doc.setTextColor(...(bg ? C.blanc : C.gris2))
    doc.text(label, totX, y + (grande ? 5 : 3))
    doc.setTextColor(...(bg ? C.blanc : colorVal))
    doc.setFontSize(bold || grande ? (grande ? 12 : 10) : 9)
    doc.text(fcfa(val), W - 16, y + (grande ? 5 : 3), { align: 'right' })
    y += grande ? 14 : bold ? 9 : 7
  }

  ligneTotal('Sous-total', facture.montant_total)
  if (Number(facture.remise_montant) > 0) {
    ligneTotal(`Remise accordée`, -facture.remise_montant, { colorVal: C.rouge })
  }

  // Séparateur fin
  doc.setDrawColor(...C.gris4)
  doc.setLineWidth(0.3)
  doc.line(totX - 4, y - 2, W - 14, y - 2)

  // TOTAL NET
  if (typePrest === 'Gratuite') {
    ligneTotal('PRESTATION OFFERTE', 0, { bold: true, grande: true, bg: C.violet })
  } else {
    ligneTotal('TOTAL NET', facture.montant_net, { bold: true, grande: true, bg: C.noir })
  }

  // Paiements
  if (typePrest !== 'Gratuite') {
    ligneTotal('Montant encaissé', facture.montant_paye, { bold: true, colorVal: C.vert })
    const restant = Number(facture.montant_net) - Number(facture.montant_paye)
    if (restant > 0.5) {
      ligneTotal('Reste à payer', restant, { bold: true, colorVal: C.rouge, bg: [255, 243, 243] })
    }
  }

  // Mode de paiement
  if (paiements && paiements.length > 0) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.gris3)
    doc.text(`Mode de règlement : ${paiements[0].mode_paiement}`, totX, y)
    y += 6
  }

  y += 4

  // ── STATUT + RAISON GRATUITÉ ──────────────────────────────────
  const statutCfg = {
    'Payée':               { bg: C.vert,  label: '✓  PAYÉE'                },
    'Non payée':           { bg: [220,90,20], label: '⚠  NON PAYÉE'        },
    'Partiellement payée': { bg: C.bleu,  label: '◐  PARTIELLEMENT PAYÉE'  },
    'En retard':           { bg: C.rouge, label: '✗  EN RETARD'            },
  }
  const sc = statutCfg[facture.statut] || { bg: C.gris2, label: facture.statut }
  doc.setFillColor(...sc.bg)
  doc.roundedRect(14, y, 68, 10, 2.5, 2.5, 'F')
  doc.setTextColor(...C.blanc)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text(sc.label, 48, y + 6.8, { align: 'center' })

  if (typePrest === 'Gratuite' && rdv?.raison_gratuite) {
    doc.setFillColor(245, 240, 255)
    doc.roundedRect(87, y, W - 101, 10, 2, 2, 'F')
    doc.setTextColor(...C.violet)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(`Motif : ${rdv.raison_gratuite}`, 91, y + 6.8)
  }
  y += 16

  // ── HISTORIQUE PAIEMENTS ──────────────────────────────────────
  if (paiements && paiements.length > 0) {
    y = sectionTitle(doc, y, 'Historique des paiements', W)
    y += 2
    paiements.forEach((p, i) => {
      const bg2 = i % 2 === 0 ? C.gris5 : C.blanc
      doc.setFillColor(...bg2)
      doc.rect(14, y, W - 28, 7, 'F')
      doc.setFillColor(...C.vert)
      doc.rect(14, y, 2, 7, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.gris2)
      let dateP = '—'
      try { dateP = fmt(p.date_paiement, 'dd/MM/yyyy à HH:mm') } catch {}
      doc.text(dateP, 20, y + 5)
      doc.setTextColor(...C.gris1)
      doc.text(p.mode_paiement, W / 2, y + 5, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.vert)
      doc.text(fcfa(p.montant), W - 16, y + 5, { align: 'right' })
      y += 7
    })
    doc.setFillColor(...C.or)
    doc.rect(14, y, W - 28, 0.4, 'F')
    y += 7
  }

  // ── INFOS ABONNEMENT ─────────────────────────────────────────
  if (typePrest === 'Sous abonnement' && rdv?.numero_seance && rdv?.total_seances) {
    y = sectionTitle(doc, y, 'Suivi abonnement', W)
    y += 2

    doc.setFillColor(...C.gris5)
    doc.roundedRect(14, y, W - 28, 18, 3, 3, 'F')
    doc.setFillColor(...C.bleu)
    doc.roundedRect(14, y, 3, 18, 1.5, 1.5, 'F')

    // Barre de progression visuelle
    const total = Number(rdv.total_seances)
    const actuel = Number(rdv.numero_seance)
    const pct = Math.min(actuel / total, 1)
    const barX = 22; const barW = W - 58; const barH = 3.5
    doc.setFillColor(...C.gris4)
    doc.roundedRect(barX, y + 11, barW, barH, 1, 1, 'F')
    doc.setFillColor(...C.bleu)
    doc.roundedRect(barX, y + 11, barW * pct, barH, 1, 1, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.noir)
    doc.text(`Séance ${actuel} sur ${total} — ${total - actuel} séance(s) restante(s)`, 22, y + 8)

    doc.setTextColor(...C.bleu)
    doc.setFontSize(8)
    doc.text(`${actuel}/${total}`, W - 16, y + 8, { align: 'right' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.gris3)
    doc.text(`${Math.round(pct * 100)}% consommé`, W - 16, y + 14, { align: 'right' })

    y += 25
  }

  // ── NOTES ────────────────────────────────────────────────────
  if (facture.notes) {
    y = sectionTitle(doc, y, 'Notes', W)
    y += 2
    doc.setFillColor(...C.orClair)
    doc.roundedRect(14, y, W - 28, 14, 3, 3, 'F')
    doc.setFillColor(...C.or)
    doc.roundedRect(14, y, 3, 14, 1.5, 1.5, 'F')
    doc.setTextColor(...C.gris1)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    doc.text(facture.notes, 22, y + 9, { maxWidth: W - 50 })
    y += 20
  }

  // ── MENTION LÉGALE ────────────────────────────────────────────
  doc.setTextColor(...C.gris3)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Cette facture est valide sans signature. Conservation recommandée.', W / 2, y + 4, { align: 'center' })

  drawLuxeFooter(doc, salonInfo, facture.numero)
  return doc
}

// ================================================================
//  DOWNLOAD INVOICE — téléchargement PDF propre
// ================================================================
export async function downloadInvoice(facture, lignes, paiements, salonInfo = {}, rdv = null) {
  const doc = await exportFacturePDF(facture, lignes, paiements, salonInfo, rdv)
  const fileName = `Facture_${(facture.numero || 'BBI').replace(/\//g, '-')}.pdf`
  doc.save(fileName)
  return fileName
}

// ================================================================
//  CALCUL COMMISSIONS — sur montant réellement encaissé
// ================================================================
export function calculateCommission(montantTotal, remise, montantPaye, prestMontant, tauxCommission) {
  const montantNet = Math.max(0, montantTotal - remise)
  if (montantNet === 0 || tauxCommission === 0 || prestMontant === 0 || montantPaye === 0) return 0
  const prestNet             = prestMontant * (montantNet / montantTotal)
  const paymentRatio         = Math.min(montantPaye / montantNet, 1)
  const montantEncaissePrest = prestNet * paymentRatio
  return Math.round(montantEncaissePrest * (tauxCommission / 100))
}

// ================================================================
//  EXPORT RAPPORT PDF
// ================================================================
export function exportRapportPDF(data, periode, salonInfo = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  let y     = drawLuxeHeader(doc, salonInfo)

  drawWatermark(doc, W - 40, 200, 60)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.noir)
  doc.text('RAPPORT FINANCIER', 14, y + 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.gris2)
  doc.text(`Période : ${periode}`, 14, y + 16)
  doc.text(`Généré le ${fmt(new Date(), 'dd MMMM yyyy')}`, W - 14, y + 10, { align: 'right' })
  y += 22

  doc.setFillColor(...C.or)
  doc.rect(14, y, W - 28, 0.6, 'F')
  y += 8

  const kpis = [
    { label: 'CA Encaissé',    value: fcfa(data.caEncaisse),     color: C.vert   },
    { label: 'Dépenses',       value: fcfa(data.depTot),         color: C.rouge  },
    { label: 'Bénéfice Net',   value: fcfa(data.benefice),       color: data.benefice >= 0 ? C.vert : C.rouge },
    { label: 'RDV Terminés',   value: String(data.rdvTermines),  color: C.bleu   },
  ]
  const bW = (W - 28 - 12) / 4
  kpis.forEach((k, i) => {
    const x = 14 + i * (bW + 4)
    doc.setFillColor(...C.gris5)
    doc.roundedRect(x, y, bW, 24, 3, 3, 'F')
    doc.setFillColor(...k.color)
    doc.rect(x, y, bW, 2.5, 'F')
    doc.setTextColor(...C.gris2)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(k.label.toUpperCase(), x + bW / 2, y + 10, { align: 'center' })
    doc.setTextColor(...k.color)
    doc.setFontSize(9)
    doc.text(k.value, x + bW / 2, y + 18, { align: 'center' })
  })
  y += 32

  if (data.topPrestations?.length > 0) {
    y = sectionTitle(doc, y, 'Top Prestations', W)
    y += 2
    doc.setFillColor(...C.noir)
    doc.rect(14, y, W - 28, 8, 'F')
    doc.setTextColor(...C.or)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('#',           18,     y + 5.5)
    doc.text('Prestation',  28,     y + 5.5)
    doc.text('Quantité',    120,    y + 5.5, { align: 'center' })
    doc.text('CA Généré',   W - 16, y + 5.5, { align: 'right' })
    y += 8
    data.topPrestations.forEach((p, i) => {
      if (i % 2 === 0) { doc.setFillColor(...C.gris5); doc.rect(14, y, W - 28, 7, 'F') }
      doc.setTextColor(...C.gris2)
      doc.setFontSize(8)
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal')
      doc.text(String(i + 1), 18, y + 5)
      doc.setTextColor(...C.noir)
      doc.text(p.nom || '—', 28, y + 5)
      doc.text(String(p.count), 120, y + 5, { align: 'center' })
      doc.setTextColor(...C.or)
      doc.text(fcfa(p.ca), W - 16, y + 5, { align: 'right' })
      y += 7
    })
    y += 6
  }

  if (data.topPrestataires?.length > 0) {
    y = sectionTitle(doc, y, 'Performances Prestataires', W)
    y += 2
    doc.setFillColor(...C.noir)
    doc.rect(14, y, W - 28, 8, 'F')
    doc.setTextColor(...C.or)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('Prestataire', 20, y + 5.5)
    doc.text('Prestations', 120, y + 5.5, { align: 'center' })
    doc.text('CA',          155, y + 5.5, { align: 'center' })
    doc.text('Commission',  W - 16, y + 5.5, { align: 'right' })
    y += 8
    data.topPrestataires.forEach((p, i) => {
      if (i % 2 === 0) { doc.setFillColor(...C.gris5); doc.rect(14, y, W - 28, 7, 'F') }
      doc.setTextColor(...C.noir)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(p.nom || '—', 20, y + 5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.gris2)
      doc.text(String(p.count), 120, y + 5, { align: 'center' })
      doc.text(fcfa(p.ca), 155, y + 5, { align: 'center' })
      doc.setTextColor(...C.violet)
      doc.text(fcfa(p.commission), W - 16, y + 5, { align: 'right' })
      y += 7
    })
  }

  drawLuxeFooter(doc, salonInfo)
  doc.save(`Rapport_${fmt(new Date(), 'yyyy-MM-dd')}.pdf`)
}

// ================================================================
//  EXPORT DÉPENSES PDF
// ================================================================
export function exportDepensesPDF(depenses, periode, total, salonInfo = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  let y     = drawLuxeHeader(doc, salonInfo)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.noir)
  doc.text('RAPPORT DES DÉPENSES', 14, y + 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.gris2)
  doc.text(periode, 14, y + 15)
  y += 22

  doc.setFillColor(...C.or)
  doc.rect(14, y, W - 28, 0.6, 'F')
  y += 8

  doc.setFillColor(...C.gris5)
  doc.roundedRect(W - 75, y, 61, 16, 3, 3, 'F')
  doc.setFillColor(...C.rouge)
  doc.rect(W - 75, y, 61, 2.5, 'F')
  doc.setTextColor(...C.gris2)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL DÉPENSES', W - 44.5, y + 8, { align: 'center' })
  doc.setTextColor(...C.rouge)
  doc.setFontSize(10)
  doc.text(fcfa(total), W - 44.5, y + 14, { align: 'center' })
  y += 22

  doc.setFillColor(...C.noir)
  doc.rect(14, y, W - 28, 8, 'F')
  doc.setTextColor(...C.or)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.text('Date',        18, y + 5.5)
  doc.text('Description', 40, y + 5.5)
  doc.text('Catégorie',   110, y + 5.5)
  doc.text('Mode',        145, y + 5.5)
  doc.text('Montant',     W - 16, y + 5.5, { align: 'right' })
  y += 8

  depenses.forEach((d, i) => {
    if (y > 265) { doc.addPage(); y = drawLuxeHeader(doc, salonInfo) + 5 }
    if (i % 2 === 0) { doc.setFillColor(...C.gris5); doc.rect(14, y, W - 28, 7, 'F') }
    doc.setFillColor(...C.rouge); doc.rect(14, y, 2, 7, 'F')
    doc.setTextColor(...C.gris2)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(d.date_depense || '—', 18, y + 5)
    const desc = (d.description || '').length > 35 ? (d.description || '').substring(0, 35) + '…' : (d.description || '')
    doc.setTextColor(...C.noir)
    doc.text(desc, 40, y + 5)
    doc.setTextColor(...C.gris2)
    doc.text(d.categorie || '—', 110, y + 5)
    doc.text(d.mode_paiement || '—', 145, y + 5)
    doc.setTextColor(...C.rouge)
    doc.setFont('helvetica', 'bold')
    doc.text(fcfa(d.montant), W - 16, y + 5, { align: 'right' })
    y += 7
  })

  drawLuxeFooter(doc, salonInfo)
  doc.save(`Depenses_${fmt(new Date(), 'yyyy-MM-dd')}.pdf`)
}
