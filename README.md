# Fartleck Évaluatif Bac

Application web progressive mobile-first pour le suivi d'une évaluation de fartleck en EPS.

## Mise en ligne avec GitHub Pages
1. Décompresser l'archive.
2. Ouvrir le dépôt GitHub `Estawa/fartleck-evaluatif-bac`.
3. Choisir **Add file > Upload files**.
4. Envoyer tous les fichiers et le dossier éventuel à la racine du dépôt.
5. Valider avec **Commit changes**.
6. Dans **Settings > Pages**, sélectionner **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis enregistrer.

## Utilisation
Renseigner le coureur, l'observateur, la classe, le niveau et la date. Démarrer le chrono, utiliser les compteurs et la pause de récupération de 20 secondes, terminer la course, puis enregistrer ou imprimer la fiche. Les fiches peuvent être exportées au format CSV.

## Règles intégrées
- N1 : 20 minutes ; N2 : 22 minutes ; N3 : 25 minutes.
- Tour de 400 m : 50 m d'accélération, 150 m de récupération, 50 m d'accélération, 150 m de récupération.
- Zone autorisée de récupération : 20 secondes maximum. Le chrono effectif est suspendu pendant cette pause.
- Les arrêts ou la marche hors de la zone sont comptabilisés comme interdits.

## Limites importantes
Ceci est une première version locale. Les fiches sont conservées dans le navigateur de l'appareil, sans envoi automatique à un espace enseignant. Exporter régulièrement le CSV. Les données peuvent être perdues si les données du navigateur sont supprimées ou si l'appareil est changé. La distance finale est saisie manuellement. L'impression PDF est déclenchée depuis le navigateur.
