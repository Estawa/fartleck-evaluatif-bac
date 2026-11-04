import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modale({ titre, onFermer, children, large = false, pied = null }) {
  return createPortal(
    <div className="modale-racine fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onFermer}>
      <div onClick={(e) => e.stopPropagation()}
        className={`bg-carte text-texte rounded-t-2xl sm:rounded-2xl w-full ${large ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col`}>
        <div className="pas-imprimer flex items-center justify-between gap-3 px-5 py-3.5 border-b border-bord">
          <h3 className="font-display text-xl font-bold">{titre}</h3>
          <button onClick={onFermer} className="p-1.5 rounded-full hover:bg-creux text-doux" aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="modale-corps p-5 overflow-y-auto flex-1">{children}</div>
        {pied && <div className="pas-imprimer px-5 py-3 border-t border-bord">{pied}</div>}
      </div>
    </div>,
    document.body
  )
}

// Imprime seulement le contenu de la fenêtre ouverte
export function imprimerModale() {
  document.body.classList.add('imprime-modale')
  const fin = () => { document.body.classList.remove('imprime-modale'); window.removeEventListener('afterprint', fin) }
  window.addEventListener('afterprint', fin)
  window.print()
  setTimeout(fin, 1500)
}

// Fenêtre de confirmation (remplace window.confirm)
export function Confirmation({ titre, texte, libelle = 'Confirmer', danger = false, onOui, onNon }) {
  return (
    <Modale titre={titre} onFermer={onNon}
      pied={
        <div className="flex gap-2 justify-end">
          <button className="btn-doux" onClick={onNon}>Annuler</button>
          <button className={danger ? 'btn bg-alerte text-white px-4 py-2.5' : 'btn-principal'} onClick={onOui}>{libelle}</button>
        </div>
      }>
      <p className="text-sm text-texte leading-relaxed whitespace-pre-line">{texte}</p>
    </Modale>
  )
}
