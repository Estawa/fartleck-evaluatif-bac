import { useEffect, useReducer, useRef, useState } from 'react'
import { Play, Plus, Minus, PauseCircle, PlayCircle, Flag, AlertTriangle, Check, ChevronRight, ChevronLeft, CloudOff, Send, RotateCcw, Info } from 'lucide-react'
import Liste from './Liste'
import { Confirmation } from './Modale'
import { NIVEAUX, LIBELLE_NIVEAU, TOUR, SEGMENTS, dureeNiveau, segmentAuMetre } from '../utils/protocole'
import { chrono, kmM, nomComplet, id as nouvelId, local } from '../utils/format'
import { mettreEnFile, viderFile, ficheEnAttente } from '../utils/cloud'
import { activerSon, bipDepart, bipCourt, bipAlerte, bipFin, vibrer, dire, garderEcranAllume, libererEcran } from '../utils/sons'

// Observation d'un coureur sur la piste, par un camarade (ou par le professeur) :
// préparation -> course (chrono effectif + compteurs) -> distance -> bilan -> envoi.
// L'état est sauvegardé en permanence sur le téléphone : une course interrompue (appli fermée,
// écran verrouillé) peut être reprise là où elle en était.

const CLE = 'flp_obs_en_cours'

const BORG = [
  [0, 'Repos'], [1, 'Très très facile'], [2, 'Facile'], [3, 'Modéré'], [4, 'Un peu difficile'], [5, 'Difficile'],
  [6, 'Difficile +'], [7, 'Très difficile'], [8, 'Très difficile +'], [9, 'Très très difficile'], [10, 'Maximal']
]

const courseInitiale = () => ({
  phase: 'attente', cumulMs: 0, debutMs: null, pauseDebutMs: null, tempsPauseMs: 0,
  tours: 0, accRatees: 0, arrets: 0, pauses: 0, pausesDepassees: 0,
  evts: [], heureDepart: null, heureFin: null, arretAnticipe: false,
  derniereMinute: false, son: null, message: null
})

const effMs = (c, now) => c.cumulMs + (c.phase === 'course' && c.debutMs ? now - c.debutMs : 0)

function evt(c, now, type) {
  return [...c.evts, { t: Math.round(effMs(c, now) / 1000), h: now, type }]
}
const son = (type) => ({ type, n: Date.now() + Math.random() })

function reduire(c, a) {
  const now = a.now || Date.now()
  switch (a.type) {
    case 'depart':
      if (c.phase !== 'attente') return c
      return { ...c, phase: 'course', debutMs: now, heureDepart: now, evts: [{ t: 0, h: now, type: 'depart' }], son: son('depart') }
    case 'compteur': {
      if (c.phase !== 'course' && c.phase !== 'pause') return c
      const v = Math.max(0, c[a.cle] + a.delta)
      if (v === c[a.cle]) return c
      return { ...c, [a.cle]: v, evts: evt(c, now, `${a.delta > 0 ? '' : 'annul_'}${a.cle}`), son: a.delta > 0 ? son('court') : null }
    }
    case 'pause':
      if (c.phase !== 'course') return c
      return { ...c, phase: 'pause', cumulMs: effMs(c, now), debutMs: null, pauseDebutMs: now, pauses: c.pauses + 1, evts: evt(c, now, 'pause'), son: son('court') }
    case 'reprise':
      if (c.phase !== 'pause') return c
      return { ...c, phase: 'course', debutMs: now, tempsPauseMs: c.tempsPauseMs + (now - c.pauseDebutMs), pauseDebutMs: null, evts: evt(c, now, 'reprise'), son: son('court') }
    case 'abandon': {
      if (c.phase === 'attente' || c.phase === 'fini') return c
      const base = c.phase === 'pause' ? { ...c, tempsPauseMs: c.tempsPauseMs + (now - c.pauseDebutMs) } : c
      return { ...base, phase: 'fini', cumulMs: effMs(c, now), debutMs: null, pauseDebutMs: null, heureFin: now, arretAnticipe: true, evts: evt(c, now, 'abandon'), son: son('fin') }
    }
    case 'tick': {
      const cible = a.cibleMs
      const pauseMax = a.pauseMaxMs
      if (c.phase === 'course') {
        const e = effMs(c, now)
        if (e >= cible) {
          const fin = c.debutMs + (cible - c.cumulMs)
          return { ...c, phase: 'fini', cumulMs: cible, debutMs: null, heureFin: fin, evts: [...c.evts, { t: Math.round(cible / 1000), h: fin, type: 'fin' }], son: son('fin') }
        }
        if (!c.derniereMinute && cible - e <= 60000 && cible > 120000) return { ...c, derniereMinute: true, son: son('derniere') }
        return c
      }
      if (c.phase === 'pause' && now - c.pauseDebutMs >= pauseMax) {
        // Pause trop longue : un arrêt interdit est compté et le chrono effectif repart tout seul,
        // exactement à la fin des secondes autorisées.
        const reprise = c.pauseDebutMs + pauseMax
        return {
          ...c, phase: 'course', debutMs: reprise, tempsPauseMs: c.tempsPauseMs + pauseMax, pauseDebutMs: null,
          arrets: c.arrets + 1, pausesDepassees: c.pausesDepassees + 1,
          evts: [...c.evts, { t: Math.round(c.cumulMs / 1000), h: reprise, type: 'depassement' }],
          son: son('depassement'), message: { texte: 'Pause dépassée : un arrêt interdit est compté. Le chrono repart.', jusqua: now + 6000 }
        }
      }
      return c
    }
    case 'restaurer':
      return a.etat
    default:
      return c
  }
}

