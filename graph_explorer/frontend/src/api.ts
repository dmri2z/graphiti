import type { GraphData, GraphLink } from './types';

// VITE_API_BASE is the full prefix for API calls (including /api).
// On Railway set VITE_API_BASE=/api; the preview server proxies /api/* to the
// backend over the private network (see vite.config.ts).
// Local dev: run.sh sets VITE_API_BASE=http://localhost:<port>/api.
// Unset → defaults to /api (same-origin relative, works with the proxy).
const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

export interface GroupsResponse {
  groups: string[];
  default: string;
}

export async function fetchGroups(): Promise<GroupsResponse> {
  const res = await fetch(`${API_BASE}/groups`);
  if (!res.ok) throw new Error(await errorText(res));
  return res.json();
}

export async function fetchGraph(groupId: string, limit = 1000): Promise<GraphData> {
  const url = `${API_BASE}/graph?group_id=${encodeURIComponent(groupId)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await errorText(res));
  return res.json();
}

export class SemanticUnavailableError extends Error {}

export async function hybridSearch(groupId: string, q: string): Promise<string[]> {
  const url = `${API_BASE}/search?group_id=${encodeURIComponent(groupId)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (res.status === 503) throw new SemanticUnavailableError(await errorText(res));
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  return data.node_ids as string[];
}

export async function searchFacts(groupId: string, q: string): Promise<GraphLink[]> {
  const url = `${API_BASE}/search-facts?group_id=${encodeURIComponent(groupId)}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (res.status === 503) throw new SemanticUnavailableError(await errorText(res));
  if (!res.ok) throw new Error(await errorText(res));
  const data = await res.json();
  return data.facts as GraphLink[];
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}
