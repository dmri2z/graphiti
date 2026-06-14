"""Graph driver construction from environment, reusing graphiti_core drivers.

Independent of mcp_server: reads the same env vars but builds the driver directly.
"""

from __future__ import annotations

import os
from urllib.parse import urlparse

from graphiti_core.driver.driver import GraphDriver


def create_driver() -> GraphDriver:
    """Build a GraphDriver (FalkorDB or Neo4j) from environment variables."""
    provider = os.environ.get('GRAPH_DB_PROVIDER', 'falkordb').lower()

    if provider == 'falkordb':
        from graphiti_core.driver.falkordb_driver import FalkorDriver

        uri = os.environ.get('FALKORDB_URI', 'redis://localhost:6379')
        parsed = urlparse(uri)
        return FalkorDriver(
            host=parsed.hostname or 'localhost',
            port=parsed.port or 6379,
            username=parsed.username,
            password=os.environ.get('FALKORDB_PASSWORD') or parsed.password or None,
            database=os.environ.get('FALKORDB_DATABASE', 'default_db'),
        )

    if provider == 'neo4j':
        from graphiti_core.driver.neo4j_driver import Neo4jDriver

        return Neo4jDriver(
            uri=os.environ.get('NEO4J_URI', 'bolt://localhost:7687'),
            user=os.environ.get('NEO4J_USER', 'neo4j'),
            password=os.environ.get('NEO4J_PASSWORD'),
            database=os.environ.get('NEO4J_DATABASE', 'neo4j'),
        )

    raise ValueError(f'Unsupported GRAPH_DB_PROVIDER: {provider!r} (use falkordb or neo4j)')
