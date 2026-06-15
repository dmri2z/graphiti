import { useEffect, useMemo, useState } from 'react';
import GraphView from './components/GraphView';
import SearchBar from './components/SearchBar';
import Legend from './components/Legend';
import DetailDialog from './components/DetailDialog';
import FactsPanel from './components/FactsPanel';
import {
  SemanticUnavailableError,
  fetchGraph,
  fetchGroups,
  hybridSearch,
  searchFacts,
} from './api';
import type { GraphData, GraphLink, GraphNode, SearchMode, Selected } from './types';

const EMPTY: GraphData = { nodes: [], edges: [] };

export default function App() {
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [data, setData] = useState<GraphData>(EMPTY);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('text');
  const [hybridIds, setHybridIds] = useState<Set<string>>(new Set());
  const [factEdges, setFactEdges] = useState<GraphLink[]>([]);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selected>(null);
  const [status, setStatus] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight - 52 });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight - 52 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load group list once.
  useEffect(() => {
    fetchGroups()
      .then((r) => {
        setGroups(r.groups);
        setSelectedGroup(r.default || r.groups[0] || '');
      })
      .catch((e) => setStatus(`Could not load groups: ${e.message}`));
  }, []);

  // Load graph whenever the group changes.
  useEffect(() => {
    if (!selectedGroup) return;
    setStatus('Loading graph…');
    setData(EMPTY);
    setHybridIds(new Set());
    setFactEdges([]);
    fetchGraph(selectedGroup)
      .then((g) => {
        setData(g);
        setStatus(g.nodes.length === 0 ? 'No nodes in this group.' : '');
      })
      .catch((e) => setStatus(`Could not load graph: ${e.message}`));
  }, [selectedGroup]);

  const nodeById = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n])),
    [data.nodes]
  );

  const presentTypes = useMemo(
    () => new Set(data.nodes.map((n) => n.type)),
    [data.nodes]
  );

  // Matched node ids — only for node-targeting modes (text/hybrid). Facts targets edges.
  const matchedIds = useMemo(() => {
    if (mode === 'facts') return new Set<string>();
    if (mode === 'hybrid') return hybridIds;
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    const matches = new Set<string>();
    for (const n of data.nodes) {
      const hay = `${n.name} ${n.summary ?? ''} ${n.labels.join(' ')} ${n.type}`.toLowerCase();
      if (hay.includes(q)) matches.add(n.id);
    }
    return matches;
  }, [mode, query, hybridIds, data.nodes]);

  const matchedEdgeIds = useMemo(
    () => new Set(factEdges.map((e) => e.id)),
    [factEdges]
  );

  const factSearchActive = mode === 'facts' && factEdges.length > 0;

  const searchActive =
    (mode === 'text' && query.trim().length > 0) ||
    (mode === 'hybrid' && hybridIds.size > 0) ||
    factSearchActive;

  const matchCount = !searchActive
    ? null
    : mode === 'facts'
      ? factEdges.length
      : matchedIds.size;

  const runHybrid = async () => {
    const q = query.trim();
    if (!q || !selectedGroup) return;
    setSearching(true);
    setStatus('Searching…');
    try {
      const ids = await hybridSearch(selectedGroup, q);
      setHybridIds(new Set(ids));
      setStatus(ids.length === 0 ? 'No matches.' : '');
    } catch (e) {
      if (e instanceof SemanticUnavailableError) {
        setStatus('Hybrid search unavailable (no API key) — switched to text mode.');
        setMode('text');
      } else {
        setStatus(`Search error: ${(e as Error).message}`);
      }
    } finally {
      setSearching(false);
    }
  };

  const runFacts = async () => {
    const q = query.trim();
    if (!q || !selectedGroup) return;
    setSearching(true);
    setStatus('Searching facts…');
    try {
      const edges = await searchFacts(selectedGroup, q);
      setFactEdges(edges);
      setStatus(edges.length === 0 ? 'No matching facts.' : '');
    } catch (e) {
      if (e instanceof SemanticUnavailableError) {
        setStatus('Facts search unavailable (no API key) — switched to text mode.');
        setMode('text');
      } else {
        setStatus(`Search error: ${(e as Error).message}`);
      }
    } finally {
      setSearching(false);
    }
  };

  const onSubmit = () => {
    if (mode === 'hybrid') runHybrid();
    else if (mode === 'facts') runFacts();
  };

  const toggleType = (t: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  return (
    <div className="app">
      <SearchBar
        groups={groups}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          // Stale server results once the query text diverges.
          setHybridIds(new Set());
          setFactEdges([]);
        }}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setHybridIds(new Set());
          setFactEdges([]);
        }}
        onSubmit={onSubmit}
        matchCount={matchCount}
        loading={searching}
      />

      <div className="canvas">
        <GraphView
          data={data}
          matchedIds={matchedIds}
          matchedEdgeIds={matchedEdgeIds}
          searchActive={searchActive}
          factSearchActive={factSearchActive}
          hiddenTypes={hiddenTypes}
          onSelect={setSelected}
          width={size.w}
          height={size.h}
        />
        <Legend presentTypes={presentTypes} hiddenTypes={hiddenTypes} onToggle={toggleType} />
        {mode === 'facts' && factEdges.length > 0 && (
          <FactsPanel
            facts={factEdges}
            nodeById={nodeById as Map<string, GraphNode>}
            onSelect={setSelected}
          />
        )}
        {status && <div className="status">{status}</div>}
      </div>

      <DetailDialog
        selected={selected}
        nodeById={nodeById as Map<string, GraphNode>}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
