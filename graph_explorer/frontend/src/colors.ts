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

export function colorForType(type: string): string {
  return TYPE_COLORS[type] ?? FALLBACK_COLOR;
}

// Order shown in the legend.
export const LEGEND_TYPES = Object.keys(TYPE_COLORS);
