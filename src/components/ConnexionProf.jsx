import { useState } from 'react'
import { LogIn, AlertTriangle } from 'lucide-react'
import BlocPartage from './BlocPartage'
import Liste from './Liste'
import { listeProfs } from '../utils/cloud'
import { local } from '../utils/format'

export default function ConnexionProf({ acces, onConnecte, onEleve }) {
  const [prof, setProf] = useState(local.lire('flp_dernier_prof', ''))
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState('')
  const profs = listeProfs(acces)

  function connecter() {
    const p = profs.find((x) => x.id === prof)
    if (!p) return
    const attendu = p.admin ? acces.pinAdmin : acces.collegues.find((c) => c.id === p.id)?.pin
    if (code !== String(attendu)) { setErreur('Code d’accès incorrect.'); return }
    local.ecrire('flp_dernier_prof', prof)
    onConnecte({ prof: p.id, nom: p.nom, admin: !!p.admin })
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      <BlocPartage />
      <div className="carte p-5 space-y-4">
        <h1 className="font-display text-3xl font-bold text-center">CONNEXION PROFESSEUR</h1>
        <Liste etiquette="Ton nom" valeur={prof} onChange={(v) => { setProf(v); setErreur('') }} options={profs.map((p) => ({ valeur: p.id, libelle: p.nom }))} />
        <label className="block">
          <span className="etiquette">Code d’accès</span>
          <input type="password" inputMode="numeric" value={code} onChange={(e) => { setCode(e.target.value); setErreur('') }}
            onKeyDown={(e) => e.key === 'Enter' && connecter()} className="champ text-lg tracking-[0.4em] text-center" />
        </label>
        {erreur && <p className="text-sm text-alerte flex gap-1.5"><AlertTriangle size={16} className="shrink-0 mt-0.5" />{erreur}</p>}
        <button disabled={!prof || !code} onClick={connecter} className="btn-principal w-full text-base py-3"><LogIn size={18} /> Se connecter</button>
      </div>
      <button onClick={onEleve} className="block mx-auto text-sm text-doux underline underline-offset-4">← Je suis élève</button>
    </div>
  )
}
