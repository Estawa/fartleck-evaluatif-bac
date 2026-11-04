// Barème PROVISOIRE de la performance (modifiable par chaque professeur dans l'onglet Réglages).
//
// À partir de la fiche d'observation, 3 indicateurs reçoivent chacun un degré de 1 à 4 :
//   - Distance parcourue, comparée à des repères selon le niveau choisi et le sexe ;
//   - Accélérations réussies (zones de 50 m entamées moins accélérations ratées), en % ;
//   - Arrêts / marche interdits (dont les pauses de plus de 20 s).
// La moyenne pondérée des 3 degrés (de 1 à 4) donne les points de l'élément 1 (Bac GT, /8) ou de
// l'AFLP 1 (Bac Pro, /7) : degré 1 -> haut de la plage D1, degré 4 -> note maximale, avec une
// progression continue entre les deux, arrondie au pas de la grille (0,25 en GT, 0,5 en Pro).
// Plafond par niveau : un niveau 1 ne peut pas obtenir tous les points (valorise le niveau 3).
// La note proposée reste modifiable à la main par le professeur.

import { PROTOCOLE_DEFAUT, zonesAccelParcourues } from './protocole'
import { ELEMENTS, pointsRepartition, pointsFixes } from './bacGrilles'

export const BAREME_DEFAUT = {
  // repères de distance (m) : minimum pour le degré 2, le degré 3, le degré 4
  distance: {
    N1: { G: [2600, 3000, 3400], F: [2200, 2550, 2900] },
    N2: { G: [2900, 3350, 3800], F: [2450, 2850, 3250] },
    N3: { G: [3400, 3900, 4400], F: [2850, 3300, 3750] }
  },
  // % d'accélérations réussies minimum pour le degré 2, le degré 3, le degré 4
  accel: [50, 75, 90],
  // nombre maximum d'arrêts interdits pour le degré 4, le degré 3, le degré 2 (au-delà : degré 1)
  arrets: [0, 2, 4],
  poids: { distance: 2, accel: 1, arrets: 1 },
  // plafond de points selon le niveau choisi, en % des points de l'élément
  plafonds: { N1: 70, N2: 85, N3: 100 }
}

export const REGLAGES_DEFAUT = { protocole: PROTOCOLE_DEFAUT, bareme: BAREME_DEFAUT, provisoire: true }

// Complète des réglages enregistrés avec les valeurs par défaut (réglages anciens ou partiels)
export function completerReglages(r) {
  const b = r?.bareme || {}
  const p = r?.protocole || {}
  return {
    provisoire: r?.provisoire !== false,
    protocole: { durees: { ...PROTOCOLE_DEFAUT.durees, ...(p.durees || {}) }, pauseMax: p.pauseMax || PROTOCOLE_DEFAUT.pauseMax },
    bareme: {
      distance: {
        N1: { ...BAREME_DEFAUT.distance.N1, ...(b.distance?.N1 || {}) },
        N2: { ...BAREME_DEFAUT.distance.N2, ...(b.distance?.N2 || {}) },
        N3: { ...BAREME_DEFAUT.distance.N3, ...(b.distance?.N3 || {}) }
      },
      accel: Array.isArray(b.accel) && b.accel.length === 3 ? b.accel : BAREME_DEFAUT.accel,
      arrets: Array.isArray(b.arrets) && b.arrets.length === 3 ? b.arrets : BAREME_DEFAUT.arrets,
      poids: { ...BAREME_DEFAUT.poids, ...(b.poids || {}) },
      plafonds: { ...BAREME_DEFAUT.plafonds, ...(b.plafonds || {}) }
    }
  }
}

const r2 = (v) => Math.round(v * 100) / 100
const arrondirPas = (v, pas) => Math.round(v / pas) * pas

function seuilsDistance(bareme, niveau, sexe) {
  const t = bareme.distance[niveau] || bareme.distance.N1
  if (sexe === 'F') return t.F
  if (sexe === 'M' || sexe === 'G') return t.G
  return t.G.map((g, i) => Math.round((g + t.F[i]) / 2)) // sexe inconnu : moyenne des deux
}

