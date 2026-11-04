import { useState } from 'react'
import { RefreshCw, Download, Trash2, Pencil, Check, AlertTriangle, Printer } from 'lucide-react'
import Modale, { Confirmation, imprimerModale } from './Modale'
import Liste from './Liste'
import { libelleEvenement } from './Observation'
import { enregistrerFiche, supprimerFiche } from '../utils/cloud'
import { LIBELLE_NIVEAU, TOUR, zonesAccelParcourues } from '../utils/protocole'
import { chrono, kmM, dateHeure, nomComplet, telechargerCSV, heure } from '../utils/format'

// Fiches reçues, par classe et par élève : détail, chronologie, correction, suppression, export.
export default function FichesProf({ prof, roster, fiches, setFiches, onActualiser, classe, setClasse }) {
  const [detail, setDetail] = useState(null)
  const classes = Object.keys(roster).sort((a, b) => a.localeCompare(b, 'fr'))
  const eleves = classe ? roster[classe] || [] : []
  const fichesClasse = fiches.filter((f) => f.classe === classe)
  const parEleve = (id) => fichesClasse.filter((f) => f.coureurId === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const orphelines = fichesClasse.filter((f) => !eleves.some((e) => e.id === f.coureurId))

  function exporter() {
    const ent = ['Nom', 'Prénom', 'Sexe', 'Date', 'Niveau', 'Durée prévue', 'Temps effectif', 'Tours', 'Mètres dernier tour', 'Distance (m)', 'Accélérations ratées', 'Zones d’accélération', 'Arrêts interdits', 'Pauses', 'Pauses dépassées', 'Temps de pause', 'Arrêt anticipé', 'Borg', 'Observateur', 'Calcul de l’élève juste', 'Observations']
    const lignes = fichesClasse.map((f) => [f.coureurNom, f.coureurPrenom, f.sexe, dateHeure(f.date), LIBELLE_NIVEAU[f.niveau], chrono(f.dureeCible), chrono(f.tempsEffectif), f.tours, f.metresDernierTour, f.distance, f.accRatees, zonesAccelParcourues(f.distance), f.arretsInterdits, f.pauses, f.pausesDepassees, chrono(f.tempsPause), f.arretAnticipe ? 'oui' : '', f.borg ?? '', f.observateurNom, f.calculJuste == null ? '' : f.calculJuste ? 'oui' : 'non', f.observations])
    telechargerCSV(`fartlek-fiches-${classe}.csv`, ent, lignes)
  }

  const ligneFiche = (f) => (
    <button key={f.id} onClick={() => setDetail(f)} className="w-full text-left rounded-lg bg-creux px-3 py-2 text-xs hover:ring-1 hover:ring-feu">
      <span className="font-semibold">{dateHeure(f.date)} · {LIBELLE_NIVEAU[f.niveau]}</span>
      <span className="text-doux"> · {chrono(f.tempsEffectif)} · {kmM(f.distance)} · accél. ratées {f.accRatees} · arrêts {f.arretsInterdits} · pauses {f.pauses}</span>
      {f.arretAnticipe && <span className="text-alerte"> · arrêt anticipé</span>}
      {f.corrigee && <span className="text-ambre"> · corrigée</span>}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-48"><Liste etiquette="Classe" valeur={classe} onChange={setClasse} options={classes.map((c) => ({ valeur: c, libelle: c }))} /></div>
        <button onClick={onActualiser} className="btn-bord text-sm"><RefreshCw size={16} /> Actualiser</button>
        {classe && fichesClasse.length > 0 && <button onClick={exporter} className="btn-bord text-sm"><Download size={16} /> Export CSV</button>}
      </div>
      {!classe && <p className="text-sm text-doux">Choisis une classe. {fiches.length} fiche{fiches.length > 1 ? 's' : ''} reçue{fiches.length > 1 ? 's' : ''} au total.</p>}
      {classe && (
        <div className="carte divide-y divide-bord">
          {eleves.map((e) => {
            const l = parEleve(e.id)
            return (
              <div key={e.id} className="p-3 space-y-1.5">
                <p className="text-sm"><b>{e.nom}</b> {e.prenom} <span className="text-doux text-xs">· {l.length} fiche{l.length > 1 ? 's' : ''}</span></p>
                {l.map(ligneFiche)}
              </div>
            )
          })}
          {orphelines.length > 0 && (
            <div className="p-3 space-y-1.5">
              <p className="text-sm font-semibold">Fiches d’élèves retirés de la classe</p>
              {orphelines.map((f) => <div key={f.id}><p className="text-xs">{f.coureurNom} {f.coureurPrenom}</p>{ligneFiche(f)}</div>)}
            </div>
          )}
        </div>
      )}
      {detail && (
        <FicheDetail fiche={detail} onFermer={() => setDetail(null)}
          onEnregistrer={async (f) => { await enregistrerFiche(prof, f); setFiches(fiches.map((x) => (x.id === f.id ? f : x))); setDetail(f) }}
          onSupprimer={async () => { await supprimerFiche(prof, detail.id); setFiches(fiches.filter((x) => x.id !== detail.id)); setDetail(null) }} />
      )}
    </div>
  )
}

const CHAMPS = [
  ['tours', 'Tours complets'], ['metresDernierTour', 'Mètres du dernier tour'], ['accRatees', 'Accélérations ratées'],
  ['arretsInterdits', 'Arrêts / marche interdits'], ['pauses', 'Pauses en zone']
]

export function FicheDetail({ fiche, onFermer, onEnregistrer, onSupprimer }) {
  const [edition, setEdition] = useState(null)
  const [confirme, setConfirme] = useState(false)
  const f = fiche
  const L = ({ l, v }) => <div className="flex justify-between gap-3 py-1 border-b border-bord text-sm bloc"><span className="text-doux">{l}</span><span className="font-semibold text-right">{v}</span></div>

  function enregistrer() {
    const n = { ...f }
    CHAMPS.forEach(([k]) => { n[k] = Math.max(0, Math.round(Number(edition[k]) || 0)) })
    n.niveau = edition.niveau
    n.dureeCible = Number(edition.dureeMin) * 60
    n.observations = edition.observations
    n.distance = n.tours * TOUR + n.metresDernierTour
    n.corrigee = true
    n.correctionLe = new Date().toISOString()
    onEnregistrer(n)
    setEdition(null)
  }

  return (
    <Modale titre={`${f.coureurNom} ${f.coureurPrenom}`} onFermer={onFermer} large
      pied={!edition && (
        <div className="flex flex-wrap gap-2 justify-between pas-imprimer">
          <button onClick={() => setConfirme(true)} className="btn text-alerte px-3 py-2 text-sm"><Trash2 size={16} /> Supprimer</button>
          <div className="flex gap-2">
            <button onClick={imprimerModale} className="btn-bord text-sm"><Printer size={16} /> Imprimer</button>
            <button onClick={() => setEdition({ ...Object.fromEntries(CHAMPS.map(([k]) => [k, f[k] ?? 0])), niveau: f.niveau, dureeMin: Math.round(f.dureeCible / 60), observations: f.observations || '' })} className="btn-principal text-sm"><Pencil size={16} /> Corriger</button>
          </div>
        </div>
      )}>
      {edition ? (
        <div className="space-y-3">
          <p className="text-xs text-doux">La distance est recalculée : tours × {TOUR} m + mètres du dernier tour. La fiche sera marquée « corrigée ».</p>
          <div className="grid grid-cols-2 gap-2">
            <label><span className="etiquette">Niveau</span>
              <select value={edition.niveau} onChange={(e) => setEdition({ ...edition, niveau: e.target.value })} className="champ">{['N1', 'N2', 'N3'].map((n) => <option key={n} value={n}>{LIBELLE_NIVEAU[n]}</option>)}</select>
            </label>
            <label><span className="etiquette">Durée prévue (min)</span><input type="number" value={edition.dureeMin} onChange={(e) => setEdition({ ...edition, dureeMin: e.target.value })} className="champ" /></label>
            {CHAMPS.map(([k, l]) => <label key={k}><span className="etiquette">{l}</span><input type="number" min={0} value={edition[k]} onChange={(e) => setEdition({ ...edition, [k]: e.target.value })} className="champ" /></label>)}
          </div>
          <label className="block"><span className="etiquette">Observations</span><textarea rows={3} value={edition.observations} onChange={(e) => setEdition({ ...edition, observations: e.target.value })} className="champ" /></label>
          <div className="flex gap-2 justify-end"><button className="btn-doux" onClick={() => setEdition(null)}>Annuler</button><button className="btn-principal" onClick={enregistrer}><Check size={16} /> Enregistrer</button></div>
        </div>
      ) : (
        <div className="imprimable space-y-3">
          <p className="hidden print:block text-lg font-bold">Fiche fartlek — {f.coureurNom} {f.coureurPrenom} ({f.classe})</p>
          {f.corrigee && <p className="text-xs text-ambre flex gap-1"><AlertTriangle size={14} /> Fiche corrigée par le professeur{f.correctionLe ? ` le ${dateHeure(f.correctionLe)}` : ''}.</p>}
          <div className="grid sm:grid-cols-2 gap-x-6">
            <div>
              <L l="Classe" v={f.classe} />
              <L l="Date" v={dateHeure(f.date)} />
              <L l="Heure de départ / d’arrivée" v={`${heure(f.heureDepart)} → ${heure(f.heureFin)}`} />
              <L l="Niveau" v={`${LIBELLE_NIVEAU[f.niveau]} · ${chrono(f.dureeCible)}`} />
              <L l="Temps effectif" v={`${chrono(f.tempsEffectif)}${f.arretAnticipe ? ' (arrêt anticipé)' : ''}`} />
              <L l="Observateur" v={f.observateurNom || '—'} />
              <L l="Ressenti (Borg)" v={f.borg != null ? `${f.borg} / 10` : '—'} />
            </div>
            <div>
              <L l="Tours + dernier tour" v={`${f.tours} × ${TOUR} m + ${f.metresDernierTour} m`} />
              <L l="Distance" v={`${f.distance} m (${kmM(f.distance)})`} />
              <L l="Calcul fait par l’élève" v={f.distanceCalculeeEleve == null ? '—' : `${f.distanceCalculeeEleve} m ${f.calculJuste ? '✓ juste' : '✗ faux'}`} />
              <L l="Accélérations ratées" v={`${f.accRatees} sur ${zonesAccelParcourues(f.distance)} zones`} />
              <L l="Arrêts / marche interdits" v={f.arretsInterdits} />
              <L l="Pauses en zone" v={`${f.pauses}${f.pausesDepassees ? ` (dont ${f.pausesDepassees} dépassée(s))` : ''}`} />
              <L l="Temps de pause" v={chrono(f.tempsPause)} />
            </div>
          </div>
          {f.observations && <p className="text-sm bloc"><span className="text-doux">Observations : </span>{f.observations}</p>}
          {Array.isArray(f.evenements) && f.evenements.length > 0 && (
            <div className="bloc">
              <p className="text-sm font-semibold mb-1">Chronologie (temps effectif)</p>
              <div className="max-h-56 overflow-y-auto print:max-h-none text-xs grid grid-cols-2 sm:grid-cols-3 gap-x-4">
                {f.evenements.map((e, i) => <p key={i} className="py-0.5"><span className="chiffres font-semibold">{chrono(e.t)}</span> {libelleEvenement(e.type)}</p>)}
              </div>
            </div>
          )}
        </div>
      )}
      {confirme && <Confirmation titre="Supprimer cette fiche ?" danger libelle="Supprimer" texte={`La fiche du ${dateHeure(f.date)} de ${nomComplet({ nom: f.coureurNom, prenom: f.coureurPrenom })} sera définitivement effacée.`} onNon={() => setConfirme(false)} onOui={() => { setConfirme(false); onSupprimer() }} />}
    </Modale>
  )
}
