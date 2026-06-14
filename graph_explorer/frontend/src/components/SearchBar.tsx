import type { SearchMode } from '../types';

interface Props {
  groups: string[];
  selectedGroup: string;
  onGroupChange: (g: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  mode: SearchMode;
  onModeChange: (m: SearchMode) => void;
  onSubmit: () => void;
  matchCount: number | null;
  loading: boolean;
}

export default function SearchBar({
  groups,
  selectedGroup,
  onGroupChange,
  query,
  onQueryChange,
  mode,
  onModeChange,
  onSubmit,
  matchCount,
  loading,
}: Props) {
  return (
    <div className="searchbar">
      <span className="brand">Graphiti Explorer</span>

      <select value={selectedGroup} onChange={(e) => onGroupChange(e.target.value)}>
        {groups.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Search nodes…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
      />

      <div className="mode-toggle">
        <button
          className={mode === 'text' ? 'active' : ''}
          onClick={() => onModeChange('text')}
          title="Instant substring match in the browser"
        >
          Text
        </button>
        <button
          className={mode === 'semantic' ? 'active' : ''}
          onClick={() => onModeChange('semantic')}
          title="Embeddings + keyword search on the server"
        >
          Semantic
        </button>
      </div>

      {mode === 'semantic' && (
        <button className="go" onClick={onSubmit} disabled={loading}>
          {loading ? '…' : 'Search'}
        </button>
      )}

      {matchCount !== null && <span className="count">{matchCount} match{matchCount === 1 ? '' : 'es'}</span>}
    </div>
  );
}
