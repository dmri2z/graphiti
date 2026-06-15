// Fixed color per ESG ontology entity type (plus Episodic). Matches the entity
// types declared in mcp_server/config/config.yaml.
export const TYPE_COLORS: Record<string, string> = {
  Organization: '#2563eb', // blue
  ESGTopic: '#16a34a', // green
  Regulation: '#dc2626', // red
  Framework: '#9333ea', // purple
  Risk: '#ea580c', // orange
  Commitment: '#0d9488', // teal
  Metric: '#ca8a04', // amber
  Policy: '#4f46e5', // indigo
  Stakeholder: '#db2777', // pink
  Document: '#0891b2', // cyan
  Event: '#65a30d', // lime
  Person: '#7c3aed', // violet
  Episodic: '#64748b', // slate
};

export const FALLBACK_COLOR = '#94a3b8';

// Deterministic color for entity types not in the curated palette, so each new
// type (e.g. Publication) gets a stable, distinct swatch across reloads instead
// of all sharing one gray. Hue derived from a string hash; fixed S/L keep the
// swatches legible alongside the curated colors.
function generatedColor(type: string): string {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = (hash * 31 + type.charCodeAt(i)) | 0;
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

export function colorForType(type: string): string {
  if (!type) return FALLBACK_COLOR;
  return TYPE_COLORS[type] ?? generatedColor(type);
}

// Curated palette order — known types lead the legend in this order.
export const LEGEND_TYPES = Object.keys(TYPE_COLORS);
