import type { GraphData } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8001';

export interface GroupsResponse {
  groups: string[];
  default: string;
}

export async function fetchGroups(): Promise<GroupsResponse> {
  const res = await fetch(`${API_BASE}/api/groups`);
  if (!res.ok) throw new Error(await errorText(res));
  return res.json();
}

export async function fetchGraph(groupId: string, limit = 1000): Promise<GraphData> {
  const url = `${API_BASE}/api/graph?group_id=${encodeURIComponent(groupId)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await errorText(res));
  return res.json();
}

export class SemanticUnavailableError extends Error {}

export async function semanticSearch(groupId: string, q: string): Promise<string[]> {
  const url = `${API_BASE}/api/search?group_id=${encodeURIComponent(groupId)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (res.status === 503) throw new SemanticUnavailableError(await errorText(res));
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  return data.node_ids as string[];
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}