const LIBELLES_EVT = {
  depart: 'Départ', tours: '+1 tour', annul_tours: 'Tour annulé', accRatees: 'Accélération ratée', annul_accRatees: 'Accélération ratée annulée',
  arrets: 'Arrêt / marche interdit', annul_arrets: 'Arrêt interdit annulé', pause: 'Pause en zone de départ', reprise: 'Reprise de la course',
  depassement: 'Pause dépassée (arrêt interdit compté)', fin: 'Fin de la course', abandon: 'Arrêt anticipé de la course'
}
export const libelleEvenement = (t) => LIBELLES_EVT[t] || t

export default function Observation({ prof, roster, classeFixe, observateur, parProf = false, reglages, onQuitter }) {
  const sauve = local.lire(CLE, null)
  const reprisePossible = sauve && sauve.prof === prof && sauve.etape !== 'prep'
  const [demanderReprise, setDemanderReprise] = useState(!!reprisePossible)

  const [etape, setEtape] = useState('prep')
  const [classe, setClasse] = useState(classeFixe || '')
  const [coureurId, setCoureurId] = useState('')
  const [niveau, setNiveau] = useState('')
  const [course, dispatch] = useReducer(reduire, null, courseInitiale)
  const [dist, setDist] = useState({ tours: 0, metres: null, calcul: '', verifie: false })
  const [bilan, setBilan] = useState({ borg: null, observations: '' })
  const [envoi, setEnvoi] = useState(null) // 'envoyee' | 'attente'

  const protocole = reglages.protocole
  const cibleMs = niveau ? dureeNiveau(protocole, niveau) * 1000 : 0
  const pauseMaxMs = (protocole.pauseMax || 20) * 1000
  const eleves = classe ? roster[classe] || [] : []
  const coureur = eleves.find((e) => e.id === coureurId)

  // --- sauvegarde permanente / reprise ---
  useEffect(() => {
    if (demanderReprise || envoi) return
    if (etape === 'prep') return
    local.ecrire(CLE, { prof, classe, coureurId, niveau, etape, course, dist, bilan, observateurId: observateur?.id || null })
  }, [prof, classe, coureurId, niveau, etape, course, dist, bilan, observateur, demanderReprise, envoi])

  function reprendre() {
    setClasse(sauve.classe); setCoureurId(sauve.coureurId); setNiveau(sauve.niveau)
    dispatch({ type: 'restaurer', etat: { ...sauve.course, son: null, message: null } })
    setDist(sauve.dist); setBilan(sauve.bilan); setEtape(sauve.etape)
    setDemanderReprise(false)
  }
  function abandonnerReprise() { local.effacer(CLE); setDemanderReprise(false) }

  // --- horloge ---
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (etape !== 'course') return
    const t = setInterval(() => { const n = Date.now(); setNow(n); dispatch({ type: 'tick', now: n, cibleMs, pauseMaxMs }) }, 200)
    garderEcranAllume()
    const vis = () => { if (document.visibilityState === 'visible') garderEcranAllume() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); libererEcran() }
  }, [etape, cibleMs, pauseMaxMs])

  // --- sons ---
  const dernierSon = useRef(null)
  useEffect(() => {
    const s = course.son
    if (!s || dernierSon.current === s.n) return
    dernierSon.current = s.n
    if (s.type === 'depart') { bipDepart(); vibrer(300); dire('Partez !') }
    if (s.type === 'court') { bipCourt(); vibrer(40) }
    if (s.type === 'derniere') { bipAlerte(); vibrer([200, 100, 200]); dire('Dernière minute') }
    if (s.type === 'depassement') { bipAlerte(); vibrer([300, 100, 300]) }
    if (s.type === 'fin') { bipFin(); vibrer([500, 150, 500, 150, 800]); dire('Stop ! Fin de la course') }
  }, [course.son])
  // compte à rebours sonore des 5 dernières secondes de pause
  const restePause = course.phase === 'pause' ? Math.max(0, Math.ceil((pauseMaxMs - (now - course.pauseDebutMs)) / 1000)) : null
  const dernierRebours = useRef(null)
  useEffect(() => {
    if (restePause !== null && restePause <= 5 && restePause > 0 && dernierRebours.current !== restePause) { dernierRebours.current = restePause; bipCourt() }
    if (restePause === null) dernierRebours.current = null
  }, [restePause])

  // --- envoi ---
  async function envoyer() {
    const d = new Date(course.heureDepart || Date.now())
    const distance = dist.tours * TOUR + (Number(dist.metres) || 0)
    const fiche = {
      id: nouvelId(), prof, classe,
      coureurId: coureur.id, coureurNom: coureur.nom, coureurPrenom: coureur.prenom, sexe: coureur.sexe || '',
      observateurId: observateur?.id || null, observateurNom: parProf ? `${observateur?.nom || 'Professeur'} (professeur)` : nomComplet(observateur),
      parProf, niveau, dureeCible: cibleMs / 1000,
      date: d.toISOString(), heureDepart: course.heureDepart, heureFin: course.heureFin,
      tempsEffectif: Math.round(course.cumulMs / 1000), arretAnticipe: course.arretAnticipe,
      tours: dist.tours, metresDernierTour: Number(dist.metres) || 0, distance,
      distanceCalculeeEleve: dist.calcul === '' ? null : Number(dist.calcul), calculJuste: dist.calcul === '' ? null : Number(dist.calcul) === distance,
      toursComptesEnCourse: course.tours,
      accRatees: course.accRatees, arretsInterdits: course.arrets, pauses: course.pauses, pausesDepassees: course.pausesDepassees,
      tempsPause: Math.round(course.tempsPauseMs / 1000),
      evenements: course.evts, borg: bilan.borg, observations: bilan.observations.trim(),
      creeLe: new Date().toISOString(), corrigee: false
    }
    mettreEnFile(prof, fiche)
    local.effacer(CLE)
    setEnvoi('attente')
    await viderFile()
    setEnvoi(ficheEnAttente().some((x) => x.fiche.id === fiche.id) ? 'attente' : 'envoyee')
  }

  function nouvelleObservation() {
    local.effacer(CLE)
    setEtape('prep'); setCoureurId(''); setNiveau(''); dispatch({ type: 'restaurer', etat: courseInitiale() })
    setDist({ tours: 0, metres: null, calcul: '', verifie: false }); setBilan({ borg: null, observations: '' }); setEnvoi(null)
  }

  if (demanderReprise) {
    const c = sauve.course
    const el = (roster[sauve.classe] || []).find((e) => e.id === sauve.coureurId)
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="carte p-5 space-y-3">
          <p className="font-display text-2xl font-bold">Observation en cours</p>
          <p className="text-sm">Coureur : <b>{nomComplet(el) || '?'}</b> · {LIBELLE_NIVEAU[sauve.niveau]}</p>
          <p className="text-sm text-doux">Chrono effectif enregistré : {chrono(c.cumulMs / 1000)}{c.phase === 'course' ? ' (la course a continué depuis, le temps est rattrapé)' : ''}.</p>
          <div className="flex gap-2 pt-1">
            <button className="btn-doux flex-1" onClick={abandonnerReprise}>Abandonner</button>
            <button className="btn-feu flex-1" onClick={reprendre}><RotateCcw size={16} /> Reprendre</button>
          </div>
        </div>
      </div>
    )
  }

  if (envoi) return <EcranEnvoi etat={envoi} coureur={coureur} parProf={parProf} onAutre={nouvelleObservation} onQuitter={onQuitter} onReessayer={async () => { await viderFile(); setEnvoi(ficheEnAttente().length ? 'attente' : 'envoyee') }} />

  if (etape === 'prep') {
    const classes = Object.keys(roster).sort((a, b) => a.localeCompare(b, 'fr'))
    const candidats = eleves.filter((e) => e.id !== observateur?.id)
    return (
      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <button onClick={onQuitter} className="text-sm text-doux flex items-center gap-1"><ChevronLeft size={16} /> Retour</button>
        <div className="carte p-5 space-y-4">
          <h2 className="font-display text-2xl font-bold">Observer un coureur</h2>
          {!classeFixe && <Liste etiquette="Classe" valeur={classe} onChange={(v) => { setClasse(v); setCoureurId('') }} options={classes.map((c) => ({ valeur: c, libelle: c }))} />}
          {classe && <Liste etiquette={parProf ? 'Élève qui court' : 'Ton camarade qui court'} valeur={coureurId} onChange={setCoureurId} options={candidats.map((e) => ({ valeur: e.id, libelle: nomComplet(e) }))} />}
          <div>
            <span className="etiquette">Niveau choisi par le coureur</span>
            <div className="grid grid-cols-3 gap-2">
              {NIVEAUX.map((n) => (
                <button key={n} onClick={() => setNiveau(n)}
                  className={`rounded-xl border-2 py-3 text-center transition ${niveau === n ? 'border-feu bg-feuclair' : 'border-bord'}`}>
                  <span className="block font-display text-lg font-bold">{LIBELLE_NIVEAU[n]}</span>
                  <span className="block text-sm text-doux">{protocole.durees[n]} min</span>
                </button>
              ))}
            </div>
          </div>
          <RappelProtocole protocole={protocole} />
          <button disabled={!coureur || !niveau} onClick={() => { activerSon(); setEtape('course') }} className="btn-feu w-full py-3 text-base">
            Aller sur la ligne de départ <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  if (etape === 'course') {
    return <EcranCourse c={course} dispatch={dispatch} now={now} cibleMs={cibleMs} pauseMaxMs={pauseMaxMs} restePause={restePause}
      coureur={coureur} niveau={niveau} onDistance={() => { setDist((d) => ({ ...d, tours: course.tours })); setEtape('distance') }} />
  }

  if (etape === 'distance') {
    return <SaisieDistance dist={dist} setDist={setDist} parProf={parProf} course={course} onRetour={() => setEtape('course')} onSuite={() => setEtape('bilan')} />
  }

  // bilan
  const distance = dist.tours * TOUR + (Number(dist.metres) || 0)
  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      <button onClick={() => setEtape('distance')} className="text-sm text-doux flex items-center gap-1"><ChevronLeft size={16} /> Distance</button>
      <div className="carte p-5 space-y-4">
        <h2 className="font-display text-2xl font-bold">Bilan de la course</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info2 l="Coureur" v={nomComplet(coureur)} />
          <Info2 l="Niveau" v={`${LIBELLE_NIVEAU[niveau]} · ${protocole.durees[niveau]} min`} />
          <Info2 l="Temps effectif" v={chrono(course.cumulMs / 1000)} />
          <Info2 l="Distance" v={kmM(distance)} />
          <Info2 l="Accélérations ratées" v={course.accRatees} />
          <Info2 l="Arrêts / marche interdits" v={course.arrets} />
          <Info2 l="Pauses en zone" v={`${course.pauses}${course.pausesDepassees ? ` (dont ${course.pausesDepassees} dépassée${course.pausesDepassees > 1 ? 's' : ''})` : ''}`} />
          <Info2 l="Temps de pause" v={chrono(course.tempsPauseMs / 1000)} />
        </div>
        {course.arretAnticipe && <p className="text-sm text-alerte flex gap-1.5"><AlertTriangle size={16} className="shrink-0 mt-0.5" />Course arrêtée avant la fin du temps.</p>}
        <div>
          <span className="etiquette">Ressenti du coureur : demande-lui (échelle de Borg)</span>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {BORG.map(([v, l]) => (
              <button key={v} onClick={() => setBilan((b) => ({ ...b, borg: b.borg === v ? null : v }))}
                className={`rounded-lg border px-1 py-1.5 text-center ${bilan.borg === v ? 'bg-nuit text-white dark:text-fond border-nuit' : 'border-bord'}`}>
                <span className="block font-display text-lg font-bold leading-none">{v}</span>
                <span className="block text-[9px] leading-tight mt-0.5">{l}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="etiquette">Observations (comment s’est passée la course ?)</span>
          <textarea rows={3} value={bilan.observations} onChange={(e) => setBilan((b) => ({ ...b, observations: e.target.value }))} className="champ" placeholder="Régularité, accélérations, gestion des pauses…" />
        </label>
        <button onClick={envoyer} className="btn-feu w-full py-3 text-base"><Send size={18} /> Envoyer la fiche au professeur</button>
      </div>
    </div>
  )
}

function Info2({ l, v }) {
  return (
    <div className="bg-creux rounded-xl px-3 py-2">
      <p className="text-[11px] text-doux">{l}</p>
      <p className="font-semibold">{v}</p>
    </div>
  )
}

export function RappelProtocole({ protocole }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="bg-creux rounded-xl p-3 text-sm">
      <button onClick={() => setOuvert(!ouvert)} className="flex items-center gap-1.5 font-semibold w-full text-left"><Info size={16} className="text-feu" /> Rappel du protocole</button>
      {ouvert && (
        <ul className="list-disc pl-5 mt-2 space-y-1 text-doux">
          <li>Niveau 1 : {protocole.durees.N1} min · Niveau 2 : {protocole.durees.N2} min · Niveau 3 : {protocole.durees.N3} min de course effective.</li>
          <li>Chaque tour de 400 m depuis la ligne : {SEGMENTS.map((s) => `${s.m} m ${s.type === 'accel' ? 'accélération' : 'récupération'}`).join(' / ')}.</li>
          <li>Pause autorisée seulement dans la zone de départ, {protocole.pauseMax} s maximum : le chrono effectif s’arrête. Au-delà, un arrêt interdit est compté et le chrono repart.</li>
          <li>Marcher ou s’arrêter ailleurs sur la piste est interdit : appuie sur « Arrêt / marche interdit ».</li>
          <li>Appuie sur « +1 tour » à chaque passage de la ligne de départ, et sur « Accélération ratée » quand une accélération n’est pas marquée.</li>
          <li>Ensuite, on inverse les rôles.</li>
        </ul>
      )}
    </div>
  )
}

function Compteur({ libelle, valeur, onPlus, onMoins, couleur, disabled }) {
  return (
    <div className="flex flex-col">
      <button disabled={disabled} onClick={onPlus} className={`btn flex-col rounded-2xl py-4 px-2 text-white ${couleur}`}>
        <span className="font-display text-5xl font-bold leading-none chiffres">{valeur}</span>
        <span className="text-sm font-semibold mt-1 leading-tight text-center">{libelle}</span>
      </button>
      <button disabled={disabled || !valeur} onClick={onMoins} className="mt-1 text-xs text-doux py-1.5 flex items-center justify-center gap-1 disabled:opacity-30"><Minus size={12} /> annuler 1</button>
    </div>
  )
}

function EcranCourse({ c, dispatch, now, cibleMs, pauseMaxMs, restePause, coureur, niveau, onDistance }) {
  const [confirmeArret, setConfirmeArret] = useState(false)
  const e = effMs(c, now)
  const reste = Math.max(0, cibleMs - e)
  const pct = Math.min(100, (e / cibleMs) * 100)
  const msg = c.message && c.message.jusqua > now ? c.message.texte : null
  const ordre = (type, extra = {}) => dispatch({ type, now: Date.now(), ...extra })

  return (
    <div className="max-w-md mx-auto px-3 py-3 space-y-3 select-none">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold truncate">{nomComplet(coureur)}</span>
        <span className="text-doux shrink-0">{LIBELLE_NIVEAU[niveau]} · {chrono(cibleMs / 1000)}</span>
      </div>

      <div className={`rounded-3xl p-4 text-center ${c.phase === 'pause' ? 'bg-ambre/15 border-2 border-ambre' : 'carte'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-doux">
          {c.phase === 'attente' ? 'Prêt au départ' : c.phase === 'pause' ? 'Pause · chrono arrêté' : c.phase === 'fini' ? 'Course terminée' : 'Temps de course effectif'}
        </p>
        <p className={`font-display font-bold leading-none chiffres text-[88px] ${c.phase === 'pause' ? 'text-ambre' : ''}`}>{chrono(e / 1000)}</p>
        <div className="h-2.5 rounded-full bg-creux overflow-hidden mt-2"><div className="h-full bg-feu transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="text-sm text-doux mt-1.5 chiffres">Reste <b className="text-texte">{chrono(reste / 1000)}</b>{c.phase !== 'attente' ? ` · ${c.tours} tour${c.tours > 1 ? 's' : ''}` : ''}</p>
      </div>

      {msg && <p className="rounded-xl bg-alerte text-white text-sm font-semibold px-3 py-2.5 flex gap-2"><AlertTriangle size={18} className="shrink-0" />{msg}</p>}

      {c.phase === 'attente' && (
        <button onClick={() => { activerSon(); ordre('depart') }} className="btn-feu w-full rounded-3xl py-10 text-4xl font-display">
          <Play size={40} /> DÉPART
        </button>
      )}

      {c.phase === 'pause' && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="font-display text-[110px] leading-none font-bold text-ambre chiffres">{restePause}<span className="text-5xl"> s</span></p>
            <p className="text-sm text-doux">À 0, la course repart toute seule et un arrêt interdit est compté.</p>
          </div>
          <button onClick={() => ordre('reprise')} className="btn w-full rounded-3xl py-8 text-3xl font-display bg-vert text-white"><PlayCircle size={36} /> REPRISE</button>
        </div>
      )}

      {(c.phase === 'course' || c.phase === 'pause') && (
        <>
          {c.phase === 'course' && (
            <div className="flex">
              <button onClick={() => ordre('compteur', { cle: 'tours', delta: 1 })} className="btn flex-1 rounded-3xl py-6 bg-nuit text-white dark:text-fond">
                <Plus size={34} /><span className="font-display text-4xl font-bold">1 TOUR</span>
                <span className="font-display text-3xl font-bold ml-2 opacity-80 chiffres">({c.tours})</span>
              </button>
            </div>
          )}
          {c.phase === 'course' && (
            <button disabled={!c.tours} onClick={() => ordre('compteur', { cle: 'tours', delta: -1 })} className="w-full -mt-2 text-xs text-doux py-1 flex items-center justify-center gap-1 disabled:opacity-30"><Minus size={12} /> annuler 1 tour</button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Compteur libelle="Accélération ratée" valeur={c.accRatees} couleur="bg-feu" disabled={c.phase !== 'course'}
              onPlus={() => ordre('compteur', { cle: 'accRatees', delta: 1 })} onMoins={() => ordre('compteur', { cle: 'accRatees', delta: -1 })} />
            <Compteur libelle="Arrêt / marche interdit" valeur={c.arrets} couleur="bg-alerte"
              onPlus={() => ordre('compteur', { cle: 'arrets', delta: 1 })} onMoins={() => ordre('compteur', { cle: 'arrets', delta: -1 })} />
          </div>
          {c.phase === 'course' && (
            <button onClick={() => ordre('pause')} className="btn w-full rounded-2xl py-4 bg-ambre text-white text-lg">
              <PauseCircle size={24} /> Pause en zone de départ ({Math.round(pauseMaxMs / 1000)} s)
              {c.pauses > 0 && <span className="text-sm opacity-90">· {c.pauses}</span>}
            </button>
          )}
          <button onClick={() => setConfirmeArret(true)} className="w-full text-sm text-doux py-2 flex items-center justify-center gap-1.5"><Flag size={14} /> Arrêter la course avant la fin</button>
        </>
      )}

      {c.phase === 'fini' && (
        <div className="space-y-3">
          <div className="rounded-3xl bg-alerte text-white p-5 text-center">
            <p className="font-display text-5xl font-bold">STOP !</p>
            <p className="text-sm mt-1">Repère l’endroit exact où ton camarade s’est arrêté (le plot le plus proche).</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="carte py-2"><p className="text-[11px] text-doux">Tours</p><p className="font-display text-2xl font-bold">{c.tours}</p></div>
            <div className="carte py-2"><p className="text-[11px] text-doux">Accél. ratées</p><p className="font-display text-2xl font-bold">{c.accRatees}</p></div>
            <div className="carte py-2"><p className="text-[11px] text-doux">Arrêts interdits</p><p className="font-display text-2xl font-bold">{c.arrets}</p></div>
          </div>
          <button onClick={onDistance} className="btn-feu w-full py-4 text-lg">Saisir la distance <ChevronRight size={20} /></button>
        </div>
      )}

      {confirmeArret && (
        <Confirmation titre="Arrêter la course ?" danger libelle="Oui, arrêter"
          texte={'La course s’arrête maintenant, avant la fin du temps prévu.\nÀ utiliser si le coureur abandonne ou si le professeur arrête la course.'}
          onNon={() => setConfirmeArret(false)} onOui={() => { setConfirmeArret(false); ordre('abandon') }} />
      )}
    </div>
  )
}

function SaisieDistance({ dist, setDist, parProf, course, onRetour, onSuite }) {
  const metres = dist.metres === null || dist.metres === '' ? null : Number(dist.metres)
  const total = dist.tours * TOUR + (metres || 0)
  const calcul = dist.calcul === '' ? null : Number(dist.calcul)
  const juste = calcul !== null && calcul === total
  const seg = metres !== null ? segmentAuMetre(metres) : null
  const maj = (p) => setDist((d) => ({ ...d, ...p, verifie: false }))
  const pret = metres !== null && metres >= 0 && metres < TOUR && (parProf || dist.verifie)

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      <button onClick={onRetour} className="text-sm text-doux flex items-center gap-1"><ChevronLeft size={16} /> Course</button>
      <div className="carte p-5 space-y-5">
        <h2 className="font-display text-2xl font-bold">Distance parcourue</h2>

        <div>
          <span className="etiquette">1. Tours complets (passages de la ligne comptés)</span>
          <div className="flex items-center gap-3">
            <button onClick={() => maj({ tours: Math.max(0, dist.tours - 1) })} className="btn-bord w-12 h-12"><Minus size={18} /></button>
            <span className="font-display text-5xl font-bold w-20 text-center chiffres">{dist.tours}</span>
            <button onClick={() => maj({ tours: dist.tours + 1 })} className="btn-bord w-12 h-12"><Plus size={18} /></button>
            <span className="text-sm text-doux">× {TOUR} m</span>
          </div>
          {dist.tours !== course.tours && <p className="text-[11px] text-ambre mt-1">Pendant la course, {course.tours} tour{course.tours > 1 ? 's' : ''} avai{course.tours > 1 ? 'ent' : 't'} été compté{course.tours > 1 ? 's' : ''}.</p>}
        </div>

        <div>
          <span className="etiquette">2. Mètres parcourus après la ligne dans le dernier tour (repère des plots, tous les 50 m)</span>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[0, 50, 100, 150, 200, 250, 300, 350].map((m) => (
              <button key={m} onClick={() => maj({ metres: m })}
                className={`rounded-lg border py-2 text-sm font-semibold ${metres !== null && Math.floor(metres / 50) * 50 === m ? 'bg-nuit text-white dark:text-fond border-nuit' : 'border-bord'}`}>{m} m</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            Précision au mètre :
            <input type="number" inputMode="numeric" min={0} max={399} value={dist.metres ?? ''} onChange={(e) => maj({ metres: e.target.value === '' ? null : Math.max(0, Math.min(399, Math.round(Number(e.target.value)))) })} className="champ w-24 text-center" />
            m
          </label>
          {seg && <p className="text-[11px] text-doux mt-1">Arrêt dans une zone de {seg.type === 'accel' ? 'accélération' : 'récupération'}.</p>}
        </div>

        <div>
          <span className="etiquette">3. {parProf ? 'Distance totale' : 'À toi de calculer la distance totale (en mètres)'}</span>
          {parProf ? (
            <p className="font-display text-3xl font-bold">{total} m <span className="text-lg text-doux">= {kmM(total)}</span></p>
          ) : (
            <>
              <p className="text-[11px] text-doux mb-1.5">Calcul : nombre de tours × {TOUR} + mètres du dernier tour.</p>
              <div className="flex gap-2">
                <input type="number" inputMode="numeric" value={dist.calcul} onChange={(e) => maj({ calcul: e.target.value })} className="champ text-lg text-center" placeholder="ex. 3275" />
                <button disabled={dist.calcul === '' || metres === null} onClick={() => setDist((d) => ({ ...d, verifie: true }))} className="btn-principal shrink-0">Vérifier</button>
              </div>
              {dist.verifie && (juste
                ? <p className="mt-2 text-sm font-semibold text-vert flex items-center gap-1.5"><Check size={16} /> Calcul juste : {total} m, soit {kmM(total)}.</p>
                : <p className="mt-2 text-sm font-semibold text-alerte">Ce n’est pas ça : refais le calcul ({dist.tours} × {TOUR} + {metres}). Tu peux aussi continuer, ton professeur verra la bonne distance.</p>)}
            </>
          )}
        </div>

        <button disabled={!pret} onClick={onSuite} className="btn-feu w-full py-3 text-base">Continuer <ChevronRight size={18} /></button>
      </div>
    </div>
  )
}

function EcranEnvoi({ etat, coureur, parProf, onAutre, onQuitter, onReessayer }) {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="carte p-6 text-center space-y-3">
        {etat === 'envoyee' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-vert/15 text-vert flex items-center justify-center mx-auto"><Check size={34} /></div>
            <p className="font-display text-2xl font-bold">Fiche reçue par le professeur</p>
            <p className="text-sm text-doux">La fiche de {nomComplet(coureur)} est bien enregistrée en ligne.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-ambre/15 text-ambre flex items-center justify-center mx-auto"><CloudOff size={30} /></div>
            <p className="font-display text-2xl font-bold">Fiche gardée sur ce téléphone</p>
            <p className="text-sm text-doux">Le réseau ne répond pas. La fiche partira toute seule dès que le réseau revient (en rouvrant l’appli). Ne désinstalle pas l’appli d’ici là.</p>
            <button onClick={onReessayer} className="btn-bord mx-auto"><RotateCcw size={16} /> Réessayer maintenant</button>
          </>
        )}
        {!parProf && <p className="text-sm font-semibold pt-2">Maintenant, inversez les rôles !</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onQuitter} className="btn-doux flex-1">Accueil</button>
          <button onClick={onAutre} className="btn-feu flex-1">Observer un autre coureur</button>
        </div>
      </div>
    </div>
  )
}
