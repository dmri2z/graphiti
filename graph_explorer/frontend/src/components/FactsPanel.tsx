import type { GraphLink, GraphNode, Selected } from '../types';

interface Props {
  facts: GraphLink[];
  nodeById: Map<string, GraphNode>;
  onSelect: (sel: Selected) => void;
}

function endId(end: string | GraphNode): string {
  return typeof end === 'object' ? end.id : end;
}

export default function FactsPanel({ facts, nodeById, onSelect }: Props) {
  if (facts.length === 0) return null;
  return (
    <div className="facts-panel">
      <div className="facts-title">
        {facts.length} fact{facts.length === 1 ? '' : 's'}
      </div>
      {facts.map((edge) => {
        const src = nodeById.get(endId(edge.source))?.name ?? '?';
        const tgt = nodeById.get(endId(edge.target))?.name ?? '?';
        return (
          <button
            key={edge.id}
            className="facts-item"
            onClick={() => onSelect({ kind: 'edge', data: edge })}
            title={edge.fact ?? edge.name}
          >
            <span className="facts-name">{edge.name}</span>
            <span className="facts-fact">{edge.fact ?? `${src} → ${tgt}`}</span>
            <span className="facts-ends">{src} → {tgt}</span>
          </button>
        );
      })}
    </div>
  );
}
