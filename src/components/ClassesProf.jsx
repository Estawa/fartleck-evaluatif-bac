import { useEffect, useState } from 'react'
import { Upload, Plus, Trash2, Pencil, KeyRound, Check, X, Users } from 'lucide-react'
import ImportEleves from './ImportEleves'
import { Confirmation } from './Modale'
import { chargerPinsDefinis, effacerPin } from '../utils/cloud'
import { id as nouvelId } from '../utils/format'

// Classes et élèves du professeur : import, ajout, modification, suppression, type Bac GT / Bac Pro.
export default function ClassesProf({ prof, roster, setRoster, types, setTypes, classe, setClasse }) {
  const [importer, setImporter] = useState(false)
  const [nouvelleClasse, setNouvelleClasse] = useState(null)
  const [edition, setEdition] = useState(null) // { id|null, nom, prenom, sexe }
  const [confirme, setConfirme] = useState(null)
  const [pins, setPins] = useState({})

  useEffect(() => { chargerPinsDefinis(prof).then(setPins) }, [prof, classe])

  const classes = Object.keys(roster).sort((a, b) => a.localeCompare(b, 'fr'))
  const eleves = classe ? roster[classe] || [] : []

  function creerClasse() {
    const nom = (nouvelleClasse || '').trim().toUpperCase()
    if (!nom) return
    if (!roster[nom]) setRoster({ ...roster, [nom]: [] })
    setClasse(nom)
    setNouvelleClasse(null)
  }
  function supprimerClasse() {
    const r = { ...roster }
    delete r[classe]
    setRoster(r)
    setClasse('')
  }
  function enregistrerEleve() {
    const e = edition
    if (!e.nom.trim() && !e.prenom.trim()) return
    const propre = { nom: e.nom.trim().toUpperCase(), prenom: e.prenom.trim(), sexe: e.sexe }
    const liste = e.id ? eleves.map((x) => (x.id === e.id ? { ...x, ...propre } : x)) : [...eleves, { id: nouvelId(), ...propre }]
    setRoster({ ...roster, [classe]: liste })
    setEdition(null)
  }
  function retirerEleve(el) {
    setRoster({ ...roster, [classe]: eleves.filter((x) => x.id !== el.id) })
  }
  async function reinitialiserPin(el) {
    await effacerPin(prof, el.id)
    setPins((p) => { const n = { ...p }; delete n[el.id]; return n })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setImporter(true)} className="btn-principal text-sm"><Upload size={16} /> Importer une liste</button>
        <button onClick={() => setNouvelleClasse('')} className="btn-bord text-sm"><Plus size={16} /> Nouvelle classe</button>
      </div>

      {nouvelleClasse !== null && (
        <div className="carte p-3 flex gap-2">
          <input autoFocus value={nouvelleClasse} onChange={(e) => setNouvelleClasse(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && creerClasse()} placeholder="Nom de la classe (ex. TPRO1)" className="champ" />
          <button onClick={creerClasse} className="btn-principal"><Check size={16} /></button>
          <button onClick={() => setNouvelleClasse(null)} className="btn-doux"><X size={16} /></button>
        </div>
      )}

      {classes.length === 0 ? (
        <div className="carte p-6 text-center text-doux text-sm"><Users className="mx-auto mb-2" />Aucune classe. Importe une liste (export Pronote ou EPS Pro) ou crée une classe.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <button key={c} onClick={() => setClasse(c)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${classe === c ? 'bg-nuit text-white dark:text-fond border-nuit' : 'border-bord bg-carte'}`}>
              {c} <span className="font-normal opacity-75">· {(roster[c] || []).length} · {types[c] === 'gt' ? 'GT' : types[c] === 'pro' ? 'Pro' : '?'}</span>
            </button>
          ))}
        </div>
      )}

      {classe && roster[classe] && (
        <div className="carte p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="font-display text-2xl font-bold">{classe}</p>
            <div className="flex gap-1.5">
              {[['gt', 'Bac GT'], ['pro', 'Bac Pro']].map(([v, l]) => (
                <button key={v} onClick={() => setTypes({ ...types, [classe]: v })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${types[classe] === v ? 'bg-feu text-white border-feu' : 'border-bord'}`}>{l}</button>
              ))}
            </div>
          </div>
          {!types[classe] && <p className="text-xs text-ambre">Type d’évaluation à préciser (Bac GT ou Bac Pro) pour calculer les notes.</p>}

          <div className="divide-y divide-bord border border-bord rounded-xl">
            {eleves.length === 0 && <p className="p-3 text-sm text-doux">Aucun élève dans cette classe.</p>}
            {eleves.map((el, i) => (
              <div key={el.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="text-doux w-6 text-right text-xs">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate"><b>{el.nom}</b> {el.prenom} <span className="text-doux text-xs">{el.sexe ? `· ${el.sexe}` : '· sexe ?'}</span></span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${pins[el.id] ? 'bg-vert/15 text-vert' : 'bg-creux text-doux'}`}>{pins[el.id] ? 'PIN ✓' : 'PIN —'}</span>
                {pins[el.id] && <button title="Réinitialiser le code PIN" onClick={() => setConfirme({ titre: 'Réinitialiser le code PIN ?', texte: `${el.prenom} ${el.nom} choisira un nouveau code à sa prochaine connexion.`, action: () => reinitialiserPin(el) })} className="p-1.5 text-doux hover:text-texte"><KeyRound size={15} /></button>}
                <button title="Modifier" onClick={() => setEdition({ ...el })} className="p-1.5 text-doux hover:text-texte"><Pencil size={15} /></button>
                <button title="Retirer" onClick={() => setConfirme({ titre: 'Retirer cet élève ?', texte: `${el.prenom} ${el.nom} sera retiré de ${classe}. Ses fiches déjà reçues restent dans l’onglet Fiches.`, danger: true, action: () => retirerEleve(el) })} className="p-1.5 text-doux hover:text-alerte"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>

          {edition ? (
            <div className="bg-creux rounded-xl p-3 space-y-2">
              <p className="text-sm font-semibold">{edition.id ? 'Modifier l’élève' : 'Ajouter un élève'}</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} placeholder="NOM" className="champ" />
                <input value={edition.prenom} onChange={(e) => setEdition({ ...edition, prenom: e.target.value })} placeholder="Prénom" className="champ" />
              </div>
              <div className="flex gap-1.5 items-center text-sm">
                Sexe :
                {[['F', 'Fille'], ['M', 'Garçon']].map(([v, l]) => (
                  <button key={v} onClick={() => setEdition({ ...edition, sexe: edition.sexe === v ? '' : v })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${edition.sexe === v ? 'bg-nuit text-white dark:text-fond border-nuit' : 'border-bord bg-carte'}`}>{l}</button>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEdition(null)} className="btn-doux text-sm">Annuler</button>
                <button onClick={enregistrerEleve} className="btn-principal text-sm"><Check size={16} /> Enregistrer</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-between">
              <button onClick={() => setEdition({ id: null, nom: '', prenom: '', sexe: '' })} className="btn-bord text-sm"><Plus size={16} /> Ajouter un élève</button>
              <button onClick={() => setConfirme({ titre: `Supprimer la classe ${classe} ?`, texte: 'La liste des élèves de cette classe est effacée. Les fiches déjà reçues restent dans l’onglet Fiches.', danger: true, action: supprimerClasse })} className="btn text-sm text-alerte px-3 py-2"><Trash2 size={16} /> Supprimer la classe</button>
            </div>
          )}
        </div>
      )}

      {importer && <ImportEleves roster={roster} onValider={setRoster} onFermer={() => setImporter(false)} />}
      {confirme && <Confirmation titre={confirme.titre} texte={confirme.texte} danger={confirme.danger} onNon={() => setConfirme(null)} onOui={() => { confirme.action(); setConfirme(null) }} />}
    </div>
  )
}
