import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, Users, FileText, GraduationCap, SlidersHorizontal, ShieldCheck, QrCode, Loader2 } from 'lucide-react'
import ClassesProf from './ClassesProf'
import FichesProf from './FichesProf'
import NotesProf from './NotesProf'
import ReglagesProf from './ReglagesProf'
import AccesProf from './AccesProf'
import Observation from './Observation'
import BlocPartage from './BlocPartage'
import { chargerRoster, enregistrerRoster, chargerTypes, enregistrerTypes, chargerReglages, enregistrerReglages, chargerFiches, listeProfs, viderFile } from '../utils/cloud'
import { completerReglages } from '../utils/bareme'
import { local } from '../utils/format'

// Espace professeur. L'administrateur peut afficher l'espace de n'importe quel collègue (Vue globale).
export default function EspaceProf({ session, acces, onAcces }) {
  const [espace, setEspace] = useState(session.prof)
  const [onglet, setOnglet] = useState(local.lire('flp_onglet_prof', 'classes'))
  const [roster, setRosterEtat] = useState(null)
  const [types, setTypesEtat] = useState({})
  const [reglages, setReglages] = useState(null)
  const [fiches, setFiches] = useState([])
  const [classe, setClasse] = useState('')
  const enCours = useRef(0)

  const profs = listeProfs(acces)
  const nomEspace = profs.find((p) => p.id === espace)?.nom || ''
  const autreEspace = espace !== session.prof

  const charger = useCallback(async () => {
    const n = ++enCours.current
    setRosterEtat(null)
    await viderFile()
    const [r, t, g, f] = await Promise.all([chargerRoster(espace), chargerTypes(espace), chargerReglages(espace), chargerFiches(espace)])
    if (n !== enCours.current) return
    setRosterEtat(r); setTypesEtat(t); setReglages(completerReglages(g)); setFiches(f)
    setClasse((c) => (c && r[c] ? c : ''))
  }, [espace])
  useEffect(() => { charger() }, [charger])
  useEffect(() => { local.ecrire('flp_onglet_prof', onglet) }, [onglet])

  const setRoster = (r) => { setRosterEtat(r); enregistrerRoster(espace, r) }
  const setTypes = (t) => { setTypesEtat(t); enregistrerTypes(espace, t) }
  const actualiserFiches = async () => { await viderFile(); setFiches(await chargerFiches(espace)) }

  const onglets = [
    { id: 'observer', l: 'Observer', i: Eye },
    { id: 'classes', l: 'Classes', i: Users },
    { id: 'fiches', l: 'Fiches', i: FileText },
    { id: 'notes', l: 'Notes', i: GraduationCap },
    { id: 'reglages', l: 'Réglages', i: SlidersHorizontal },
    ...(session.admin ? [{ id: 'acces', l: 'Accès', i: ShieldCheck }] : []),
    { id: 'partage', l: 'Partager', i: QrCode }
  ]

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {session.admin && acces.collegues.length > 0 && (
        <div className={`rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 text-sm pas-imprimer ${autreEspace ? 'bg-feuclair border border-feu' : 'bg-creux'}`}>
          <span className="font-semibold">Vue globale · espace affiché :</span>
          <select value={espace} onChange={(e) => setEspace(e.target.value)} className="rounded-lg border border-bord px-2 py-1 text-sm">
            {profs.map((p) => <option key={p.id} value={p.id}>{p.id === session.prof ? `Mon espace (${p.nom})` : p.nom}</option>)}
          </select>
          {autreEspace && <span className="text-xs text-feu">Tu consultes et modifies l’espace de {nomEspace}.</span>}
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto pas-imprimer -mx-1 px-1">
        {onglets.map((o) => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ${onglet === o.id ? 'bg-nuit text-white dark:text-fond' : 'text-doux hover:bg-creux'}`}>
            <o.i size={16} /> {o.l}
          </button>
        ))}
      </nav>

      {onglet === 'acces' && session.admin ? (
        <AccesProf acces={acces} onEnregistrer={onAcces} onVoirEspace={(id) => { setEspace(id); setOnglet('classes') }} />
      ) : onglet === 'partage' ? (
        <div className="max-w-sm mx-auto"><BlocPartage ouvertParDefaut /></div>
      ) : !roster || !reglages ? (
        <p className="text-center text-doux py-12 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Chargement…</p>
      ) : onglet === 'observer' ? (
        <Observation key={espace} prof={espace} roster={roster} observateur={{ id: null, nom: session.nom }} parProf reglages={reglages}
          onQuitter={() => { setOnglet('fiches'); actualiserFiches() }} />
      ) : onglet === 'classes' ? (
        <ClassesProf prof={espace} roster={roster} setRoster={setRoster} types={types} setTypes={setTypes} classe={classe} setClasse={setClasse} />
      ) : onglet === 'fiches' ? (
        <FichesProf prof={espace} roster={roster} fiches={fiches} setFiches={setFiches} onActualiser={actualiserFiches} classe={classe} setClasse={setClasse} />
      ) : onglet === 'notes' ? (
        <NotesProf prof={espace} roster={roster} types={types} fiches={fiches} reglages={reglages} classe={classe} setClasse={setClasse} />
      ) : (
        <ReglagesProf key={espace} reglages={reglages} onEnregistrer={async (r) => { const ok = await enregistrerReglages(espace, r); setReglages(completerReglages(r)); return ok }} />
      )}
    </div>
  )
}
