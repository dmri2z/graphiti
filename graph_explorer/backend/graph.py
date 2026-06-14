"""Build a visualization-friendly {nodes, edges} payload from the graph.

Reuses graphiti_core's *.get_by_group_ids helpers, which route through the
driver's graph_operations_interface — so the FalkorDB ``RelatesToNode_``
intermediate representation is already abstracted away.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from graphiti_core.driver.driver import GraphDriver
from graphiti_core.edges import EntityEdge, EpisodicEdge
from graphiti_core.errors import GroupsEdgesNotFoundError, GroupsNodesNotFoundError
from graphiti_core.nodes import EntityNode, EpisodicNode


async def _safe(coro, empty_errors):
    """Await a get_by_group_ids call, returning [] when the group simply has none."""
    try:
        return await coro
    except empty_errors:
        return []


def _iso(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _display_labels(labels: list[str]) -> list[str]:
    """Drop graphiti's system labels, keeping only meaningful entity types."""
    return [
        label
        for label in labels
        if label != 'Entity' and not label.startswith('Entity_')
    ]


def _entity_node_json(node: EntityNode) -> dict[str, Any]:
    types = _display_labels(node.labels)
    return {
        'id': node.uuid,
        'name': node.name,
        'kind': 'entity',
        'labels': types,
        'type': types[0] if types else 'Entity',
        'summary': node.summary,
        'group_id': node.group_id,
        'created_at': _iso(node.created_at),
        'attributes': node.attributes or {},
    }


def _episodic_node_json(node: EpisodicNode) -> dict[str, Any]:
    return {
        'id': node.uuid,
        'name': node.name,
        'kind': 'episodic',
        'labels': ['Episodic'],
        'type': 'Episodic',
        'source': node.source.value if node.source else None,
        'source_description': node.source_description,
        'content': node.content,
        'group_id': node.group_id,
        'valid_at': _iso(node.valid_at),
        'created_at': _iso(node.created_at),
    }


def _entity_edge_json(edge: EntityEdge) -> dict[str, Any]:
    return {
        'id': edge.uuid,
        'source': edge.source_node_uuid,
        'target': edge.target_node_uuid,
        'kind': 'RELATES_TO',
        'name': edge.name,
        'fact': edge.fact,
        'group_id': edge.group_id,
        'valid_at': _iso(edge.valid_at),
        'invalid_at': _iso(edge.invalid_at),
        'expired_at': _iso(edge.expired_at),
        'created_at': _iso(edge.created_at),
        'attributes': edge.attributes or {},
    }


def _episodic_edge_json(edge: EpisodicEdge) -> dict[str, Any]:
    return {
        'id': edge.uuid,
        'source': edge.source_node_uuid,
        'target': edge.target_node_uuid,
        'kind': 'MENTIONS',
        'name': 'MENTIONS',
        'group_id': edge.group_id,
        'created_at': _iso(edge.created_at),
    }


async def build_graph(
    driver: GraphDriver, group_id: str, limit: int = 1000
) -> dict[str, list[dict[str, Any]]]:
    """Return entity + episodic nodes and RELATES_TO + MENTIONS edges for a group."""
    entity_nodes = await _safe(
        EntityNode.get_by_group_ids(driver, [group_id], limit=limit), GroupsNodesNotFoundError
    )
    episodic_nodes = await _safe(
        EpisodicNode.get_by_group_ids(driver, [group_id], limit=limit), GroupsNodesNotFoundError
    )
    entity_edges = await _safe(
        EntityEdge.get_by_group_ids(driver, [group_id], limit=limit), GroupsEdgesNotFoundError
    )
    episodic_edges = await _safe(
        EpisodicEdge.get_by_group_ids(driver, [group_id], limit=limit), GroupsEdgesNotFoundError
    )

    nodes = [_entity_node_json(n) for n in entity_nodes]
    nodes += [_episodic_node_json(n) for n in episodic_nodes]

    node_ids = {n['id'] for n in nodes}
    edges: list[dict[str, Any]] = []
    # Only keep edges whose endpoints are both present, so the graph stays consistent.
    for edge in (_entity_edge_json(e) for e in entity_edges):
        if edge['source'] in node_ids and edge['target'] in node_ids:
            edges.append(edge)
    for edge in (_episodic_edge_json(e) for e in episodic_edges):
        if edge['source'] in node_ids and edge['target'] in node_ids:
            edges.append(edge)

    return {'nodes': nodes, 'edges': edges}


async def list_group_ids(driver: GraphDriver) -> list[str]:
    """Return distinct non-null group_ids present in the graph."""
    records, _, _ = await driver.execute_query(
        'MATCH (n) WHERE n.group_id IS NOT NULL '
        'RETURN DISTINCT n.group_id AS group_id ORDER BY group_id',
        routing_='r',
    )
    return [r['group_id'] for r in records if r.get('group_id')]
