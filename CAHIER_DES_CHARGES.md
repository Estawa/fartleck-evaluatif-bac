# Cahier des charges — Fartleck Évaluatif Bac

## Objectif
Fournir un outil mobile simple à l'observateur d'un élève pendant une évaluation de course de type fartleck en EPS.

## Protocole d'évaluation
- Trois niveaux : N1 20 min, N2 22 min, N3 25 min.
- Piste de 400 m divisée en 50 m d'accélération, 150 m de récupération en course, 50 m d'accélération et 150 m de récupération en course.
- Zone de récupération/hydratation autorisée à proximité du départ/arrivée, limitée à 20 secondes.
- Le temps effectif de course exclut les pauses autorisées dans cette zone.
- Au-delà de 20 secondes, un arrêt interdit supplémentaire est ajouté.
- Marcher ou s'arrêter ailleurs sur la piste est interdit et doit être signalé.
- Les rôles coureur/observateur sont inversés ensuite selon l'organisation de l'enseignant.

## Données de la fiche
- Coureur, classe, observateur, niveau, date.
- Heure de départ et heure d'arrivée.
- Temps effectif.
- Nombre de tours.
- Accélérations invalidées.
- Arrêts ou marche interdits.
- Récupérations autorisées.
- Distance finale exacte saisie manuellement.
- Observations libres.

## Fonctions présentes dans la version initiale
- Interface responsive adaptée au téléphone.
- Chronomètre effectif avec pause de récupération.
- Compteurs modifiables avec boutons + et −.
- Enregistrement local sur l'appareil.
- Export CSV des fiches.
- Impression navigateur, avec possibilité d'enregistrer en PDF.
- Mise en cache PWA après premier chargement pour usage hors connexion.

## Fonctions à développer ensuite
- Espace enseignant sécurisé et centralisé.
- Transmission des fiches depuis les téléphones des observateurs.
- Confirmation de réception avant suppression éventuelle des données locales.
- Verrouillage des fiches après validation.
- Export centralisé PDF, Excel et CSV.
- Gestion des classes et listes d'élèves.
- QR code pointant vers l'adresse définitive de l'application.

## Sécurité et confidentialité
La version initiale ne transmet aucune donnée à un serveur : les fiches restent dans le stockage du navigateur. Toute future centralisation nécessitera un backend, une authentification enseignant et des règles d'accès strictes. Ne pas déposer de données d'élèves dans le dépôt GitHub.
