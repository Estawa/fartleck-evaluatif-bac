// Enregistrement en ligne (Firestore), multi-professeurs.
//
// Projet Firebase « Running » (vma-pro-seances), partagé avec VMA Pro, Relais 200m et Course de
// Durée Pro. Les données de Fartlek Pro sont rangées à part, sous flp_acces et flp_profs, pour ne
// rien mélanger avec les autres applis.
//
//   flp_acces/config                       administrateur + collègues (nom, code)
//   flp_profs/{prof}/meta/roster           classes et élèves
//   flp_profs/{prof}/meta/types            type d'évaluation par classe (gt / pro)
//   flp_profs/{prof}/meta/reglages         protocole + barème provisoire
//   flp_profs/{prof}/pins/{élève}          code PIN personnel de chaque élève
//   flp_profs/{prof}/fiches/{fiche}        fiches d'observation
//   flp_profs/{prof}/notes/{classe}        saisies de notes de la classe
//
// Pas d'authentification Firebase : les codes font office de clé partagée, comme pour les autres
// applis. Chaque lecture garde une copie sur l'appareil, utilisée si le réseau ne répond pas.

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore'
import { local } from './format'
import { PIN_ADMIN_DEFAUT, NOM_ADMIN_DEFAUT } from '../config'

const firebaseConfig = {
  apiKey: 'AIzaSyDqRihpVWPqmw54T6X6zx3PS3F92Wol3Bg',
  authDomain: 'vma-pro-seances.firebaseapp.com',
  projectId: 'vma-pro-seances',
  storageBucket: 'vma-pro-seances.firebasestorage.app',
  messagingSenderId: '378967245770',
  appId: '1:378967245770:web:668b5f0f7251ec8a124533'
}

const ACCES = 'flp_acces'
const PROFS = 'flp_profs'

let db = null
try {
  db = getFirestore(initializeApp(firebaseConfig))
} catch (e) {
  console.warn('Firestore indisponible', e)
}

// --- état de la connexion, affiché par l'appli ---
const ecouteurs = new Set()
let etat = { reglesManquantes: false, horsLigne: false }
function signaler(patch) {
  etat = { ...etat, ...patch }
  ecouteurs.forEach((f) => f(etat))
}
export function ecouterEtatCloud(f) { ecouteurs.add(f); f(etat); return () => ecouteurs.delete(f) }

function erreur(e, quoi) {
  console.warn(quoi, e)
  if (e?.code === 'permission-denied') signaler({ reglesManquantes: true })
  if (e?.code === 'unavailable' || e?.message === 'delai') signaler({ horsLigne: true })
}
const ok = () => { if (etat.horsLigne) signaler({ horsLigne: false }) }

