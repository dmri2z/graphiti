"""Standalone read-only API serving the Graphiti knowledge graph for visualization.

Runs independently of mcp_server. Reuses graphiti_core drivers and node/edge
helpers; never writes to the graph.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

# graphiti_core.helpers does int(os.getenv('SEMAPHORE_LIMIT', 20)) at import time and
# calls load_dotenv() itself, so the repo's .env (which sets SEMAPHORE_LIMIT= empty)
# would crash the import. Set a valid value; load_dotenv(override=False) then leaves it.
if not (os.environ.get('SEMAPHORE_LIMIT') or '').strip().isdigit():
    os.environ['SEMAPHORE_LIMIT'] = '20'

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from db import create_driver  # noqa: E402
from graph import build_graph, list_group_ids  # noqa: E402
from search import SemanticSearcher, SemanticSearchUnavailable, semantic_available  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    driver = create_driver()
    app.state.driver = driver
    app.state.searcher = SemanticSearcher(driver)
    try:
        yield
    finally:
        close = getattr(driver, 'close', None)
        if close is not None:
            result = close()
            if hasattr(result, '__await__'):
                await result


app = FastAPI(title='Graphiti Graph Explorer', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get('FRONTEND_ORIGIN', 'http://localhost:5173')],
    allow_methods=['GET'],
    allow_headers=['*'],
)


@app.get('/api/health')
async def health():
    return {'status': 'ok', 'semantic_search': semantic_available()}


@app.get('/api/groups')
async def groups():
    default = os.environ.get('GRAPHITI_GROUP_ID', 'default_db')
    try:
        ids = await list_group_ids(app.state.driver)
    except Exception as exc:  # surface DB connection issues clearly
        raise HTTPException(status_code=503, detail=f'Database error: {exc}') from exc
    if default and default not in ids:
        ids = [default, *ids]
    return {'groups': ids, 'default': default}


@app.get('/api/graph')
async def graph(
    group_id: str = Query(...),
    limit: int = Query(1000, ge=1, le=10000),
):
    try:
        return await build_graph(app.state.driver, group_id, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f'Database error: {exc}') from exc


@app.get('/api/search')
async def search(
    group_id: str = Query(...),
    q: str = Query(..., min_length=1),
    max_nodes: int = Query(25, ge=1, le=200),
):
    try:
        node_ids = await app.state.searcher.search_node_ids(q, group_id, max_nodes=max_nodes)
    except SemanticSearchUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Search error: {exc}') from exc
    return {'node_ids': node_ids}


@app.get('/api/search-facts')
async def search_facts(
    group_id: str = Query(...),
    q: str = Query(..., min_length=1),
    max_facts: int = Query(25, ge=1, le=200),
):
    try:
        facts = await app.state.searcher.search_fact_edges(q, group_id, max_facts=max_facts)
    except SemanticSearchUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Search error: {exc}') from exc
    return {'facts': facts}
