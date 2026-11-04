# Fartlek Pro by C. Guilhem

Évaluation du **fartlek** en EPS (Bac GT et Bac Pro) : un élève court, son camarade l'observe sur son téléphone
(chrono effectif, tours, accélérations ratées, arrêts interdits, pauses de 20 s), la fiche part chez le professeur,
qui retrouve fiches et proposition de note.

Notice : `public/Notice-Fartlek-Pro.pdf` (aussi accessible dans l'appli, icône livre).
Journal des modifications : `CHANGELOG.txt` (et dans l'appli, en touchant le numéro de version).

## Pile technique
React + Vite + Tailwind + lucide-react, PWA (vite-plugin-pwa), Firestore.

## Mise en ligne (Vercel)
1. Vercel > **Add New > Project** > importer le dépôt `Estawa/fartleck-evaluatif-bac`.
2. Framework : **Vite** (détecté tout seul). Build : `npm run build`, dossier de sortie : `dist`.
3. Chaque envoi sur GitHub redéploie l'appli ; les téléphones se mettent à jour à l'ouverture suivante.
4. L'ancienne publication GitHub Pages (version ChatGPT) peut être désactivée : Settings > Pages > None.

## Firebase (projet « Running » = vma-pro-seances)
Pas de nouveau projet : l'appli range ses données à part, sous `flp_acces` et `flp_profs`.
**À ajouter une fois** dans la console Firebase > Firestore > Règles, à l'intérieur de `match /databases/{database}/documents { … }`,
à côté des règles déjà présentes pour les autres applis :

```
match /flp_acces/{document=**} { allow read, write: if true; }
match /flp_profs/{document=**} { allow read, write: if true; }
```

Sans ces règles, un bandeau rouge l'indique dans l'appli et les données restent sur l'appareil.

Structure :
- `flp_acces/config` : administrateur et collègues (nom, code)
- `flp_profs/{prof}/meta/roster` : classes et élèves ; `meta/types` : Bac GT / Bac Pro par classe ; `meta/reglages` : protocole et barème
- `flp_profs/{prof}/pins/{élève}` : code PIN personnel
- `flp_profs/{prof}/fiches/{fiche}` : fiches d'observation
- `flp_profs/{prof}/notes/{classe}` : saisies de notes

Code administrateur au premier lancement : 8484 (à changer dans l'onglet Accès).

## Code
- `src/components/Observation.jsx` : préparation, course, distance, bilan, envoi
- `src/utils/bareme.js` : barème provisoire de la performance ; `src/utils/bacGrilles.js` : grilles Bac GT / Bac Pro
- `src/utils/cloud.js` : Firestore + file d'envoi hors réseau
- `docs/guide.md` + `docs/generer_guide.py` : source de la notice PDF (`python3 docs/generer_guide.py docs/guide.md public/Notice-Fartlek-Pro.pdf`)
