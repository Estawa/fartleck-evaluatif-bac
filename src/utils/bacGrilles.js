// Grilles du bac (protocoles du lycée Georges-Brassens, reprises de Course de Durée Pro).
// Ici, l'élément 1 (Bac GT) et l'AFLP 1 (Bac Pro) sont proposés automatiquement à partir de la
// fiche d'observation et du barème provisoire (voir bareme.js) ; le professeur garde la main.
//
// BAC GT — AFL 1 /12 = élément 1 « produire » /8 + élément 2 « analyser » /4.
//   Fil de séquence /8 : AFL 2 + AFL 3 (un rôle : coach OU observateur-collecteur), points fixes.
// BAC PRO — AFLP 1 /7 + AFLP 2 /5. Fil de séquence /8 : AFLP 3 + AFLP 4, plages.

export const ELEMENTS = {
  gt: [
    {
      cle: 'e1', titre: 'Élément 1 — Produire : effort adapté à ses ressources', sur: 8, pas: 0.25,
      plages: { 1: [0, 1.75], 2: [2, 3.75], 3: [4, 5.75], 4: [6, 8] },
      degres: [
        'Arrêt prématuré ou nombreux arrêts / marche ; accélérations très peu marquées ; distance très en dessous du niveau choisi.',
        'Plusieurs arrêts interdits ; accélérations marquées de façon irrégulière ; distance en dessous du niveau choisi.',
        'Course régulière avec peu d’arrêts ; la plupart des accélérations marquées ; distance conforme au niveau choisi.',
        'Course continue sans arrêt interdit ; accélérations toujours marquées ; distance au-dessus du niveau choisi, aux limites de ses possibilités.',
      ],
    },
    {
      cle: 'e2', titre: 'Élément 2 — Analyser ses ressentis et réguler', sur: 4, fixe: [1, 2, 3, 4],
      degres: [
        'Absence de bilan ou bilan parcellaire ; pas d’adaptation ni de perspective ; connaissances inexistantes ou erronées.',
        'Bilan sommaire, analyse évasive ou en décalage avec le réalisé ; pas de perspective ; connaissances parfois erronées.',
        'Bilan réaliste ; régulation et perspectives globales ; quelques connaissances sur l’entraînement.',
        'Bilan expliqué, analyse pertinente et justifiée ; pistes précises ; connaissances élargies (entraînement, diététique, hygiène de vie).',
      ],
    },
  ],
  pro: [
    {
      cle: 'aflp1', titre: 'AFLP 1 — Concevoir et mettre en œuvre un projet d’entraînement', sur: 7, pas: 0.5,
      plages: { 1: [0, 1], 2: [1.5, 3], 3: [3.5, 5], 4: [5.5, 7] },
      degres: [
        'Niveau inadapté ; arrêt prématuré ou nombreux arrêts / marche ; accélérations très peu marquées.',
        'Niveau éloigné de ses possibilités ; plusieurs arrêts interdits ; accélérations irrégulières ; distance en dessous du niveau.',
        'Niveau cohérent ; engagement réel, peu d’arrêts ; la plupart des accélérations marquées ; distance conforme.',
        'Niveau individualisé, aux limites de ses possibilités ; engagement maximal, aucun arrêt interdit ; distance au-dessus du niveau.',
      ],
    },
    {
      cle: 'aflp2', titre: 'AFLP 2 — Éprouver différentes méthodes d’entraînement', sur: 5, pas: 0.5,
      plages: { 1: [0, 0.5], 2: [1, 2], 3: [2.5, 4], 4: [4.5, 5] },
      degres: [
        'Une seule méthode, mal appliquée ; principes techniques de course et gestion de l’effort pas ou très peu appliqués.',
        'Une seule méthode, appliquée de manière inconstante ; principes techniques trop peu appliqués.',
        'Plusieurs méthodes utilisées dans la séance (continu, intermittent) ; consignes techniques partiellement appliquées.',
        'Plusieurs méthodes utilisées pour optimiser les effets recherchés ; application constante des consignes d’efficacité.',
      ],
    },
  ],
}

export const DEGRES_AFL2_GT = [
  'L’occasionnel : carnet complété seulement s’il y est obligé, oublis ; ne s’engage pas ou peu ; séquence inadaptée ou copiée.',
  'Le consommateur d’entraînement : carnet incomplet ; engagement insuffisant ; projet stéréotypé, incohérences.',
  'Le concepteur débutant : carnet utilisé pour suivre et réguler (prévu / réalisé, ressentis) ; s’engage ; séquences cohérentes.',
  'Le concepteur pertinent : carnet complet, bilan et régulation ; moteur et engagé ; projet personnalisé et justifié.',
]

export const ROLES_AFL3_GT = [
  {
    id: 'coach', libelle: 'Coach',
    degres: [
      'Agit seul ; peu ou pas attentif à l’allure, l’intensité, la respiration ; n’apporte pas de conseils.',
      'Collabore ponctuellement ; partiellement attentif ; conseils surtout d’encouragement.',
      'Disponible et réactif ; attentif à l’observation OU à l’écart allure prévue / réalisée ; commence à aider la régulation.',
      'Conseille à partir d’indicateurs précis ; attentif à l’observation ET à l’écart d’allure ; favorise la régulation in situ.',
    ],
  },
  {
    id: 'observateur', libelle: 'Observateur-collecteur',
    degres: [
      'Peu ou pas attentif ; énormément de fautes dans le relevé.',
      'Partiellement attentif ; plus de 60 % de données satisfaisantes.',
      'Attentif et impliqué ; plus de 80 % de données satisfaisantes.',
      'Très attentif et impliqué ; recueil des données parfait.',
    ],
  },
]

export const DEGRES_PRO_AFLP3 = [
  'Aucun retour réflexif ; ne régule pas sa charge de travail.',
  'Début d’analyse superficiel ; pas de perspective ni d’alternative.',
  'Analyse sa pratique, propose des régulations cohérentes selon quelques indicateurs ; perspectives globales.',
  'Analyse pertinente et justifiée dans la majorité des séances ; régulations liées à des indicateurs précis ; pistes précises.',
]

export const DEGRES_PRO_AFLP4 = [
  'Ne s’investit pas dans les rôles d’observateur-collecteur ou de coach ; agit seul.',
  'S’investit partiellement ; partiellement attentif ; collabore ponctuellement.',
  'S’investit régulièrement ; attentif et impliqué ; aide son partenaire à partir d’indicateurs simples.',
  'S’investit à chaque séance pour faire progresser ses camarades ; conseille à partir d’indicateurs précis.',
]

export const REPARTITIONS = ['6-2', '4-4', '2-6']
export function pointsRepartition(r) {
  return (REPARTITIONS.includes(r) ? r : '4-4').split('-').map(Number)
}
export function pointsFixes(pts, degre) {
  return degre ? (pts * degre) / 4 : null
}
const PLAGES_FIL = {
  2: [[0, 0.4], [0.5, 0.9], [1, 1.4], [1.5, 2]],
  4: [[0, 0.9], [1, 1.9], [2, 2.9], [3, 4]],
  6: [[0, 1.4], [1.5, 2.9], [3, 4.4], [4.5, 6]],
}
export function plageFil(pts, degre) {
  return degre ? PLAGES_FIL[pts]?.[degre - 1] || null : null
}
export function valeurs([min, max], pas) {
  const res = []
  for (let v = min; v <= max + 1e-9; v += pas) res.push(Math.round(v * 100) / 100)
  return res
}

