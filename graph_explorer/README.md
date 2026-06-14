# Graphiti Graph Explorer

A standalone web app to **query and visualize** the Graphiti knowledge graph. Runs
independently of `mcp_server` — it only reads the same FalkorDB/Neo4j database.

- **Backend** (`backend/`): thin read-only FastAPI that reuses `graphiti_core` to serve
  `{nodes, edges}` as JSON. Browsers can't talk Redis/Bolt directly, so this is the bridge.
- **Frontend** (`frontend/`): React + Vite + `react-force-graph` force-directed display.
  - Nodes colored by entity type (Organization, ESGTopic, Regulation, …) + Episodic.
  - Search bar with **text** (instant, client-side) and **semantic** (server-side embeddings) modes.
  - Searching highlights matched nodes; their neighbours go grey, everything else fades.
  - Click/hover a node or edge → dialog with full details.
  - Legend chips toggle entity types on/off.

## Prerequisites

- The graph database the explorer reads from must be running and populated (e.g. the same
  FalkorDB your `mcp_server` writes to, group `default_db`).
- `uv` for the backend, `node`/`npm` for the frontend.

## Run

### 1. Backend (port 8001)

```bash
cd graph_explorer/backend
cp .env.example .env      # edit if your DB/keys differ
uv sync
uv run uvicorn app:app --port 8001 --reload
```

Quick checks:

```bash
curl localhost:8001/api/health
curl localhost:8001/api/groups
curl 'localhost:8001/api/graph?group_id=default_db&limit=500'
```

Semantic search needs `OPENAI_API_KEY` set in `.env`; without it the `/api/search`
endpoint returns 503 and the UI falls back to text search.

### 2. Frontend (port 5173)

```bash
cd graph_explorer/frontend
npm install
npm run dev
```

Open <http://localhost:5173>. If the backend runs somewhere else, set `VITE_API_BASE`
(e.g. `VITE_API_BASE=http://localhost:8001 npm run dev`).

## Config

Backend reads env vars (see `backend/.env.example`):

| var | default | meaning |
| --- | --- | --- |
| `GRAPH_DB_PROVIDER` | `falkordb` | `falkordb` or `neo4j` |
| `FALKORDB_URI` | `redis://localhost:6379` | FalkorDB connection |
| `FALKORDB_DATABASE` | `default_db` | FalkorDB graph name |
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | — | Neo4j connection |
| `GRAPHITI_GROUP_ID` | `default_db` | group shown first |
| `OPENAI_API_KEY` | — | enables semantic search |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allow-origin |