export function degreDistance(distance, seuils) {
  if (distance >= seuils[2]) return 4
  if (distance >= seuils[1]) return 3
  if (distance >= seuils[0]) return 2
  return 1
}
export function degreAccel(pct, seuils) {
  if (pct >= seuils[2]) return 4
  if (pct >= seuils[1]) return 3
  if (pct >= seuils[0]) return 2
  return 1
}
export function degreArrets(n, seuils) {
  if (n <= seuils[0]) return 4
  if (n <= seuils[1]) return 3
  if (n <= seuils[2]) return 2
  return 1
}

// Calcule la performance proposée pour une fiche. typeBac : 'gt' | 'pro'.
export function calculerPerformance(fiche, typeBac, reglages, sexe) {
  if (!fiche || !typeBac) return null
  const { bareme } = completerReglages(reglages)
  const el = ELEMENTS[typeBac === 'gt' ? 'gt' : 'pro'][0]
  const distance = Number(fiche.distance) || 0
  const zones = zonesAccelParcourues(distance)
  const ratees = Math.min(zones, Number(fiche.accRatees) || 0)
  const pctAccel = zones ? Math.round(((zones - ratees) / zones) * 100) : 0
  const arrets = Number(fiche.arretsInterdits) || 0
  const seuils = seuilsDistance(bareme, fiche.niveau, sexe ?? fiche.sexe)

  const dD = degreDistance(distance, seuils)
  const dA = degreAccel(pctAccel, bareme.accel)
  const dR = degreArrets(arrets, bareme.arrets)
  const p = bareme.poids
  const somme = (p.distance || 0) + (p.accel || 0) + (p.arrets || 0) || 1
  const degreMoyen = (dD * (p.distance || 0) + dA * (p.accel || 0) + dR * (p.arrets || 0)) / somme

  let points = arrondirPas((el.sur * (degreMoyen - 0.5)) / 3.5, el.pas)
  const plafondPct = bareme.plafonds[fiche.niveau] ?? 100
  const plafond = arrondirPas((el.sur * plafondPct) / 100, el.pas)
  const plafonne = points > plafond
  if (plafonne) points = plafond
  points = r2(Math.max(0, Math.min(el.sur, points)))
  const degre = [4, 3, 2, 1].find((d) => points >= el.plages[d][0]) || 1

  return {
    cle: el.cle, sur: el.sur, points, degre, degreMoyen: r2(degreMoyen), plafond, plafonne,
    details: { distance, seuils, dD, zones, ratees, pctAccel, dA, arrets, dR }
  }
}

// Note complète d'un élève : performance (auto ou corrigée), élément 2 / AFLP 2, fil de séquence.
export function calculerNote(typeBac, saisie, perf) {
  const s = saisie || {}
  const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : null)
  const [pa, pb] = pointsRepartition(s.repartition)
  const p1 = num(s.perfManuelle) ?? (perf ? perf.points : null)
  if (typeBac === 'gt') {
    const e2 = s.e2Degre ? s.e2Degre : null
    const afl2 = pointsFixes(pa, s.afl2Degre)
    const afl3 = s.afl3Role ? pointsFixes(pb, s.afl3Degre) : null
    const fin = p1 == null && e2 == null ? null : r2((p1 ?? 0) + (e2 ?? 0))
    const fil = afl2 == null && afl3 == null ? null : r2((afl2 ?? 0) + (afl3 ?? 0))
    return { e1: p1, e2, afl2, afl3, fin, fil, pa, pb, total: fin == null && fil == null ? null : r2((fin ?? 0) + (fil ?? 0)) }
  }
  const aflp2 = num(s.aflp2Note), aflp3 = num(s.aflp3Note), aflp4 = num(s.aflp4Note)
  const fin = p1 == null && aflp2 == null ? null : r2((p1 ?? 0) + (aflp2 ?? 0))
  const fil = aflp3 == null && aflp4 == null ? null : r2((aflp3 ?? 0) + (aflp4 ?? 0))
  return { aflp1: p1, aflp2, aflp3, aflp4, fin, fil, pa, pb, total: fin == null && fil == null ? null : r2((fin ?? 0) + (fil ?? 0)) }
}
