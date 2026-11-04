import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Check, Share2, QrCode, ChevronDown } from 'lucide-react'
import { APP } from '../config'

// Bloc flashcode + lien de partage, en haut des écrans de connexion.
export default function BlocPartage({ ouvertParDefaut = false }) {
  const canvasRef = useRef(null)
  const [ouvert, setOuvert] = useState(ouvertParDefaut)
  const [copie, setCopie] = useState(false)
  const lien = window.location.origin + window.location.pathname

  useEffect(() => {
    if (ouvert && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, lien, { width: ouvertParDefaut ? 260 : 200, margin: 1, color: { dark: '#0F2E4C', light: '#ffffff' } }).catch(() => {})
    }
  }, [ouvert, lien])

  function copier() {
    navigator.clipboard?.writeText(lien).then(() => { setCopie(true); setTimeout(() => setCopie(false), 2000) }).catch(() => {})
  }
  function partager() {
    if (navigator.share) navigator.share({ title: APP.nom, url: lien }).catch(() => {})
    else copier()
  }

  return (
    <div className="carte overflow-hidden">
      <button onClick={() => setOuvert(!ouvert)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold">
        <QrCode size={18} className="text-feu" /> Partager l’appli (flashcode, lien)
        <ChevronDown size={16} className={`ml-auto text-doux transition ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      {ouvert && (
        <div className="px-4 pb-4 flex flex-col items-center gap-3">
          <canvas ref={canvasRef} className="rounded-xl bg-white" />
          <p className="w-full bg-creux rounded-xl px-3 py-2 text-xs break-all text-center">{lien}</p>
          <div className="flex gap-2 w-full">
            <button onClick={copier} className="btn-doux flex-1 text-sm">{copie ? <Check size={16} /> : <Copy size={16} />}{copie ? 'Copié' : 'Copier'}</button>
            <button onClick={partager} className="btn-principal flex-1 text-sm"><Share2 size={16} />Partager</button>
          </div>
        </div>
      )}
    </div>
  )
}
