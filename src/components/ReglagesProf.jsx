import { useState } from 'react'
import { Save, RotateCcw, Check } from 'lucide-react'
import { Confirmation } from './Modale'
import { REGLAGES_DEFAUT, completerReglages } from '../utils/bareme'
import { LIBELLE_NIVEAU, NIVEAUX } from '../utils/protocole'

const num = (v) => (v === '' ? '' : Number(v))
function Nombre({ valeur, onChange, w = 'w-20', min = 0, step = 1 }) {
  return <input type="number" min={min} step={step} value={valeur} onChange={(e) => onChange(num(e.target.value))} className={`rounded-lg border border-bord px-2 py-1.5 text-sm text-center ${w}`} />
}

// Réglages du professeur : durées des niveaux, durée de la pause, barème provisoire de la performance.
export default function ReglagesProf({ reglages, onEnregistrer }) {
  const [r, setR] = useState(() => JSON.parse(JSON.stringify(completerReglages(reglages))))
  const [etat, setEtat] = useState('')
  const [confirme, setConfirme] = useState(false)
  const modifie = () => setEtat('modifie')

  const setP = (fn) => { setR((x) => { const n = JSON.parse(JSON.stringify(x)); fn(n); return n }); modifie() }

  async function enregistrer() {
    setEtat('en-cours')
    const ok = await onEnregistrer(r)
    setEtat(ok ? 'ok' : 'erreur')
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="carte p-4 space-y-3">
        <p className="font-display text-xl font-bold">Protocole</p>
        <div className="flex flex-wrap gap-4">
          {NIVEAUX.map((n) => (
            <label key={n} className="text-sm flex items-center gap-2">{LIBELLE_NIVEAU[n]}
              <Nombre valeur={r.protocole.durees[n]} min={1} onChange={(v) => setP((x) => { x.protocole.durees[n] = v })} /> min
            </label>
          ))}
          <label className="text-sm flex items-center gap-2">Pause en zone de départ
            <Nombre valeur={r.protocole.pauseMax} min={5} onChange={(v) => setP((x) => { x.protocole.pauseMax = v })} /> s max
          </label>
        </div>
        <p className="text-[11px] text-doux">Les téléphones des élèves prennent ces réglages à leur prochaine connexion.</p>
      </div>

      <div className="carte p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-display text-xl font-bold">Barème de la performance</p>
          <label className="ml-auto text-xs flex items-center gap-1.5"><input type="checkbox" checked={r.provisoire} onChange={(e) => setP((x) => { x.provisoire = e.target.checked })} /> Barème provisoire (mention affichée)</label>
        </div>
        <p className="text-xs text-doux leading-relaxed">
          Trois indicateurs de la fiche reçoivent un degré de 1 à 4. Leur moyenne pondérée donne les points de l’élément 1 (Bac GT, /8) ou de l’AFLP 1 (Bac Pro, /7) :
          degré moyen 1 → haut de la plage D1, degré moyen 4 → note maximale, avec une progression continue entre les deux. Le plafond limite les points selon le niveau choisi. Chaque note reste corrigeable à la main dans l’onglet Notes.
        </p>

        <div>
          <p className="text-sm font-semibold mb-1.5">1. Distance parcourue (m) — minimum pour atteindre chaque degré</p>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead><tr className="text-xs text-doux"><th className="text-left pr-3 py-1">Niveau</th><th className="pr-2">Sexe</th><th>D2 dès</th><th>D3 dès</th><th>D4 dès</th></tr></thead>
              <tbody>
                {NIVEAUX.flatMap((n) => [['G', 'Garçons'], ['F', 'Filles']].map(([sx, l]) => (
                  <tr key={n + sx}>
                    <td className="pr-3 py-1 font-semibold">{sx === 'G' ? LIBELLE_NIVEAU[n] : ''}</td>
                    <td className="pr-2 text-xs text-doux">{l}</td>
                    {[0, 1, 2].map((i) => <td key={i} className="px-1 py-1"><Nombre w="w-24" step={50} valeur={r.bareme.distance[n][sx][i]} onChange={(v) => setP((x) => { x.bareme.distance[n][sx][i] = v })} /></td>)}
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-doux mt-1">Sexe non renseigné : moyenne des repères filles et garçons.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-1.5">2. Accélérations réussies (%) — minimum pour</p>
            <div className="flex gap-3 text-sm">
              {['D2', 'D3', 'D4'].map((d, i) => <label key={d} className="flex items-center gap-1">{d} <Nombre w="w-16" valeur={r.bareme.accel[i]} onChange={(v) => setP((x) => { x.bareme.accel[i] = v })} /></label>)}
            </div>
            <p className="text-[11px] text-doux mt-1">Zones de 50 m entamées (2 par tour) moins les accélérations ratées.</p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1.5">3. Arrêts / marche interdits — maximum pour</p>
            <div className="flex gap-3 text-sm">
              {['D4', 'D3', 'D2'].map((d, i) => <label key={d} className="flex items-center gap-1">{d} <Nombre w="w-16" valeur={r.bareme.arrets[i]} onChange={(v) => setP((x) => { x.bareme.arrets[i] = v })} /></label>)}
            </div>
            <p className="text-[11px] text-doux mt-1">Au-delà du maximum de D2 : degré 1. Une pause dépassée compte comme un arrêt.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-1.5">Poids de chaque indicateur</p>
            <div className="flex gap-3 text-sm flex-wrap">
              {[['distance', 'Distance'], ['accel', 'Accélérations'], ['arrets', 'Arrêts']].map(([k, l]) => <label key={k} className="flex items-center gap-1">{l} <Nombre w="w-14" valeur={r.bareme.poids[k]} onChange={(v) => setP((x) => { x.bareme.poids[k] = v })} /></label>)}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1.5">Plafond selon le niveau (% des points)</p>
            <div className="flex gap-3 text-sm">
              {NIVEAUX.map((n) => <label key={n} className="flex items-center gap-1">{n} <Nombre w="w-16" valeur={r.bareme.plafonds[n]} onChange={(v) => setP((x) => { x.bareme.plafonds[n] = v })} /></label>)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={enregistrer} disabled={etat === 'en-cours'} className="btn-principal"><Save size={16} /> Enregistrer les réglages</button>
        <button onClick={() => setConfirme(true)} className="btn-bord"><RotateCcw size={16} /> Rétablir le barème provisoire</button>
        <span className="text-sm text-doux">{etat === 'ok' ? <span className="text-vert flex items-center gap-1"><Check size={16} /> Enregistré</span> : etat === 'erreur' ? <span className="text-alerte">Échec de l’enregistrement en ligne</span> : etat === 'modifie' ? 'Modifications non enregistrées' : ''}</span>
      </div>
      {confirme && <Confirmation titre="Rétablir le barème provisoire ?" texte="Les durées, la pause et tout le barème reviennent aux valeurs de départ (pensez à enregistrer ensuite)." onNon={() => setConfirme(false)} onOui={() => { setR(JSON.parse(JSON.stringify(REGLAGES_DEFAUT))); setConfirme(false); modifie() }} />}
    </div>
  )
}
