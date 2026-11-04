import Modale from './Modale'
import { CHANGELOG } from '../changelog'

export default function Journal({ onFermer }) {
  return (
    <Modale titre="Journal des modifications" onFermer={onFermer}>
      <div className="space-y-5">
        {CHANGELOG.map((v) => (
          <div key={v.version}>
            <p className="font-display text-lg font-bold">v{v.version}</p>
            <p className="text-sm font-semibold mb-1.5">{v.titre}</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-doux">
              {v.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </Modale>
  )
}
