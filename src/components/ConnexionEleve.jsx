import { useEffect, useState } from 'react'
import { LogIn, Loader2, AlertTriangle } from 'lucide-react'
import BlocPartage from './BlocPartage'
import Liste from './Liste'
import { listeProfs, chargerRoster, chargerPin, enregistrerPin } from '../utils/cloud'
import { local, nomComplet } from '../utils/format'

// « QUI ES-TU ? » : professeur, classe, nom, puis code PIN personnel (choisi à la 1re connexion).
export default function ConnexionEleve({ acces, onConnecte, onProf }) {
  const dernier = local.lire('flp_dernier_eleve', {})
  const [prof, setProf] = useState(dernier.prof || '')
  const [roster, setRoster] = useState(null)
  const [classe, setClasse] = useState(dernier.classe || '')
  const [eleveId, setEleveId] = useState('')
  const [pinCloud, setPinCloud] = useState(undefined) // undefined = pas encore lu, null = aucun
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  const profs = listeProfs(acces)
  useEffect(() => {
    if (!prof) { setRoster(null); return }
    let actif = true
    setRoster(null)
    chargerRoster(prof).then((r) => { if (actif) setRoster(r) })
    return () => { actif = false }
  }, [prof])

  useEffect(() => {
    setPin(''); setPin2(''); setErreur(''); setPinCloud(undefined)
    if (!prof || !eleveId) return
    let actif = true
    chargerPin(prof, eleveId).then((p) => { if (actif) setPinCloud(p) })
    return () => { actif = false }
  }, [prof, eleveId])

  const classes = roster ? Object.keys(roster).sort((a, b) => a.localeCompare(b, 'fr')) : []
  const eleves = roster && classe ? roster[classe] || [] : []
  const eleve = eleves.find((e) => e.id === eleveId)
  const premiere = pinCloud === null

  async function commencer() {
    setErreur('')
    if (!/^\d{4,6}$/.test(pin)) { setErreur('Le code PIN doit contenir 4 à 6 chiffres.'); return }
    if (premiere) {
      if (pin !== pin2) { setErreur('Les deux codes ne sont pas identiques.'); return }
      setOccupe(true)
      await enregistrerPin(prof, eleveId, pin)
      setOccupe(false)
    } else if (pin !== pinCloud) {
      setErreur('Code PIN incorrect. Si tu l’as oublié, demande à ton professeur de le réinitialiser.')
      return
    }
    local.ecrire('flp_dernier_eleve', { prof, classe })
    const p = profs.find((x) => x.id === prof)
    onConnecte({ prof, profNom: p?.nom || '', classe, eleve })
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <BlocPartage />
      <div className="carte p-5 space-y-4">
        <h1 className="font-display text-3xl font-bold text-center">QUI ES-TU ?</h1>
        <Liste etiquette="Ton professeur d’EPS" valeur={prof} onChange={(v) => { setProf(v); setClasse(''); setEleveId('') }}
          options={profs.map((p) => ({ valeur: p.id, libelle: p.nom }))} />
        {prof && !roster && <p className="text-sm text-doux flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Chargement des classes…</p>}
        {roster && (
          classes.length === 0
            ? <p className="text-sm text-doux">Aucune classe enregistrée chez ce professeur pour l’instant.</p>
            : <Liste etiquette="Ta classe" valeur={classe} onChange={(v) => { setClasse(v); setEleveId('') }}
                options={classes.map((c) => ({ valeur: c, libelle: c }))} />
        )}
        {classe && (
          eleves.length === 0
            ? <p className="text-sm text-doux">Aucun élève enregistré dans cette classe.</p>
            : <Liste etiquette="Ton nom" valeur={eleveId} onChange={setEleveId}
                options={eleves.map((e) => ({ valeur: e.id, libelle: nomComplet(e) }))} />
        )}
        {eleveId && pinCloud === undefined && <p className="text-sm text-doux flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Vérification…</p>}
        {eleveId && pinCloud !== undefined && (
          <div className="space-y-2">
            <label className="block">
              <span className="etiquette">{premiere ? 'Choisis ton code PIN personnel (4 à 6 chiffres)' : 'Ton code PIN'}</span>
              <input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className="champ text-lg tracking-[0.4em] text-center" />
            </label>
            {premiere && (
              <label className="block">
                <span className="etiquette">Confirme ton code</span>
                <input type="password" inputMode="numeric" autoComplete="off" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))} className="champ text-lg tracking-[0.4em] text-center" />
              </label>
            )}
            {premiere && <p className="text-[11px] text-doux">Retiens-le bien : il protège tes fiches. Personne d’autre ne pourra se connecter à ton nom.</p>}
          </div>
        )}
        {erreur && <p className="text-sm text-alerte flex gap-1.5"><AlertTriangle size={16} className="shrink-0 mt-0.5" />{erreur}</p>}
        <button disabled={!eleveId || pinCloud === undefined || !pin || occupe} onClick={commencer} className="btn-feu w-full text-base py-3">
          <LogIn size={18} /> Commencer
        </button>
        <p className="text-[11px] text-doux text-center">Tes fiches ne sont visibles que par toi et ton professeur d’EPS.</p>
      </div>
      <button onClick={onProf} className="block mx-auto text-sm text-doux underline underline-offset-4">Tu es professeur ? Connexion ici</button>
    </div>
  )
}
