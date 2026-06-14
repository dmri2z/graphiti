import type { GraphLink, GraphNode, Selected } from '../types';
import { colorForType } from '../colors';

interface Props {
  selected: Selected;
  nodeById: Map<string, GraphNode>;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="row">
      <div className="row-label">{label}</div>
      <div className="row-value">{String(value)}</div>
    </div>
  );
}

function Attributes({ attrs }: { attrs?: Record<string, unknown> }) {
  const entries = Object.entries(attrs ?? {}).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;
  return (
    <>
      <div className="section-title">Attributes</div>
      {entries.map(([k, v]) => (
        <Row key={k} label={k} value={typeof v === 'object' ? JSON.stringify(v) : v} />
      ))}
    </>
  );
}

function endId(end: string | GraphNode): string {
  return typeof end === 'object' ? end.id : end;
}

export default function DetailDialog({ selected, nodeById, onClose }: Props) {
  if (!selected) return null;

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>
          ×
        </button>
        {selected.kind === 'node'
          ? renderNode(selected.data)
          : renderEdge(selected.data, nodeById)}
      </div>
    </div>
  );
}

function renderNode(node: GraphNode) {
  return (
    <>
      <div className="dialog-header">
        <span className="badge" style={{ background: colorForType(node.type) }}>
          {node.type}
        </span>
        <h2>{node.name}</h2>
      </div>
      {node.kind === 'entity' ? (
        <>
          <Row label="Summary" value={node.summary} />
          {node.labels.length > 1 && <Row label="Labels" value={node.labels.join(', ')} />}
          <Row label="Group" value={node.group_id} />
          <Row label="Created" value={node.created_at} />
          <Row label="UUID" value={node.id} />
          <Attributes attrs={node.attributes} />
        </>
      ) : (
        <>
          <Row label="Source" value={node.source} />
          <Row label="Description" value={node.source_description} />
          <Row label="Valid at" value={node.valid_at} />
          <Row label="Created" value={node.created_at} />
          <Row label="Group" value={node.group_id} />
          <Row label="UUID" value={node.id} />
          {node.content && (
            <>
              <div className="section-title">Content</div>
              <pre className="content">{node.content}</pre>
            </>
          )}
        </>
      )}
    </>
  );
}

function renderEdge(edge: GraphLink, nodeById: Map<string, GraphNode>) {
  const src = nodeById.get(endId(edge.source));
  const tgt = nodeById.get(endId(edge.target));
  return (
    <>
      <div className="dialog-header">
        <span className="badge edge-badge">{edge.kind}</span>
        <h2>{edge.name}</h2>
      </div>
      <Row label="Relationship" value={`${src?.name ?? '?'} → ${tgt?.name ?? '?'}`} />
      <Row label="Fact" value={edge.fact} />
      <Row label="Valid at" value={edge.valid_at} />
      <Row label="Invalid at" value={edge.invalid_at} />
      <Row label="Expired at" value={edge.expired_at} />
      <Row label="Created" value={edge.created_at} />
      <Row label="UUID" value={edge.id} />
      <Attributes attrs={edge.attributes} />
    </>
  );
}
