"""Ingest the curated ESG taxonomy from config/ontology.json into the FalkorDB
`default_db` (public) graph.

Creates one ESGTopic node per taxonomy entry (3 pillars -> categories -> leaf
topics), one HAS_SUBTOPIC relationship per parent->child link, and one semantic
relationship per entry in the ontology's `relationships` list (impacts, drives,
mitigates, driver_of, contributes_to).

Deterministic & idempotent: node/edge UUIDs are derived from the topic ids via
uuid5, so re-running MERGEs onto the same elements instead of duplicating. This
is a direct bulk load (EntityNode.save / EntityEdge.save) -- it deliberately does
NOT use Graphiti.add_triplet, which runs per-edge LLM dedup that we don't want
for a known curated taxonomy.

Run from the mcp_server directory:
    uv run python ingest_ontology.py
"""

import asyncio
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from uuid import NAMESPACE_URL, uuid5

from dotenv import load_dotenv
from graphiti_core.driver.falkordb_driver import FalkorDriver
from graphiti_core.edges import EntityEdge
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.nodes import EntityNode
from graphiti_core.utils.datetime_utils import utc_now

HERE = Path(__file__).parent
ONTOLOGY_PATH = HERE / 'config' / 'ontology.json'
GROUP_ID = 'default_db'
DATABASE = 'default_db'
EMBED_BATCH = 1000
# Must match the MCP server's embedder dimension (config.yaml embedder.dimensions),
# otherwise stored vectors won't match query embeddings and semantic search fails
# with "Vector dimension mismatch". text-embedding-3-small returns 1536 natively.
EMBED_DIM = int(os.environ.get('EMBEDDING_DIM', '1536'))


def topic_uuid(topic_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f'esgtopic:{topic_id}'))


def edge_uuid(parent_id: str, child_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f'has_subtopic:{parent_id}->{child_id}'))


def relation_edge_uuid(relation: str, src_id: str, tgt_id: str) -> str:
    return str(uuid5(NAMESPACE_URL, f'{relation}:{src_id}->{tgt_id}'))


def flatten(taxonomy: list[dict]) -> list[dict]:
    """Walk the nested taxonomy into a flat list of topic dicts.

    Each entry: id, name, description, pillar, level, parent_id.
    level: 0 = pillar (ENV/SOC/GOV), 1 = category, 2 = leaf topic.
    """
    topics: list[dict] = []

    def walk(node: dict, pillar: str, level: int, parent_id: str | None):
        topics.append(
            {
                'id': node['id'],
                'name': node['name'],
                'description': node.get('description', '') or '',
                'pillar': pillar,
                'level': level,
                'parent_id': parent_id,
            }
        )
        for child in node.get('children', []):
            walk(child, pillar, level + 1, node['id'])

    for pillar_node in taxonomy:
        walk(pillar_node, pillar_node['id'], 0, None)

    return topics


async def embed_in_batches(embedder: OpenAIEmbedder, texts: list[str]) -> list[list[float]]:
    out: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH):
        chunk = texts[i : i + EMBED_BATCH]
        out.extend(await embedder.create_batch(chunk))
    return out