// Firestore attend parfois très longtemps sans réseau : on abandonne au bout de quelques secondes
function avecDelai(promesse, ms = 9000) {
  return Promise.race([promesse, new Promise((_, rej) => setTimeout(() => rej(new Error('delai')), ms))])
}
// Firestore refuse les champs « undefined » : passer par JSON les retire
const nettoyer = (v) => JSON.parse(JSON.stringify(v))
const cleClasse = (classe) => String(classe || 'sans-nom').replace(/[/#?[\]]/g, '_')

async function lireDoc(chemin, cleCache, defaut) {
  if (!db) return local.lire(cleCache, defaut)
  try {
    const snap = await avecDelai(getDoc(doc(db, ...chemin)))
    ok()
    const v = snap.exists() ? snap.data() : defaut
    local.ecrire(cleCache, v)
    return v
  } catch (e) {
    erreur(e, `Lecture ${chemin.join('/')}`)
    return local.lire(cleCache, defaut)
  }
}
async function ecrireDoc(chemin, valeur, cleCache) {
  if (cleCache) local.ecrire(cleCache, valeur)
  if (!db) return false
  try {
    await avecDelai(setDoc(doc(db, ...chemin), nettoyer(valeur)), 15000)
    ok()
    return true
  } catch (e) {
    erreur(e, `Écriture ${chemin.join('/')}`)
    return false
  }
}

// ---------------- Accès ----------------
export function accesParDefaut() {
  return { pinAdmin: PIN_ADMIN_DEFAUT, nomAdmin: NOM_ADMIN_DEFAUT, collegues: [] }
}
export async function chargerAcces() {
  const d = await lireDoc([ACCES, 'config'], 'flp_cache_acces', null)
  const base = accesParDefaut()
  if (!d) return base
  return { pinAdmin: d.pinAdmin || base.pinAdmin, nomAdmin: d.nomAdmin || base.nomAdmin, collegues: Array.isArray(d.collegues) ? d.collegues : [] }
}
export const enregistrerAcces = (config) => ecrireDoc([ACCES, 'config'], config, 'flp_cache_acces')

// Liste des professeurs proposés aux élèves et à la connexion
export function listeProfs(acces) {
  return [{ id: 'admin', nom: acces.nomAdmin, admin: true }, ...acces.collegues.map((c) => ({ id: c.id, nom: c.nom }))]
}

// ---------------- Classes ----------------
export async function chargerRoster(prof) {
  const d = await lireDoc([PROFS, prof, 'meta', 'roster'], `flp_cache_roster_${prof}`, { classes: {} })
  return d?.classes || {}
}
export const enregistrerRoster = (prof, classes) => ecrireDoc([PROFS, prof, 'meta', 'roster'], { classes }, `flp_cache_roster_${prof}`)

export async function chargerTypes(prof) {
  const d = await lireDoc([PROFS, prof, 'meta', 'types'], `flp_cache_types_${prof}`, { types: {} })
  return d?.types || {}
}
export const enregistrerTypes = (prof, types) => ecrireDoc([PROFS, prof, 'meta', 'types'], { types }, `flp_cache_types_${prof}`)

export const chargerReglages = (prof) => lireDoc([PROFS, prof, 'meta', 'reglages'], `flp_cache_reglages_${prof}`, null)
export const enregistrerReglages = (prof, r) => ecrireDoc([PROFS, prof, 'meta', 'reglages'], r, `flp_cache_reglages_${prof}`)

// ---------------- Codes PIN des élèves ----------------
export async function chargerPin(prof, eleveId) {
  const d = await lireDoc([PROFS, prof, 'pins', eleveId], `flp_cache_pin_${prof}_${eleveId}`, null)
  return d?.pin || null
}
export const enregistrerPin = (prof, eleveId, pin) => ecrireDoc([PROFS, prof, 'pins', eleveId], { pin }, `flp_cache_pin_${prof}_${eleveId}`)
export async function effacerPin(prof, eleveId) {
  local.effacer(`flp_cache_pin_${prof}_${eleveId}`)
  if (!db) return false
  try { await avecDelai(deleteDoc(doc(db, PROFS, prof, 'pins', eleveId))); return true } catch (e) { erreur(e, 'Effacement PIN'); return false }
}
export async function chargerPinsDefinis(prof) {
  if (!db) return {}
  try {
    const snap = await avecDelai(getDocs(collection(db, PROFS, prof, 'pins')))
    ok()
    const res = {}
    snap.docs.forEach((d) => { res[d.id] = true })
    return res
  } catch (e) { erreur(e, 'Lecture des PIN'); return {} }
}

// ---------------- Fiches ----------------
export async function chargerFiches(prof) {
  const cle = `flp_cache_fiches_${prof}`
  if (!db) return local.lire(cle, [])
  try {
    const snap = await avecDelai(getDocs(collection(db, PROFS, prof, 'fiches')), 15000)
    ok()
    const liste = snap.docs.map((d) => d.data())
    local.ecrire(cle, liste)
    return liste
  } catch (e) {
    erreur(e, 'Lecture des fiches')
    return local.lire(cle, [])
  }
}
export async function chargerFichesEleve(prof, eleveId) {
  if (!db) return []
  try {
    const col = collection(db, PROFS, prof, 'fiches')
    const [a, b] = await avecDelai(Promise.all([
      getDocs(query(col, where('coureurId', '==', eleveId))),
      getDocs(query(col, where('observateurId', '==', eleveId)))
    ]))
    ok()
    return { courses: a.docs.map((d) => d.data()), observations: b.docs.map((d) => d.data()) }
  } catch (e) {
    erreur(e, 'Lecture des fiches de l’élève')
    return null
  }
}
export const enregistrerFiche = (prof, fiche) => ecrireDoc([PROFS, prof, 'fiches', fiche.id], fiche)
export async function supprimerFiche(prof, ficheId) {
  if (!db) return false
  try { await avecDelai(deleteDoc(doc(db, PROFS, prof, 'fiches', ficheId))); return true } catch (e) { erreur(e, 'Suppression fiche'); return false }
}

// ---------------- Notes ----------------
export async function chargerNotes(prof, classe) {
  const d = await lireDoc([PROFS, prof, 'notes', cleClasse(classe)], `flp_cache_notes_${prof}_${cleClasse(classe)}`, null)
  return { eleves: d?.eleves || {}, retenue: d?.retenue || {} }
}
export const enregistrerNotes = (prof, classe, data) => ecrireDoc([PROFS, prof, 'notes', cleClasse(classe)], { classe, ...data }, `flp_cache_notes_${prof}_${cleClasse(classe)}`)

// ---------------- File d'envoi des fiches (réseau absent sur la piste) ----------------
// Chaque fiche est d'abord gardée sur le téléphone, puis envoyée ; elle n'est retirée de la file
// qu'une fois l'enregistrement en ligne confirmé.
const FILE = 'flp_file_envoi'
export const ficheEnAttente = () => local.lire(FILE, [])
export function mettreEnFile(prof, fiche) {
  const f = ficheEnAttente().filter((x) => x.fiche.id !== fiche.id)
  local.ecrire(FILE, [...f, { prof, fiche }])
}
let envoiEnCours = false
export async function viderFile() {
  if (envoiEnCours) return ficheEnAttente().length
  envoiEnCours = true
  try {
    for (const { prof, fiche } of ficheEnAttente()) {
      const reussi = await enregistrerFiche(prof, fiche)
      if (reussi) local.ecrire(FILE, ficheEnAttente().filter((x) => x.fiche.id !== fiche.id))
    }
  } finally {
    envoiEnCours = false
  }
  return ficheEnAttente().length
}
