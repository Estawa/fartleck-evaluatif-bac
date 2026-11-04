import { useEffect } from 'react'
import Icone from './Icone'
import { APP } from '../config'

// Écran vu un instant à l'ouverture (l'icône en grand), puis passage automatique à la suite.
export default function Demarrage({ onTermine }) {
  useEffect(() => {
    const t = setTimeout(onTermine, 900)
    return () => clearTimeout(t)
  }, [onTermine])
  return (
    <button onClick={onTermine} className="w-full min-h-screen flex flex-col items-center justify-center px-6 text-center bg-fond">
      <Icone taille={128} className="rounded-[28px] shadow-xl mb-6" />
      <h1 className="font-display text-4xl font-bold">{APP.nom}</h1>
      <p className="text-sm text-doux mt-1">Évaluation du fartlek · Bac GT et Bac Pro</p>
      <p className="text-xs text-doux/70 mt-3">by {APP.auteur} · v{APP.version}</p>
    </button>
  )
}
