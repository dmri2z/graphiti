import { useEffect, useMemo, useState } from 'react';
import GraphView from './components/GraphView';
import SearchBar from './components/SearchBar';
import Legend from './components/Legend';
import DetailDialog from './components/DetailDialog';
import {
  SemanticUnavailableError,
  fetchGraph,
  fetchGroups,
  semanticSearch,
} from './api';
import type { GraphData, GraphNode, SearchMode, Selected } from './types';

const EMPTY: GraphData = { nodes: [], edges: [] };

export default function App() {
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [data, setData] = useState<GraphData>(EMPTY);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('text');
  const [semanticIds, setSemanticIds] = useState<Set<string>>(new Set());
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
    setSemanticIds(new Set());
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

  // Compute matched node ids for the current query/mode.
  const matchedIds = useMemo(() => {
    if (mode === 'semantic') return semanticIds;
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    const matches = new Set<string>();
    for (const n of data.nodes) {
      const hay = `${n.name} ${n.summary ?? ''} ${n.labels.join(' ')} ${n.type}`.toLowerCase();
      if (hay.includes(q)) matches.add(n.id);
    }
    return matches;
  }, [mode, query, semanticIds, data.nodes]);

  const searchActive =
    (mode === 'text' && query.trim().length > 0) ||
    (mode === 'semantic' && semanticIds.size > 0);

  const matchCount = searchActive ? matchedIds.size : null;

  const runSemantic = async () => {
    const q = query.trim();
    if (!q || !selectedGroup) return;
    setSearching(true);
    setStatus('Searching…');
    try {
      const ids = await semanticSearch(selectedGroup, q);
      setSemanticIds(new Set(ids));
      setStatus(ids.length === 0 ? 'No semantic matches.' : '');
    } catch (e) {
      if (e instanceof SemanticUnavailableError) {
        setStatus('Semantic search unavailable (no API key) — switched to text mode.');
        setMode('text');
      } else {
        setStatus(`Search error: ${(e as Error).message}`);
      }
    } finally {
      setSearching(false);
    }
  };

  const onSubmit = () => {
    if (mode === 'semantic') runSemantic();
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
          if (mode === 'semantic') setSemanticIds(new Set());
        }}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          setSemanticIds(new Set());
        }}
        onSubmit={onSubmit}
        matchCount={matchCount}
        loading={searching}
      />

      <div className="canvas">
        <GraphView
          data={data}
          matchedIds={matchedIds}
          searchActive={searchActive}
          hiddenTypes={hiddenTypes}
          onSelect={setSelected}
          width={size.w}
          height={size.h}
        />
        <Legend presentTypes={presentTypes} hiddenTypes={hiddenTypes} onToggle={toggleType} />
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
