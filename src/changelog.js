// Journal des modifications affiché dans l'appli (même contenu que CHANGELOG.txt).
export const CHANGELOG = [
  {
    version: '1.0.0',
    titre: 'Première version (reprise complète de la version ChatGPT « Fartleck évaluatif Bac »)',
    points: [
      'Protocole repris : Niveau 1 = 20 min, Niveau 2 = 22 min, Niveau 3 = 25 min ; tour de 400 m = 50 m accélération / 150 m récupération / 50 m accélération / 150 m récupération ; pause de 20 s maximum dans la zone de départ, chrono effectif arrêté pendant la pause',
      'Pause de plus de 20 s : un arrêt interdit est compté et le chrono effectif repart tout seul',
      'Écran d’accueil, connexion élève (professeur, classe, nom, code PIN personnel) et connexion professeur (nom + code)',
      'Observation sur la piste par un camarade (ou par le professeur) : gros chrono effectif, temps restant, boutons « +1 tour », « Accélération ratée », « Arrêt / marche interdit », « Pause zone (20 s) », tous annulables ; bips de départ, dernière minute et fin ; écran maintenu allumé',
      'Fin automatique à la durée du niveau ; arrêt anticipé possible (avec confirmation)',
      'Distance : tours comptés × 400 m + mètres du dernier tour (repères des plots), l’élève fait lui-même le calcul et l’appli lui dit s’il est juste ; conversion en km et m',
      'Ressenti du coureur (échelle de Borg 0 à 10) et observations, puis envoi de la fiche au professeur avec confirmation de réception ; si le réseau manque, la fiche reste sur le téléphone et part dès que le réseau revient',
      'Une course interrompue (appli fermée, téléphone verrouillé) peut être reprise',
      'Espace professeur : classes (import CSV, Excel, ODS avec choix des colonnes, ajout, modification, suppression d’élèves et de classes), type d’évaluation Bac GT ou Bac Pro par classe, fiches reçues (détail, chronologie, correction, suppression, export CSV)',
      'Notes : performance calculée avec un barème provisoire modifiable (distance selon le niveau et le sexe, accélérations réussies, arrêts interdits, plafond par niveau), puis élément 2 / AFLP 2 et fil de séquence saisis par degrés ; total sur 20, récapitulatif imprimable en noir et blanc et export CSV',
      'Onglet Réglages : durées des niveaux, durée de la pause, barème provisoire',
      'Onglet Accès (administrateur) : collègues avec code personnel, réinitialisation, et consultation de l’espace de chaque collègue',
      'Côté élève : « Mes courses » (caractéristiques de ses courses, jamais la note) et rappel du protocole',
      'Mode jour / nuit, flashcode et lien de partage, notice PDF intégrée'
    ]
  }
]
