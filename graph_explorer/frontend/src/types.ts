export interface GraphNode {
  id: string;
  name: string;
  kind: 'entity' | 'episodic';
  labels: string[];
  type: string;
  summary?: string;
  group_id: string;
  created_at?: string;
  attributes?: Record<string, unknown>;
  // episodic-only
  source?: string | null;
  source_description?: string;
  content?: string;
  valid_at?: string | null;
  // injected by react-force-graph at runtime
  x?: number;
  y?: number;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  kind: 'RELATES_TO' | 'MENTIONS';
  name: string;
  fact?: string;
  group_id?: string;
  valid_at?: string | null;
  invalid_at?: string | null;
  expired_at?: string | null;
  created_at?: string;
  attributes?: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphLink[];
}

export type SearchMode = 'text' | 'hybrid' | 'facts';

export type Selected =
  | { kind: 'node'; data: GraphNode }
  | { kind: 'edge'; data: GraphLink }
  | null;
