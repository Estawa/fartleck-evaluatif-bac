// Bips (Web Audio), vibrations, voix et écran maintenu allumé pendant l'observation.
let ctx = null
function contexte() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext
    if (C) ctx = new C()
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}
// à appeler sur un geste de l'utilisateur (sinon les navigateurs bloquent le son)
export function activerSon() { contexte() }

export function bip(freq = 880, duree = 0.15, delai = 0) {
  const c = contexte()
  if (!c) return
  const t = c.currentTime + delai
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'square'
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + duree + 0.02)
}
export const bipDepart = () => { bip(660, 0.12); bip(660, 0.12, 0.25); bip(990, 0.4, 0.5) }
export const bipCourt = () => bip(880, 0.08)
export const bipAlerte = () => { bip(990, 0.12); bip(990, 0.12, 0.2) }
export const bipFin = () => { bip(990, 0.25); bip(990, 0.25, 0.35); bip(660, 0.9, 0.7) }

export function vibrer(motif = 200) { try { navigator.vibrate && navigator.vibrate(motif) } catch (e) { /* rien */ } }

export function dire(texte) {
  try {
    if (!window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(texte)
    u.lang = 'fr-FR'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch (e) { /* rien */ }
}

let verrou = null
export async function garderEcranAllume() {
  try { if ('wakeLock' in navigator && !verrou) { verrou = await navigator.wakeLock.request('screen'); verrou.addEventListener('release', () => { verrou = null }) } } catch (e) { verrou = null }
}
export function libererEcran() { try { verrou && verrou.release() } catch (e) { /* rien */ } verrou = null }
