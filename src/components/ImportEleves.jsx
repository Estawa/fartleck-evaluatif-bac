import { useRef, useState } from 'react'
import { Upload, AlertTriangle, ChevronLeft } from 'lucide-react'
import Modale from './Modale'
import { parserLignesBrutes, deviverRole, separerNomPrenom, normaliserSexe, normaliser } from '../utils/eleves'
import { id as nouvelId } from '../utils/format'

// Import d'une liste de classe (moteur d'import d'EPS Pro / Course de Durée Pro) :
// aperçu brut du fichier, choix de ce que représente chaque colonne, aperçu final à cocher.
// Formats : .csv, .xlsx, .xls, .ods (exports Pronote et EPS Pro compris). L'ordre du fichier est conservé.

const CIBLES = [
  { id: 'nomComplet', label: 'Nom + Prénom (colonne unique)' },
  { id: 'nom', label: 'Nom' },
  { id: 'prenom', label: 'Prénom' },
  { id: 'classe', label: 'Classe' },
  { id: 'sexe', label: 'Sexe' }
]

const memeEleve = (a, nom, prenom) => normaliser(a.nom) === normaliser(nom) && normaliser(a.prenom) === normaliser(prenom)

// Applique l'import au roster ; renvoie { roster, conflits }
export function appliquerImport(roster, lignes, mode) {
  const res = Object.fromEntries(Object.entries(roster).map(([c, l]) => [c, [...l]]))
  const conflits = []
  const parClasse = {}
  lignes.forEach((l) => { (parClasse[l.classe] = parClasse[l.classe] || []).push(l) })

  Object.entries(parClasse).forEach(([classe, liste]) => {
    const existants = res[classe] || []
    const nouvelle = mode === 'remplacer' ? [] : [...existants]
    liste.forEach((l) => {
      const ici = existants.find((e) => memeEleve(e, l.nom, l.prenom))
      if (ici) {
        const maj = { ...ici, sexe: l.sexe || ici.sexe || '' }
        if (mode === 'remplacer') nouvelle.push(maj)
        else nouvelle[nouvelle.findIndex((e) => e.id === ici.id)] = maj
        return
      }
      const ailleurs = Object.entries(res).find(([c, el]) => c !== classe && el.some((e) => memeEleve(e, l.nom, l.prenom)))
      if (ailleurs) { conflits.push({ ...l, classeExistante: ailleurs[0] }); return }
      nouvelle.push({ id: nouvelId(), nom: l.nom, prenom: l.prenom, sexe: l.sexe || '' })
    })
    res[classe] = nouvelle
  })
  return { roster: res, conflits }
}

