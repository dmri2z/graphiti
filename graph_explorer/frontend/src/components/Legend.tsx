import { LEGEND_TYPES, TYPE_COLORS, colorForType } from '../colors';

interface Props {
  presentTypes: Set<string>;
  hiddenTypes: Set<string>;
  onToggle: (type: string) => void;
}

export default function Legend({ presentTypes, hiddenTypes, onToggle }: Props) {
  // Every type present in the loaded graph: curated palette order first, then
  // any remaining (dynamically discovered) types sorted alphabetically.
  const known = LEGEND_TYPES.filter((t) => presentTypes.has(t));
  const extra = [...presentTypes].filter((t) => !TYPE_COLORS[t]).sort();
  const types = [...known, ...extra];
  if (types.length === 0) return null;

  return (
    <div className="legend">
      <div className="legend-title">Entity types</div>
      {types.map((t) => {
        const hidden = hiddenTypes.has(t);
        return (
          <button
            key={t}
            className={`legend-item ${hidden ? 'hidden' : ''}`}
            onClick={() => onToggle(t)}
            title={hidden ? 'Show' : 'Hide'}
          >
            <span className="swatch" style={{ background: colorForType(t) }} />
            {t}
          </button>
        );
      })}
    </div>
  );
}
