"""Optional server-side semantic search over entity nodes via Graphiti hybrid search."""

from __future__ import annotations

import os

from graphiti_core import Graphiti
from graphiti_core.driver.driver import GraphDriver
from graphiti_core.search.search_config_recipes import NODE_HYBRID_SEARCH_RRF

from graph import _entity_edge_json


class SemanticSearchUnavailable(Exception):
    """Raised when no embedder is configured, so semantic search cannot run."""


def semantic_available() -> bool:
    return bool(os.environ.get('OPENAI_API_KEY'))


class SemanticSearcher:
    """Lazily wraps a Graphiti client (built around an existing driver) for node search."""

    def __init__(self, driver: GraphDriver):
        self._driver = driver
        self._client: Graphiti | None = None

    def _get_client(self) -> Graphiti:
        if not semantic_available():
            raise SemanticSearchUnavailable(
                'Set OPENAI_API_KEY to enable server-side semantic search.'
            )
        if self._client is None:
            from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig

            embedder = OpenAIEmbedder(
                config=OpenAIEmbedderConfig(
                    api_key=os.environ['OPENAI_API_KEY'],
                    embedding_model=os.environ.get('EMBEDDER_MODEL', 'text-embedding-3-small'),
                    # Must match the dimension the data was embedded at (mcp_server
                    # config.yaml embedder.dimensions / the ontology ingest), else
                    # FalkorDB raises "Vector dimension mismatch" at query time.
                    embedding_dim=int(os.environ.get('EMBEDDING_DIM', '1536')),
                )
            )
            self._client = Graphiti(graph_driver=self._driver, embedder=embedder)
        return self._client

    async def search_node_ids(self, query: str, group_id: str, max_nodes: int = 25) -> list[str]:
        client = self._get_client()
        results = await client.search_(
            query=query,
            config=NODE_HYBRID_SEARCH_RRF,
            group_ids=[group_id],
        )
        nodes = results.nodes[:max_nodes] if results.nodes else []
        return [n.uuid for n in nodes]

    async def search_fact_edges(
        self, query: str, group_id: str, max_facts: int = 25
    ) -> list[dict]:
        """Hybrid search over facts (entity edges). Returns edge JSON for the frontend.

        client.search() defaults to EDGE_HYBRID_SEARCH_RRF (BM25 + vector via RRF)
        and returns list[EntityEdge] — the same call the MCP search_memory_facts uses.
        """
        client = self._get_client()
        edges = await client.search(
            query=query,
            group_ids=[group_id],
            num_results=max_facts,
        )
        return [_entity_edge_json(e) for e in edges]
