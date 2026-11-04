// Protocole du fartlek évaluatif (réglable par chaque professeur dans l'onglet Réglages).

export const NIVEAUX = ['N1', 'N2', 'N3']
export const LIBELLE_NIVEAU = { N1: 'Niveau 1', N2: 'Niveau 2', N3: 'Niveau 3' }
export const TOUR = 400

// Découpage d'un tour depuis la ligne de départ
export const SEGMENTS = [
  { type: 'accel', m: 50, libelle: 'Accélération' },
  { type: 'recup', m: 150, libelle: 'Récupération en courant' },
  { type: 'accel', m: 50, libelle: 'Accélération' },
  { type: 'recup', m: 150, libelle: 'Récupération en courant' }
]

export const PROTOCOLE_DEFAUT = { durees: { N1: 20, N2: 22, N3: 25 }, pauseMax: 20 }

export function dureeNiveau(protocole, niveau) {
  const p = protocole || PROTOCOLE_DEFAUT
  return (p.durees?.[niveau] || PROTOCOLE_DEFAUT.durees[niveau]) * 60
}

// Nombre de zones d'accélération dans lesquelles le coureur est entré pour une distance donnée
// (une zone de 50 m au début de chaque demi-tour de 200 m). Une zone entamée sur au moins 25 m compte.
export function zonesAccelParcourues(distance) {
  const d = Math.max(0, Number(distance) || 0)
  const pleins = Math.floor(d / 200)
  return pleins + (d % 200 >= 25 ? 1 : 0)
}

// Où se trouve le coureur dans le tour pour un nombre de mètres après la ligne
export function segmentAuMetre(m) {
  const x = ((Number(m) || 0) % TOUR + TOUR) % TOUR
  let cumul = 0
  for (const s of SEGMENTS) {
    if (x < cumul + s.m) return s
    cumul += s.m
  }
  return SEGMENTS[0]
}
