// Icône de l'appli : piste de 400 m avec les deux zones d'accélération du fartlek.
export default function Icone({ taille = 96, className = '' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="flp-degrade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0F2E4C" />
          <stop offset="0.55" stopColor="#163F66" />
          <stop offset="1" stopColor="#E05614" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#flp-degrade)" />
      <rect x="86" y="150" width="340" height="212" rx="106" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="22" />
      <path d="M 192 150 L 256 150" stroke="#FFC24A" strokeWidth="44" strokeLinecap="round" />
      <path d="M 320 362 L 256 362" stroke="#FFC24A" strokeWidth="44" strokeLinecap="round" />
      <path d="M 150 238 L 150 274" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
      <circle cx="256" cy="256" r="34" fill="#ffffff" fillOpacity="0.95" />
      <path d="M 244 236 L 276 256 L 244 276 Z" fill="#E05614" />
    </svg>
  )
}
