// Menu déroulant avec étiquette (choix du professeur, de la classe, du nom…)
export default function Liste({ etiquette, valeur, onChange, options, vide = '— Choisir —', disabled }) {
  return (
    <label className="block">
      {etiquette && <span className="etiquette">{etiquette}</span>}
      <select value={valeur ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="champ text-base">
        <option value="">{vide}</option>
        {options.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
      </select>
    </label>
  )
}
