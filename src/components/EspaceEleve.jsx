import { useEffect, useState } from 'react'
import { Eye, ListChecks, BookOpen, ChevronLeft, Loader2, CloudOff, RefreshCw } from 'lucide-react'
import Observation from './Observation'
import { chargerRoster, chargerReglages, chargerFichesEleve, ficheEnAttente, viderFile } from '../utils/cloud'
import { completerReglages } from '../utils/bareme'
import { LIBELLE_NIVEAU, SEGMENTS } from '../utils/protocole'
import { chrono, kmM, dateHeure, nomComplet } from '../utils/format'

// Espace élève : observer un camarade, consulter ses courses (jamais la note), lire le protocole.
export default function EspaceEleve({ session }) {
  const { prof, classe, eleve } = session
  const [vue, setVue] = useState('accueil')
  const [roster, setRoster] = useState(null)
  const [reglages, setReglages] = useState(null)
  const [attente, setAttente] = useState(ficheEnAttente().length)

  useEffect(() => {
    chargerRoster(prof).then(setRoster)
    chargerReglages(prof).then((r) => setReglages(completerReglages(r)))
  }, [prof])
  useEffect(() => { if (vue === 'accueil') setAttente(ficheEnAttente().length) }, [vue])

  if (!roster || !reglages) return <p className="text-center text-doux py-16 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Chargement…</p>

  if (vue === 'observer') {
    return <Observation prof={prof} roster={roster} classeFixe={classe} observateur={eleve} reglages={reglages} onQuitter={() => setVue('accueil')} />
  }
  if (vue === 'courses') return <MesCourses prof={prof} eleve={eleve} onRetour={() => setVue('accueil')} />
  if (vue === 'protocole') return <Protocole reglages={reglages} onRetour={() => setVue('accueil')} />

  const tuiles = [
    { id: 'observer', icone: Eye, titre: 'Observer un camarade', texte: 'Chronométrer et relever la course d’un camarade, puis envoyer sa fiche.', fort: true },
    { id: 'courses', icone: ListChecks, titre: 'Mes courses', texte: 'Les fiches de tes courses et de tes observations.' },
    { id: 'protocole', icone: BookOpen, titre: 'Le protocole', texte: 'Niveaux, découpage du tour, pauses, arrêts interdits.' }
  ]
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <div>
        <p className="text-sm text-doux">Bonjour</p>
        <p className="font-display text-3xl font-bold">{eleve.prenom} {eleve.nom}</p>
        <p className="text-sm text-doux">{classe} · {session.profNom}</p>
      </div>
      {attente > 0 && (
        <div className="rounded-xl bg-ambre/15 border border-ambre px-3 py-2.5 text-sm flex items-center gap-2">
          <CloudOff size={18} className="text-ambre shrink-0" />
          <span className="flex-1">{attente} fiche{attente > 1 ? 's' : ''} en attente d’envoi.</span>
          <button onClick={async () => setAttente(await viderFile())} className="btn-bord text-xs py-1.5"><RefreshCw size={14} /> Envoyer</button>
        </div>
      )}
      {tuiles.map((t) => (
        <button key={t.id} onClick={() => setVue(t.id)} className={`w-full text-left rounded-2xl p-5 flex gap-4 items-center transition active:scale-[0.99] ${t.fort ? 'bg-nuit text-white dark:text-fond' : 'carte'}`}>
          <t.icone size={34} className={t.fort ? '' : 'text-feu'} />
          <span>
            <span className="block font-display text-2xl font-bold">{t.titre}</span>
            <span className={`block text-sm ${t.fort ? 'opacity-85' : 'text-doux'}`}>{t.texte}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function MesCourses({ prof, eleve, onRetour }) {
  const [donnees, setDonnees] = useState(undefined)
  useEffect(() => { chargerFichesEleve(prof, eleve.id).then(setDonnees) }, [prof, eleve.id])
  const tri = (l) => [...l].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      <button onClick={onRetour} className="text-sm text-doux flex items-center gap-1"><ChevronLeft size={16} /> Accueil</button>
      <h2 className="font-display text-3xl font-bold">Mes courses</h2>
      {donnees === undefined && <p className="text-doux flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Chargement…</p>}
      {donnees === null && <p className="text-sm text-alerte">Impossible de charger tes fiches (réseau ?). Réessaie plus tard.</p>}
      {donnees && (
        <>
          {donnees.courses.length === 0 && <p className="text-sm text-doux">Aucune course enregistrée pour l’instant.</p>}
          {tri(donnees.courses).map((f) => (
            <div key={f.id} className="carte p-4 space-y-2">
              <div className="flex justify-between items-baseline">
                <p className="font-display text-xl font-bold">{LIBELLE_NIVEAU[f.niveau]} · {Math.round(f.dureeCible / 60)} min</p>
                <p className="text-xs text-doux">{dateHeure(f.date)}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini l="Distance" v={kmM(f.distance)} />
                <Mini l="Temps effectif" v={chrono(f.tempsEffectif)} />
                <Mini l="Tours" v={`${f.tours} + ${f.metresDernierTour} m`} />
                <Mini l="Accél. ratées" v={f.accRatees} />
                <Mini l="Arrêts interdits" v={f.arretsInterdits} />
                <Mini l="Pauses" v={f.pauses} />
              </div>
              <p className="text-xs text-doux">Observé par {f.observateurNom || '—'}{f.borg != null ? ` · ressenti ${f.borg}/10` : ''}{f.arretAnticipe ? ' · course arrêtée avant la fin' : ''}</p>
              {f.observations && <p className="text-sm italic">« {f.observations} »</p>}
            </div>
          ))}
          <p className="text-sm text-doux pt-2">Tu as observé {donnees.observations.length} course{donnees.observations.length > 1 ? 's' : ''} : {donnees.observations.map((f) => `${f.coureurPrenom} ${f.coureurNom}`).join(', ') || '—'}.</p>
        </>
      )}
    </div>
  )
}

const Mini = ({ l, v }) => (
  <div className="bg-creux rounded-lg py-1.5 px-1"><p className="text-[10px] text-doux">{l}</p><p className="text-sm font-semibold">{v}</p></div>
)

function Protocole({ reglages, onRetour }) {
  const p = reglages.protocole
  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      <button onClick={onRetour} className="text-sm text-doux flex items-center gap-1"><ChevronLeft size={16} /> Accueil</button>
      <h2 className="font-display text-3xl font-bold">Le protocole</h2>
      <div className="carte p-4 space-y-3 text-sm">
        <p className="font-semibold">Trois niveaux, au choix du coureur :</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {['N1', 'N2', 'N3'].map((n) => <div key={n} className="bg-creux rounded-xl py-2"><p className="font-display text-lg font-bold">{LIBELLE_NIVEAU[n]}</p><p>{p.durees[n]} min</p></div>)}
        </div>
        <p className="font-semibold pt-1">Le tour de 400 m, depuis la ligne de départ :</p>
        <div className="flex h-9 rounded-lg overflow-hidden text-[11px] font-semibold text-white">
          {SEGMENTS.map((s, i) => <div key={i} style={{ flex: s.m }} className={`flex items-center justify-center ${s.type === 'accel' ? 'bg-feu' : 'bg-nuit dark:text-fond'}`}>{s.m} m {s.type === 'accel' ? 'accél.' : 'récup.'}</div>)}
        </div>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Sur les zones de 50 m : accélération bien visible. Sur les zones de 150 m : récupération <b>en courant</b>.</li>
          <li>Pause autorisée seulement dans la zone de départ / hydratation, <b>{p.pauseMax} s maximum</b>. Le chrono de course effective s’arrête pendant la pause.</li>
          <li>Pause de plus de {p.pauseMax} s : un arrêt interdit est compté et le chrono repart.</li>
          <li>Marcher ou s’arrêter ailleurs sur la piste est interdit.</li>
          <li>Ton observateur compte tes tours, tes accélérations ratées et tes arrêts, puis repère où tu t’arrêtes à la fin du temps.</li>
          <li>Ensuite, vous inversez les rôles.</li>
        </ul>
      </div>
    </div>
  )
}
