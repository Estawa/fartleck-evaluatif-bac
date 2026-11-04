import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, Printer, Loader2 } from 'lucide-react'
import Liste from './Liste'
import { chargerNotes, enregistrerNotes } from '../utils/cloud'
import { calculerPerformance, calculerNote } from '../utils/bareme'
import { ELEMENTS, DEGRES_AFL2_GT, ROLES_AFL3_GT, DEGRES_PRO_AFLP3, DEGRES_PRO_AFLP4, REPARTITIONS, pointsRepartition, pointsFixes, plageFil, valeurs } from '../utils/bacGrilles'
import { LIBELLE_NIVEAU } from '../utils/protocole'
import { kmM, chrono, dateCourte, nb, telechargerCSV } from '../utils/format'

// Notes d'une classe : performance proposée par le barème provisoire (à partir de la fiche
// retenue), élément 2 / AFLP 2 et fil de séquence saisis par degrés, total /20.

function Degres({ valeur, onChange, descriptions, points }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {[1, 2, 3, 4].map((d) => (
          <button key={d} type="button" title={descriptions?.[d - 1]} onClick={() => onChange(valeur === d ? null : d)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${valeur === d ? 'bg-nuit text-white dark:text-fond border-nuit' : 'border-bord bg-carte'}`}>
            D{d}{points ? ` · ${points(d)}` : ''}
          </button>
        ))}
      </div>
      {valeur && descriptions && <p className="text-[11px] text-doux mt-1 leading-snug">{descriptions[valeur - 1]}</p>}
    </div>
  )
}
function Valeur({ valeur, liste, onChange, vide = '—' }) {
  return (
    <select value={valeur ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className="mt-1.5 rounded-lg border border-bord px-2 py-1 text-xs">
      <option value="">{vide}</option>
      {liste.map((v) => <option key={v} value={v}>{nb(v)}</option>)}
    </select>
  )
}
function Bloc({ titre, note, sur, children }) {
  return (
    <div className="bg-creux rounded-xl p-3">
      <div className="flex justify-between items-baseline gap-2 mb-1.5">
        <p className="text-[11px] font-semibold">{titre}</p>
        <span className="text-xs font-bold whitespace-nowrap">{nb(note)} / {sur}</span>
      </div>
      {children}
    </div>
  )
}

function DetailPerf({ perf }) {
  if (!perf) return <p className="text-xs text-doux">Aucune fiche : pas de proposition.</p>
  const d = perf.details
  return (
    <div className="text-[11px] text-doux space-y-0.5">
      <p>Distance {kmM(d.distance)} → <b className="text-texte">D{d.dD}</b> (repères D2/D3/D4 : {d.seuils.join(' / ')} m)</p>
      <p>Accélérations réussies {d.pctAccel} % ({d.ratees} ratée{d.ratees > 1 ? 's' : ''} sur {d.zones} zones) → <b className="text-texte">D{d.dA}</b></p>
      <p>Arrêts / marche interdits : {d.arrets} → <b className="text-texte">D{d.dR}</b></p>
      <p>Degré moyen pondéré {nb(perf.degreMoyen)} → <b className="text-texte">{nb(perf.points)} / {perf.sur}</b>{perf.plafonne ? ` (plafonné à ${nb(perf.plafond)} pour ce niveau)` : ''}</p>
    </div>
  )
}

function Editeur({ typeBac, s, perf, fichesEleve, ficheId, onFiche, onMaj }) {
  const gt = typeBac === 'gt'
  const res = calculerNote(typeBac, s, perf)
  const [pa, pb] = pointsRepartition(s.repartition)
  const [el1, el2] = ELEMENTS[gt ? 'gt' : 'pro']
  return (
    <div className="space-y-2 pt-2">
      <Bloc titre={`${el1.titre} — proposée par le barème provisoire`} note={gt ? res.e1 : res.aflp1} sur={el1.sur}>
        {fichesEleve.length > 1 && (
          <label className="flex items-center gap-2 text-[11px] mb-1.5">Fiche retenue
            <select value={ficheId || ''} onChange={(e) => onFiche(e.target.value)} className="rounded-lg border border-bord px-2 py-1 text-xs">
              {fichesEleve.map((f) => <option key={f.id} value={f.id}>{dateCourte(f.date)} · {LIBELLE_NIVEAU[f.niveau]} · {kmM(f.distance)}</option>)}
            </select>
          </label>
        )}
        <DetailPerf perf={perf} />
        <label className="flex items-center gap-2 text-[11px] mt-1.5">Note corrigée à la main
          <Valeur valeur={s.perfManuelle} liste={valeurs([0, el1.sur], el1.pas)} vide="— automatique —" onChange={(v) => onMaj({ perfManuelle: v })} />
        </label>
        {perf && <p className="text-[11px] mt-1 leading-snug">Degré {perf.degre} : {el1.degres[perf.degre - 1]}</p>}
      </Bloc>

      <Bloc titre={el2.titre} note={gt ? res.e2 : res.aflp2} sur={el2.sur}>
        <Degres valeur={s[`${el2.cle}Degre`]} descriptions={el2.degres}
          points={(d) => (el2.fixe ? nb(el2.fixe[d - 1]) : el2.plages[d].map((x) => nb(x)).join('-'))}
          onChange={(d) => onMaj(el2.fixe ? { [`${el2.cle}Degre`]: d } : { [`${el2.cle}Degre`]: d, [`${el2.cle}Note`]: d ? el2.plages[d][1] : null })} />
        {!el2.fixe && s[`${el2.cle}Degre`] && <Valeur valeur={s[`${el2.cle}Note`]} liste={valeurs(el2.plages[s[`${el2.cle}Degre`]], el2.pas)} onChange={(v) => onMaj({ [`${el2.cle}Note`]: v })} />}
      </Bloc>

      <Bloc titre={`Fil de séquence — ${gt ? 'AFL 2 + AFL 3' : 'AFLP 3 + AFLP 4'}`} note={res.fil} sur={8}>
        <label className="flex items-center gap-2 text-[11px] mb-2">Répartition
          <select value={s.repartition || '4-4'} className="rounded-lg border border-bord px-2 py-1 text-xs"
            onChange={(e) => {
              const r = e.target.value
              const [na, nb2] = pointsRepartition(r)
              if (gt) onMaj({ repartition: r })
              else onMaj({ repartition: r, aflp3Note: s.aflp3Degre ? plageFil(na, s.aflp3Degre)[1] : s.aflp3Note ?? null, aflp4Note: s.aflp4Degre ? plageFil(nb2, s.aflp4Degre)[1] : s.aflp4Note ?? null })
            }}>
            {REPARTITIONS.map((r) => { const [a, b] = pointsRepartition(r); return <option key={r} value={r}>{gt ? `AFL 2 : ${a} — AFL 3 : ${b}` : `AFLP 3 : ${a} — AFLP 4 : ${b}`}</option> })}
          </select>
        </label>
        {gt ? (
          <div className="space-y-2">
            <div>
              <p className="text-[11px] mb-1">AFL 2 — Carnet d’entraînement, engagement · /{pa} · {nb(res.afl2)}</p>
              <Degres valeur={s.afl2Degre} descriptions={DEGRES_AFL2_GT} points={(d) => nb(pointsFixes(pa, d))} onChange={(d) => onMaj({ afl2Degre: d })} />
            </div>
            <div>
              <p className="text-[11px] mb-1">AFL 3 — Rôle choisi par l’élève · /{pb} · {nb(res.afl3)}</p>
              <div className="flex gap-1 mb-1.5">
                {ROLES_AFL3_GT.map((r) => (
                  <button key={r.id} type="button" onClick={() => onMaj({ afl3Role: s.afl3Role === r.id ? null : r.id })}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.afl3Role === r.id ? 'bg-feu text-white border-feu' : 'border-bord bg-carte'}`}>{r.libelle}</button>
                ))}
              </div>
              {s.afl3Role && <Degres valeur={s.afl3Degre} descriptions={ROLES_AFL3_GT.find((r) => r.id === s.afl3Role)?.degres} points={(d) => nb(pointsFixes(pb, d))} onChange={(d) => onMaj({ afl3Degre: d })} />}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {[
              { cle: 'aflp3', titre: 'AFLP 3 — Retour réflexif, réguler sa charge', pts: pa, desc: DEGRES_PRO_AFLP3 },
              { cle: 'aflp4', titre: 'AFLP 4 — Rôles : coach, observateur-collecteur', pts: pb, desc: DEGRES_PRO_AFLP4 }
            ].map(({ cle, titre, pts, desc }) => (
              <div key={cle}>
                <p className="text-[11px] mb-1">{titre} · /{pts} · {nb(s[`${cle}Note`])}</p>
                <Degres valeur={s[`${cle}Degre`]} descriptions={desc} points={(d) => plageFil(pts, d).map((x) => nb(x)).join('-')}
                  onChange={(d) => onMaj({ [`${cle}Degre`]: d, [`${cle}Note`]: d ? plageFil(pts, d)[1] : null })} />
                {s[`${cle}Degre`] && <Valeur valeur={s[`${cle}Note`]} liste={valeurs(plageFil(pts, s[`${cle}Degre`]), 0.1)} onChange={(v) => onMaj({ [`${cle}Note`]: v })} />}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-doux mt-1.5">Meilleur degré atteint au cours de la séquence.</p>
      </Bloc>
    </div>
  )
}

export default function NotesProf({ prof, roster, types, fiches, reglages, classe, setClasse }) {
  const [donnees, setDonnees] = useState(null)
  const [ouvert, setOuvert] = useState(null)
  const [etat, setEtat] = useState('')
  const premier = useRef(true)
  const classes = Object.keys(roster).sort((a, b) => a.localeCompare(b, 'fr'))
  const typeBac = types[classe]
  const eleves = classe ? roster[classe] || [] : []

  useEffect(() => {
    setDonnees(null)
    if (!classe) return
    let actif = true
    chargerNotes(prof, classe).then((d) => { if (actif) { premier.current = true; setDonnees(d) } })
    return () => { actif = false }
  }, [prof, classe])

  useEffect(() => {
    if (!donnees) return
    if (premier.current) { premier.current = false; return }
    setEtat('en-cours')
    const t = setTimeout(async () => setEtat((await enregistrerNotes(prof, classe, donnees)) ? 'ok' : 'erreur'), 600)
    return () => clearTimeout(t)
  }, [donnees, prof, classe])

  const majEleve = (cle, patch) => setDonnees((d) => ({ ...d, eleves: { ...d.eleves, [cle]: { ...(d.eleves[cle] || {}), ...patch } } }))
  const retenir = (cle, ficheId) => setDonnees((d) => ({ ...d, retenue: { ...d.retenue, [cle]: ficheId } }))

  // Ligne de calcul d'un élève : fiche retenue (choisie, sinon celle qui donne la meilleure performance)
  function calcul(e) {
    const fe = fiches.filter((f) => f.coureurId === e.id && f.classe === classe).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    const perfs = fe.map((f) => ({ f, p: calculerPerformance(f, typeBac, reglages, e.sexe) }))
    const choisie = perfs.find((x) => x.f.id === donnees?.retenue?.[e.id]) || [...perfs].sort((a, b) => (b.p?.points ?? -1) - (a.p?.points ?? -1))[0]
    const s = donnees?.eleves?.[e.id] || {}
    return { fe, fiche: choisie?.f || null, perf: choisie?.p || null, s, note: calculerNote(typeBac, s, choisie?.p || null) }
  }

  function exporter() {
    const gt = typeBac === 'gt'
    const ent = ['Nom', 'Prénom', 'Sexe', 'Niveau', 'Distance (m)', 'Accél. ratées', 'Arrêts interdits', ...(gt ? ['Élém. 1 /8', 'Élém. 2 /4', 'AFL 1 /12', 'AFL 2', 'AFL 3'] : ['AFLP 1 /7', 'AFLP 2 /5', 'Fin de séquence /12', 'AFLP 3', 'AFLP 4']), 'Fil /8', 'Total /20']
    const n = (x) => (x == null ? '' : String(x).replace('.', ','))
    telechargerCSV(`fartlek-notes-${classe}.csv`, ent, eleves.map((e) => {
      const c = calcul(e)
      const r = c.note
      return [e.nom, e.prenom, e.sexe, c.fiche ? LIBELLE_NIVEAU[c.fiche.niveau] : '', c.fiche?.distance ?? '', c.fiche?.accRatees ?? '', c.fiche?.arretsInterdits ?? '',
        ...(gt ? [r.e1, r.e2, r.fin, r.afl2, r.afl3] : [r.aflp1, r.aflp2, r.fin, r.aflp3, r.aflp4]).map(n), n(r.fil), n(r.total)]
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 pas-imprimer">
        <div className="w-48"><Liste etiquette="Classe" valeur={classe} onChange={setClasse} options={classes.map((c) => ({ valeur: c, libelle: c }))} /></div>
        {classe && typeBac && donnees && (
          <>
            <button onClick={exporter} className="btn-bord text-sm"><Download size={16} /> Export CSV</button>
            <button onClick={() => window.print()} className="btn-bord text-sm"><Printer size={16} /> Imprimer le récapitulatif</button>
          </>
        )}
        <span className="text-xs text-doux ml-auto">{etat === 'en-cours' ? 'Enregistrement…' : etat === 'ok' ? 'Enregistré' : etat === 'erreur' ? '⚠ Échec de l’enregistrement en ligne (gardé sur l’appareil)' : ''}</span>
      </div>
      {reglages.provisoire && classe && <p className="text-xs text-ambre pas-imprimer">Barème provisoire : à ajuster dans l’onglet Réglages. Chaque note proposée reste modifiable à la main.</p>}
      {!classe && <p className="text-sm text-doux">Choisis une classe.</p>}
      {classe && !typeBac && <p className="text-sm text-alerte">Choisis d’abord le type d’évaluation de la classe (Bac GT ou Bac Pro) dans l’onglet Classes.</p>}
      {classe && typeBac && !donnees && <p className="text-sm text-doux flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Chargement…</p>}

      {classe && typeBac && donnees && (
        <>
          <div className="carte divide-y divide-bord pas-imprimer">
            {eleves.map((e) => {
              const c = calcul(e)
              const ouv = ouvert === e.id
              return (
                <div key={e.id} className="p-3">
                  <button onClick={() => setOuvert(ouv ? null : e.id)} className="w-full flex items-center gap-2 text-left">
                    <span className="flex-1 min-w-0 text-sm truncate"><b>{e.nom}</b> {e.prenom}
                      <span className="text-xs text-doux"> · {c.fiche ? `${LIBELLE_NIVEAU[c.fiche.niveau]} · ${kmM(c.fiche.distance)}` : 'aucune fiche'}</span>
                    </span>
                    <span className="text-xs text-doux whitespace-nowrap">perf. {nb(typeBac === 'gt' ? c.note.e1 : c.note.aflp1)}</span>
                    <span className="font-display text-xl font-bold w-16 text-right">{nb(c.note.total)}<span className="text-xs text-doux">/20</span></span>
                    <ChevronDown size={16} className={`text-doux transition ${ouv ? 'rotate-180' : ''}`} />
                  </button>
                  {ouv && <Editeur typeBac={typeBac} s={c.s} perf={c.perf} fichesEleve={c.fe} ficheId={c.fiche?.id} onFiche={(id) => retenir(e.id, id)} onMaj={(p) => majEleve(e.id, p)} />}
                </div>
              )
            })}
          </div>
          <Recap classe={classe} typeBac={typeBac} eleves={eleves} calcul={calcul} reglages={reglages} />
        </>
      )}
    </div>
  )
}

// Récapitulatif imprimable (noir sur blanc, paysage, aucune ligne coupée)
function Recap({ classe, typeBac, eleves, calcul, reglages }) {
  const gt = typeBac === 'gt'
  return (
    <div className="imprimable hidden print:block">
      <p className="text-base font-bold mb-1">Fartlek évaluatif — {classe} — {gt ? 'Bac général et technologique' : 'Bac professionnel'}</p>
      <p className="text-xs mb-2">Niveaux : N1 {reglages.protocole.durees.N1} min, N2 {reglages.protocole.durees.N2} min, N3 {reglages.protocole.durees.N3} min · {reglages.provisoire ? 'barème de performance provisoire' : 'barème de performance'} · imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      <table>
        <thead>
          <tr>
            <th>Élève</th><th>Sexe</th><th>Niveau</th><th>Temps eff.</th><th>Distance</th><th>Accél. ratées</th><th>Arrêts</th><th>Pauses</th>
            {gt ? <><th>Élém. 1 /8</th><th>Élém. 2 /4</th><th>AFL 1 /12</th><th>AFL 2</th><th>AFL 3</th></> : <><th>AFLP 1 /7</th><th>AFLP 2 /5</th><th>/12</th><th>AFLP 3</th><th>AFLP 4</th></>}
            <th>Fil /8</th><th>Total /20</th>
          </tr>
        </thead>
        <tbody>
          {eleves.map((e) => {
            const c = calcul(e)
            const r = c.note
            const f = c.fiche
            return (
              <tr key={e.id}>
                <td>{e.nom} {e.prenom}</td><td>{e.sexe}</td>
                <td>{f ? LIBELLE_NIVEAU[f.niveau] : ''}</td><td>{f ? chrono(f.tempsEffectif) : ''}</td><td>{f ? `${f.distance} m` : ''}</td>
                <td>{f?.accRatees ?? ''}</td><td>{f?.arretsInterdits ?? ''}</td><td>{f?.pauses ?? ''}</td>
                {(gt ? [r.e1, r.e2, r.fin, r.afl2, r.afl3] : [r.aflp1, r.aflp2, r.fin, r.aflp3, r.aflp4]).map((v, i) => <td key={i}>{v == null ? '' : nb(v)}</td>)}
                <td>{r.fil == null ? '' : nb(r.fil)}</td><td><b>{r.total == null ? '' : nb(r.total)}</b></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
