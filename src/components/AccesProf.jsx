import { useState } from 'react'
import { Plus, Trash2, KeyRound, Pencil, Check, X, Eye } from 'lucide-react'
import { Confirmation } from './Modale'
import { id as nouvelId } from '../utils/format'

// Onglet Accès (administrateur) : collègues avec code personnel, et accès à leur espace.
export default function AccesProf({ acces, onEnregistrer, onVoirEspace }) {
  const [a, setA] = useState(acces)
  const [nouveau, setNouveau] = useState(null)
  const [edition, setEdition] = useState(null)
  const [confirme, setConfirme] = useState(null)
  const [etat, setEtat] = useState('')
  const [monPin, setMonPin] = useState('')

  async function sauver(n) {
    setA(n)
    setEtat('en-cours')
    setEtat((await onEnregistrer(n)) ? 'ok' : 'erreur')
  }
  const codeValide = (c) => /^\d{4,8}$/.test(c || '')

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="carte p-4 space-y-3">
        <p className="font-display text-xl font-bold">Administrateur</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <label><span className="etiquette">Nom affiché aux élèves</span>
            <input value={a.nomAdmin} onChange={(e) => setA({ ...a, nomAdmin: e.target.value })} onBlur={() => a.nomAdmin.trim() && sauver({ ...a, nomAdmin: a.nomAdmin.trim() })} className="champ" />
          </label>
          <label><span className="etiquette">Nouveau code d’accès (4 à 8 chiffres)</span>
            <div className="flex gap-2">
              <input type="password" inputMode="numeric" value={monPin} onChange={(e) => setMonPin(e.target.value.replace(/\D/g, ''))} className="champ" />
              <button disabled={!codeValide(monPin)} onClick={() => { sauver({ ...a, pinAdmin: monPin }); setMonPin('') }} className="btn-principal"><Check size={16} /></button>
            </div>
          </label>
        </div>
      </div>

      <div className="carte p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl font-bold">Collègues</p>
          <button onClick={() => setNouveau({ nom: '', pin: '' })} className="btn-bord text-sm"><Plus size={16} /> Ajouter</button>
        </div>
        <p className="text-xs text-doux">Chaque collègue a son propre espace (ses classes, ses fiches, ses notes, ses réglages). Les élèves le choisissent dans la liste à la connexion.</p>
        {nouveau && (
          <div className="bg-creux rounded-xl p-3 grid grid-cols-[1fr_8rem_auto] gap-2">
            <input autoFocus placeholder="Nom (ex. Mme Martin)" value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} className="champ" />
            <input placeholder="Code" inputMode="numeric" value={nouveau.pin} onChange={(e) => setNouveau({ ...nouveau, pin: e.target.value.replace(/\D/g, '') })} className="champ" />
            <div className="flex gap-1">
              <button disabled={!nouveau.nom.trim() || !codeValide(nouveau.pin)} onClick={() => { sauver({ ...a, collegues: [...a.collegues, { id: nouvelId(), nom: nouveau.nom.trim(), pin: nouveau.pin }] }); setNouveau(null) }} className="btn-principal"><Check size={16} /></button>
              <button onClick={() => setNouveau(null)} className="btn-doux"><X size={16} /></button>
            </div>
          </div>
        )}
        <div className="divide-y divide-bord border border-bord rounded-xl">
          {a.collegues.length === 0 && <p className="p-3 text-sm text-doux">Aucun collègue pour l’instant.</p>}
          {a.collegues.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {edition?.id === c.id ? (
                <>
                  <input value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} className="champ" />
                  <button onClick={() => { sauver({ ...a, collegues: a.collegues.map((x) => (x.id === c.id ? { ...x, nom: edition.nom.trim() || x.nom } : x)) }); setEdition(null) }} className="btn-principal"><Check size={16} /></button>
                  <button onClick={() => setEdition(null)} className="btn-doux"><X size={16} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-semibold">{c.nom}</span>
                  <button title="Voir son espace" onClick={() => onVoirEspace(c.id)} className="p-1.5 text-doux hover:text-texte"><Eye size={16} /></button>
                  <button title="Renommer" onClick={() => setEdition({ id: c.id, nom: c.nom })} className="p-1.5 text-doux hover:text-texte"><Pencil size={15} /></button>
                  <button title="Réinitialiser son code" onClick={() => setConfirme({ type: 'pin', c, code: '' })} className="p-1.5 text-doux hover:text-texte"><KeyRound size={15} /></button>
                  <button title="Retirer" onClick={() => setConfirme({ type: 'suppr', c })} className="p-1.5 text-doux hover:text-alerte"><Trash2 size={15} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-doux">{etat === 'en-cours' ? 'Enregistrement…' : etat === 'ok' ? 'Accès enregistrés.' : etat === 'erreur' ? '⚠ Échec de l’enregistrement en ligne.' : ''}</p>

      {confirme?.type === 'suppr' && (
        <Confirmation titre={`Retirer ${confirme.c.nom} ?`} danger libelle="Retirer"
          texte={'Ce collègue ne pourra plus se connecter et ne sera plus proposé aux élèves.\nSes données (classes, fiches, notes) restent enregistrées en ligne.'}
          onNon={() => setConfirme(null)} onOui={() => { sauver({ ...a, collegues: a.collegues.filter((x) => x.id !== confirme.c.id) }); setConfirme(null) }} />
      )}
      {confirme?.type === 'pin' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirme(null)}>
          <div className="bg-carte rounded-2xl p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-xl font-bold">Nouveau code pour {confirme.c.nom}</p>
            <input autoFocus inputMode="numeric" value={confirme.code} onChange={(e) => setConfirme({ ...confirme, code: e.target.value.replace(/\D/g, '') })} placeholder="4 à 8 chiffres" className="champ text-center text-lg" />
            <div className="flex gap-2 justify-end">
              <button className="btn-doux" onClick={() => setConfirme(null)}>Annuler</button>
              <button className="btn-principal" disabled={!codeValide(confirme.code)} onClick={() => { sauver({ ...a, collegues: a.collegues.map((x) => (x.id === confirme.c.id ? { ...x, pin: confirme.code } : x)) }); setConfirme(null) }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