export default function ImportEleves({ roster, onValider, onFermer }) {
  const [etape, setEtape] = useState('choix')
  const [nomFichier, setNomFichier] = useState('')
  const [enTetes, setEnTetes] = useState([])
  const [lignes, setLignes] = useState([])
  const [cibles, setCibles] = useState({})
  const [cochees, setCochees] = useState([])
  const [classeCible, setClasseCible] = useState('')
  const [forcer, setForcer] = useState(false)
  const [erreur, setErreur] = useState('')
  const [conflits, setConflits] = useState(null)
  const [confirmeRemplacer, setConfirmeRemplacer] = useState(false)
  const inputRef = useRef(null)
  const classesExistantes = Object.keys(roster).sort()

  const indexPour = (c) => { const t = Object.entries(cibles).find(([, v]) => v === c); return t ? Number(t[0]) : undefined }

  async function lireFichier(file) {
    setErreur('')
    setNomFichier(file.name)
    try {
      const l = await parserLignesBrutes(file)
      if (l.length < 2) { setErreur('Le fichier ne contient pas assez de données (en-tête + au moins une ligne).'); return }
      const [entete, ...reste] = l
      const h = entete.map((x) => String(x).trim())
      setEnTetes(h)
      setLignes(reste)
      const devine = {}
      h.forEach((x, i) => { const r = deviverRole(x); if (r !== 'ignorer') devine[i] = r })
      setCibles(devine)
      setCochees(reste.map(() => true))
      setEtape('brut')
    } catch (e) {
      setErreur('Impossible de lire ce fichier. Formats acceptés : .csv, .xlsx, .xls, .ods')
    }
  }

  const classeMappee = indexPour('classe') !== undefined
  function construireLigne(ligne) {
    const iN = indexPour('nom'), iP = indexPour('prenom'), iC = indexPour('nomComplet'), iCl = indexPour('classe'), iS = indexPour('sexe')
    let nom = iN !== undefined ? String(ligne[iN] || '').trim() : ''
    let prenom = iP !== undefined ? String(ligne[iP] || '').trim() : ''
    if (iC !== undefined && !nom && !prenom) ({ nom, prenom } = separerNomPrenom(ligne[iC]))
    const brute = iCl !== undefined ? String(ligne[iCl] || '').trim() : ''
    const classe = (forcer || !brute ? classeCible.trim() : brute).toUpperCase()
    const sexe = iS !== undefined ? normaliserSexe(ligne[iS]) : ''
    const existe = Object.values(roster).some((l) => l.some((e) => memeEleve(e, nom, prenom)))
    return { nom, prenom, classe, sexe, existe }
  }
  const construits = etape === 'apercu' ? lignes.map(construireLigne) : []
  const retenus = construits.filter((e, i) => cochees[i] && (e.nom || e.prenom) && e.classe)

  function valider(mode) {
    if ((!classeMappee || forcer) && !classeCible.trim()) { setErreur('Choisis ou saisis la classe pour cet import.'); return }
    if (!retenus.length) { setErreur('Aucun élève sélectionné.'); return }
    const r = appliquerImport(roster, retenus, mode)
    onValider(r.roster)
    if (r.conflits.length) setConflits(r.conflits)
    else onFermer()
  }

  if (conflits) {
    return (
      <Modale titre="Import terminé" onFermer={onFermer} pied={<button className="btn-principal w-full" onClick={onFermer}>OK</button>}>
        <p className="text-sm mb-2">{conflits.length} élève(s) déjà présent(s) dans une autre classe n’ont pas été déplacés (pour éviter les doublons) :</p>
        <ul className="text-sm list-disc pl-5 text-doux">{conflits.map((c, i) => <li key={i}>{c.prenom} {c.nom} : resté en {c.classeExistante} (le fichier l’indiquait en {c.classe})</li>)}</ul>
      </Modale>
    )
  }

  return (
    <Modale titre="Importer une liste d’élèves" onFermer={onFermer} large>
      <div className="space-y-4">
        {erreur && <p className="text-alerte text-sm flex items-center gap-1.5"><AlertTriangle size={14} /> {erreur}</p>}

        {etape === 'choix' && (
          <>
            <p className="text-sm text-doux">Formats acceptés : .csv, .xlsx, .xls, .ods (exports Pronote et EPS Pro compris). L’ordre du fichier est conservé.</p>
            <input ref={inputRef} type="file" accept=".csv,.txt,.xlsx,.xls,.ods" className="hidden" onChange={(e) => e.target.files[0] && lireFichier(e.target.files[0])} />
            <button onClick={() => inputRef.current?.click()} className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-bord rounded-xl py-8 text-doux hover:border-feu">
              <Upload size={22} /><span className="text-sm font-medium">Toucher pour choisir un fichier</span>
            </button>
          </>
        )}

        {etape === 'brut' && (
          <>
            <p className="text-xs text-doux">{nomFichier} · {enTetes.length} colonne(s) · {lignes.length} ligne(s)</p>
            <p className="text-sm">Aperçu du fichier tel quel :</p>
            <div className="overflow-auto border border-bord rounded-xl max-h-72">
              <table className="text-xs w-full border-collapse">
                <thead><tr>{enTetes.map((h, i) => <th key={i} className="sticky top-0 bg-creux border-b border-bord px-2 py-1.5 text-left whitespace-nowrap">{h || `Colonne ${i + 1}`}</th>)}</tr></thead>
                <tbody>{lignes.slice(0, 30).map((l, i) => <tr key={i}>{enTetes.map((_, j) => <td key={j} className="border-b border-bord px-2 py-1.5 whitespace-nowrap text-doux">{String(l[j] ?? '').trim() || '—'}</td>)}</tr>)}</tbody>
              </table>
            </div>
            {lignes.length > 30 && <p className="text-[11px] text-doux">… et {lignes.length - 30} ligne(s) de plus.</p>}
            <div className="flex justify-between">
              <button onClick={() => setEtape('choix')} className="text-sm text-doux flex items-center gap-1"><ChevronLeft size={16} /> Changer de fichier</button>
              <button onClick={() => setEtape('colonnes')} className="btn-principal text-sm">Choisir les colonnes →</button>
            </div>
          </>
        )}

        {etape === 'colonnes' && (
          <>
            <p className="text-sm">Pour chaque colonne, choisis ce qu’elle représente :</p>
            <div className="space-y-2.5">
              {enTetes.map((h, i) => (
                <div key={i}>
                  <p className="text-[11px] text-doux mb-1">{h || `Colonne ${i + 1}`} <span className="opacity-70">(ex. {String(lignes[0]?.[i] ?? '').trim() || '—'})</span></p>
                  <select value={cibles[i] ?? ''} onChange={(e) => setCibles((m) => { const s = { ...m }; if (e.target.value === '') delete s[i]; else s[i] = e.target.value; return s })} className="champ">
                    <option value="">— Non importé —</option>
                    {CIBLES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {classeMappee && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={forcer} onChange={(e) => setForcer(e.target.checked)} /> Ignorer la colonne « Classe » et tout mettre dans une seule classe</label>
            )}
            {(!classeMappee || forcer) && (
              <div className="space-y-1.5">
                <span className="etiquette">Classe de tous les élèves sélectionnés</span>
                {classesExistantes.length > 0 && (
                  <select value={classesExistantes.includes(classeCible.toUpperCase()) ? classeCible.toUpperCase() : ''} onChange={(e) => e.target.value && setClasseCible(e.target.value)} className="champ">
                    <option value="">— Choisir une classe existante —</option>
                    {classesExistantes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <input value={classeCible} onChange={(e) => setClasseCible(e.target.value)} placeholder="Ou saisir le nom de la classe (ex. 1PRO2)" className="champ" />
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setEtape('brut')} className="text-sm text-doux flex items-center gap-1"><ChevronLeft size={16} /> Aperçu</button>
              <button onClick={() => {
                if (indexPour('nomComplet') === undefined && indexPour('nom') === undefined) { setErreur('Associe au moins une colonne « Nom » (ou « Nom + Prénom »).'); return }
                setErreur(''); setEtape('apercu')
              }} className="btn-principal text-sm">Aperçu final →</button>
            </div>
          </>
        )}

        {etape === 'apercu' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-doux">{cochees.filter(Boolean).length} / {lignes.length} sélectionné(s)</p>
              <div className="flex gap-3 text-[11px] font-semibold">
                <button onClick={() => setCochees((c) => c.map(() => true))}>Tout cocher</button>
                <button className="text-doux" onClick={() => setCochees((c) => c.map(() => false))}>Tout décocher</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto border border-bord rounded-xl divide-y divide-bord">
              {construits.map((e, i) => (
                <label key={i} className={`flex items-center gap-2.5 px-3 py-2 ${cochees[i] ? '' : 'opacity-40'}`}>
                  <input type="checkbox" checked={cochees[i]} onChange={() => setCochees((c) => c.map((v, j) => (j === i ? !v : v)))} />
                  <span className="text-sm flex-1">{e.nom} {e.prenom} <span className="text-doux text-xs">· {e.classe || '(sans classe)'}{e.sexe ? ` · ${e.sexe}` : ''}</span></span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${e.existe ? 'bg-feuclair text-feu' : 'bg-creux'}`}>{e.existe ? 'mise à jour' : 'nouveau'}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => valider('ajouter')} className="btn-principal flex-1 text-sm">Mettre à jour / ajouter</button>
              <button onClick={() => setConfirmeRemplacer(true)} className="btn-bord flex-1 text-sm">Remplacer la classe</button>
            </div>
            {confirmeRemplacer && (
              <div className="rounded-xl border border-alerte p-3 text-sm space-y-2">
                <p>Chaque classe concernée ne gardera que les élèves de ce fichier. Les élèves reconnus gardent leur code PIN et leurs fiches. Continuer ?</p>
                <div className="flex gap-2 justify-end">
                  <button className="btn-doux text-sm" onClick={() => setConfirmeRemplacer(false)}>Annuler</button>
                  <button className="btn bg-alerte text-white px-3 py-2 text-sm" onClick={() => valider('remplacer')}>Remplacer</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modale>
  )
}
