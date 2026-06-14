import { LEGEND_TYPES, colorForType } from '../colors';

interface Props {
  presentTypes: Set<string>;
  hiddenTypes: Set<string>;
  onToggle: (type: string) => void;
}

export default function Legend({ presentTypes, hiddenTypes, onToggle }: Props) {
  const types = LEGEND_TYPES.filter((t) => presentTypes.has(t));
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
