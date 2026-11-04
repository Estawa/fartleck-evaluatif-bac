import pkg from '../package.json'

export const APP = {
  nom: 'Fartlek Pro',
  auteur: 'C. Guilhem',
  version: pkg.version,
  notice: '/Notice-Fartlek-Pro.pdf'
}

// Code de l'administrateur au tout premier lancement (modifiable ensuite dans l'onglet Accès).
export const PIN_ADMIN_DEFAUT = '8484'
export const NOM_ADMIN_DEFAUT = 'Mr Guilhem'
