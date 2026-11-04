export const deuxChiffres = (n) => String(Math.floor(n)).padStart(2, '0')

// secondes -> "mm:ss" (ou "h:mm:ss")
export function chrono(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${deuxChiffres(m)}:${deuxChiffres(s % 60)}` : `${deuxChiffres(m)}:${deuxChiffres(s % 60)}`
}

// mètres -> "3 km 275 m"
export function kmM(m) {
  const d = Math.max(0, Math.round(Number(m) || 0))
  const km = Math.floor(d / 1000)
  const reste = d % 1000
  if (!km) return `${reste} m`
  return reste ? `${km} km ${reste} m` : `${km} km`
}

export const nb = (x, dec = 2) => (x === null || x === undefined || Number.isNaN(x) ? '—' : String(Math.round(x * 10 ** dec) / 10 ** dec).replace('.', ','))

export function dateCourte(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
export function dateHeure(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}
export const heure = (ms) => (ms ? new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '')

export const nomComplet = (e) => (e ? `${e.nom || ''} ${e.prenom || ''}`.trim() : '')

export const id = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export function telechargerCSV(nomFichier, entetes, lignes) {
  const echap = (v) => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }
  const csv = '﻿' + [entetes, ...lignes].map((l) => l.map(echap).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const local = {
  lire(cle, defaut) { try { const v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v) } catch (e) { return defaut } },
  ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)) } catch (e) { /* stockage plein ou bloqué */ } },
  effacer(cle) { try { localStorage.removeItem(cle) } catch (e) { /* rien */ } }
}
