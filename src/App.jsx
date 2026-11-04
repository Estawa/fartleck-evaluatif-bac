import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, WifiOff } from 'lucide-react'
import Header from './components/Header'
import Demarrage from './components/Demarrage'
import Journal from './components/Journal'
import ConnexionEleve from './components/ConnexionEleve'
import ConnexionProf from './components/ConnexionProf'
import EspaceEleve from './components/EspaceEleve'
import EspaceProf from './components/EspaceProf'
import { chargerAcces, enregistrerAcces, ecouterEtatCloud, viderFile } from './utils/cloud'
import { local, nomComplet } from './utils/format'

export default function App() {
  const [demarre, setDemarre] = useState(false)
  const [nuit, setNuit] = useState(() => document.documentElement.classList.contains('dark'))
  const [journal, setJournal] = useState(false)
  const [acces, setAcces] = useState(null)
  const [ecran, setEcran] = useState('eleve-login')
  const [session, setSession] = useState(() => local.lire('flp_session', null))
  const [etatCloud, setEtatCloud] = useState({})

  useEffect(() => { chargerAcces().then(setAcces) }, [])
  useEffect(() => ecouterEtatCloud(setEtatCloud), [])

  // Envoi des fiches gardées sur le téléphone : au démarrage, au retour du réseau, puis régulièrement
  useEffect(() => {
    viderFile()
    const f = () => viderFile()
    window.addEventListener('online', f)
    const t = setInterval(f, 45000)
    return () => { window.removeEventListener('online', f); clearInterval(t) }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', nuit)
    local.ecrire('flp_theme', nuit ? 'nuit' : 'jour')
  }, [nuit])
  useEffect(() => { local.ecrire('flp_session', session) }, [session])

  // Une session professeur n'est gardée que si le collègue existe toujours
  useEffect(() => {
    if (!acces || !session || session.type !== 'prof' || session.admin) return
    if (!acces.collegues.some((c) => c.id === session.prof)) setSession(null)
  }, [acces, session])

  const deconnexion = () => { setSession(null); setEcran(session?.type === 'prof' ? 'prof-login' : 'eleve-login') }
  async function majAcces(n) { setAcces(n); return enregistrerAcces(n) }

  if (!demarre) return <Demarrage onTermine={() => setDemarre(true)} />

  const sousTitre = session?.type === 'eleve' ? `${nomComplet(session.eleve)} · ${session.classe}` : session?.type === 'prof' ? `Espace professeur · ${session.nom}` : ''

  return (
    <div className="min-h-screen bg-fond text-texte">
      <Header nuit={nuit} onTheme={() => setNuit(!nuit)} onJournal={() => setJournal(true)} onDeconnexion={session ? deconnexion : null} sousTitre={sousTitre} />
      {etatCloud.reglesManquantes && (
        <div className="bg-alerte text-white text-xs px-4 py-2 pas-imprimer">
          <p className="max-w-5xl mx-auto flex gap-2"><AlertTriangle size={16} className="shrink-0" />
            La base en ligne refuse l’accès : les règles Firestore du projet « Running » doivent autoriser flp_acces et flp_profs (voir le README). En attendant, les données restent sur cet appareil.</p>
        </div>
      )}
      {etatCloud.horsLigne && !etatCloud.reglesManquantes && (
        <div className="bg-ambre text-white text-xs px-4 py-1.5 pas-imprimer"><p className="max-w-5xl mx-auto flex gap-2 items-center"><WifiOff size={14} /> Réseau absent ou très lent : l’appli continue avec les données gardées sur l’appareil.</p></div>
      )}

      {!acces ? (
        <p className="text-center text-doux py-16 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} /> Connexion…</p>
      ) : session?.type === 'eleve' ? (
        <EspaceEleve session={session} />
      ) : session?.type === 'prof' ? (
        <EspaceProf session={session} acces={acces} onAcces={majAcces} />
      ) : ecran === 'prof-login' ? (
        <ConnexionProf acces={acces} onEleve={() => setEcran('eleve-login')} onConnecte={(s) => setSession({ type: 'prof', ...s })} />
      ) : (
        <ConnexionEleve acces={acces} onProf={() => setEcran('prof-login')} onConnecte={(s) => setSession({ type: 'eleve', ...s })} />
      )}

      {journal && <Journal onFermer={() => setJournal(false)} />}
    </div>
  )
}
