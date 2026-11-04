import { Sun, Moon, BookOpen, LogOut } from 'lucide-react'
import Icone from './Icone'
import { APP } from '../config'

// En-tête : nom de l'appli, auteur, numéro de version discret (touchez-le pour le journal des
// modifications), notice PDF, mode jour / nuit, déconnexion.
export default function Header({ nuit, onTheme, onJournal, onDeconnexion, sousTitre }) {
  return (
    <header className="sticky top-0 z-40 bg-carte/95 backdrop-blur border-b border-bord pas-imprimer">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2.5">
        <Icone taille={34} className="rounded-lg shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-display text-xl font-bold whitespace-nowrap">
            {APP.nom} <span className="font-body text-[11px] font-medium text-doux">by {APP.auteur}</span>
          </p>
          <p className="text-[11px] text-doux truncate">
            {sousTitre ? `${sousTitre} · ` : ''}
            <button onClick={onJournal} title="Journal des modifications" className="underline decoration-dotted underline-offset-2">v{APP.version}</button>
          </p>
        </div>
        <a href={APP.notice} target="_blank" rel="noreferrer" title="Notice d'utilisation (PDF)" className="p-2 rounded-lg hover:bg-creux text-doux"><BookOpen size={18} /></a>
        <button onClick={onTheme} title={nuit ? 'Mode jour' : 'Mode nuit'} className="p-2 rounded-lg hover:bg-creux text-doux">{nuit ? <Sun size={18} /> : <Moon size={18} />}</button>
        {onDeconnexion && <button onClick={onDeconnexion} title="Se déconnecter" className="p-2 rounded-lg hover:bg-creux text-doux"><LogOut size={18} /></button>}
      </div>
    </header>
  )
}