async def main() -> None:
    load_dotenv(HERE / '.env')

    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        raise SystemExit('OPENAI_API_KEY not set (looked in env and mcp_server/.env)')

    uri = os.environ.get('FALKORDB_URI', 'redis://localhost:6379')
    parsed = urlparse(uri)
    host = parsed.hostname or 'localhost'
    port = parsed.port or 6379
    password = os.environ.get('FALKORDB_PASSWORD') or None

    ontology = json.loads(ONTOLOGY_PATH.read_text())
    taxonomy = ontology['taxonomy']
    relationships = ontology.get('relationships', [])
    topics = flatten(taxonomy)
    print(f'Loaded {len(topics)} topics, {len(relationships)} relationships from {ONTOLOGY_PATH.name}')

    embedder = OpenAIEmbedder(
        OpenAIEmbedderConfig(
            api_key=api_key,
            embedding_model=os.environ.get('EMBEDDER_MODEL', 'text-embedding-3-small'),
            embedding_dim=EMBED_DIM,
        )
    )
    print(f'Embedding dimension: {EMBED_DIM}')

    # Build nodes (deterministic uuid keyed on topic id).
    nodes: dict[str, EntityNode] = {}
    for t in topics:
        nodes[t['id']] = EntityNode(
            uuid=topic_uuid(t['id']),
            name=t['name'],
            group_id=GROUP_ID,
            labels=['ESGTopic'],
            summary=t['description'],
            attributes={
                'topic_id': t['id'],
                'esg_pillar': t['pillar'],
                'level': t['level'],
            },
        )

    # Resolve topic names to ids. Names are mostly unique; on collision keep the
    # lowest-level (most general) node, since relation endpoints are categories.
    name_to_id: dict[str, str] = {}
    for t in topics:
        existing = name_to_id.get(t['name'])
        if existing is None or t['level'] < nodes[existing].attributes['level']:
            name_to_id[t['name']] = t['id']

    # Build parent->child HAS_SUBTOPIC edges.
    now = utc_now()
    edges: list[EntityEdge] = []
    for t in topics:
        if t['parent_id'] is None:
            continue
        parent = nodes[t['parent_id']]
        child = nodes[t['id']]
        edges.append(
            EntityEdge(
                uuid=edge_uuid(t['parent_id'], t['id']),
                source_node_uuid=parent.uuid,
                target_node_uuid=child.uuid,
                name='HAS_SUBTOPIC',
                fact=f'{parent.name} has subtopic {child.name}',
                group_id=GROUP_ID,
                created_at=now,
            )
        )

    # Build cross-topic semantic edges (impacts, drives, mitigates, ...).
    subtopic_count = len(edges)
    for rel in relationships:
        src_id = name_to_id.get(rel['source'])
        tgt_id = name_to_id.get(rel['target'])
        if src_id is None or tgt_id is None:
            missing = rel['source'] if src_id is None else rel['target']
            print(f'  WARNING: skipping relation, unknown topic {missing!r}: {rel}')
            continue
        src = nodes[src_id]
        tgt = nodes[tgt_id]
        relation = rel['relation']
        edges.append(
            EntityEdge(
                uuid=relation_edge_uuid(relation, src_id, tgt_id),
                source_node_uuid=src.uuid,
                target_node_uuid=tgt.uuid,
                name=relation.upper(),
                fact=f'{src.name} {relation.replace("_", " ")} {tgt.name}',
                group_id=GROUP_ID,
                created_at=now,
                attributes={'relation': relation, 'basis': rel.get('basis', '')},
            )
        )
    relation_count = len(edges) - subtopic_count

    # Embeddings (batched).
    print(f'Embedding {len(nodes)} node names + {len(edges)} edge facts...')
    node_list = list(nodes.values())
    name_embeddings = await embed_in_batches(embedder, [n.name for n in node_list])
    for node, emb in zip(node_list, name_embeddings, strict=True):
        node.name_embedding = emb

    fact_embeddings = await embed_in_batches(embedder, [e.fact for e in edges])
    for edge, emb in zip(edges, fact_embeddings, strict=True):
        edge.fact_embedding = emb

    driver = FalkorDriver(host=host, port=port, password=password, database=DATABASE)
    try:
        print(f'Saving {len(node_list)} ESGTopic nodes to {DATABASE}...')
        for node in node_list:
            await node.save(driver)

        print(f'Saving {subtopic_count} HAS_SUBTOPIC + {relation_count} relation edges...')
        for edge in edges:
            await edge.save(driver)
    finally:
        await driver.close()

    print(
        f'Done. {len(node_list)} nodes, {subtopic_count} HAS_SUBTOPIC edges, '
        f'{relation_count} relation edges in graph "{DATABASE}".'
    )


if __name__ == '__main__':
    asyncio.run(main())
