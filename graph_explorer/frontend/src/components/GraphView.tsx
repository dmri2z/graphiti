import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import type { GraphData, GraphLink, GraphNode, Selected } from '../types';
import { colorForType } from '../colors';

interface Props {
  data: GraphData;
  matchedIds: Set<string>;
  matchedEdgeIds: Set<string>;
  searchActive: boolean;
  factSearchActive: boolean;
  hiddenTypes: Set<string>;
  onSelect: (sel: Selected) => void;
  width: number;
  height: number;
}

function endId(end: string | GraphNode): string {
  return typeof end === 'object' ? end.id : end;
}

export default function GraphView({
  data,
  matchedIds,
  matchedEdgeIds,
  searchActive,
  factSearchActive,
  hiddenTypes,
  onSelect,
  width,
  height,
}: Props) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>();
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [hoverLink, setHoverLink] = useState<string | null>(null);

  // Filter out hidden entity types (and the links that touch them).
  const graph = useMemo(() => {
    const nodes = data.nodes.filter((n) => !hiddenTypes.has(n.type));
    const visible = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter(
      (e) => visible.has(endId(e.source)) && visible.has(endId(e.target))
    );
    // react-force-graph mutates link source/target into node refs; clone to keep
    // the original payload reusable across re-renders.
    return { nodes, links: edges.map((e) => ({ ...e })) };
  }, [data, hiddenTypes]);

  // Nodes kept "greyish" (not faded) during search. For node search: one-hop
  // neighbours of matched nodes. For facts search: both endpoints of matched edges.
  const neighborIds = useMemo(() => {
    if (!searchActive) return new Set<string>();
    const set = new Set<string>();
    for (const l of graph.links) {
      const s = endId(l.source);
      const t = endId(l.target);
      if (factSearchActive && matchedEdgeIds.has(l.id)) {
        set.add(s);
        set.add(t);
      }
      if (matchedIds.has(s)) set.add(t);
      if (matchedIds.has(t)) set.add(s);
    }
    return set;
  }, [graph.links, matchedIds, matchedEdgeIds, searchActive, factSearchActive]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of graph.links) {
      const s = endId(l.source);
      const t = endId(l.target);
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    }
    return map;
  }, [graph.links]);

  useEffect(() => {
    const id = setTimeout(() => fgRef.current?.zoomToFit(400, 60), 300);
    return () => clearTimeout(id);
  }, [graph.nodes.length]);

  const nodeState = useCallback(
    (node: GraphNode): 'match' | 'neighbor' | 'faded' | 'normal' => {
      if (hoverNode) {
        if (node.id === hoverNode) return 'match';
        return adjacency.get(hoverNode)?.has(node.id) ? 'neighbor' : 'faded';
      }
      if (!searchActive) return 'normal';
      if (matchedIds.has(node.id)) return 'match';
      if (neighborIds.has(node.id)) return 'neighbor';
      return 'faded';
    },
    [hoverNode, adjacency, searchActive, matchedIds, neighborIds]
  );

  const drawNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const state = nodeState(node);
      const base = colorForType(node.type);
      const r = state === 'match' ? 6 : 4;
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      ctx.globalAlpha = state === 'faded' ? 0.12 : 1;

      if (state === 'match') {
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.45)'; // highlight ring
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = state === 'neighbor' ? '#cbd5e1' : base; // greyish neighbours
      ctx.fill();
      ctx.lineWidth = 0.5 / scale;
      ctx.strokeStyle = '#1e293b';
      ctx.stroke();

      const showLabel = state === 'match' || scale > 1.4;
      if (showLabel && node.name) {
        const fontSize = Math.max(10 / scale, 2);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = state === 'faded' ? '#94a3b8' : '#0f172a';
        ctx.fillText(node.name, x, y + r + 1);
      }
      ctx.globalAlpha = 1;
    },
    [nodeState]
  );

  const drawNodePointerArea = useCallback(
    (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, 7, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const s = endId(link.source);
      const t = endId(link.target);
      // Facts search: matched edges glow amber.
      if (factSearchActive && matchedEdgeIds.has(link.id)) return '#f59e0b';
      const hovered = link.id === hoverLink || (hoverNode && (s === hoverNode || t === hoverNode));
      if (hovered) return link.kind === 'MENTIONS' ? '#94a3b8' : '#475569';
      const active = searchActive || hoverNode;
      if (active) {
        const lit = matchedIds.has(s) || matchedIds.has(t) || s === hoverNode || t === hoverNode;
        if (!lit) return 'rgba(148, 163, 184, 0.06)';
      }
      return link.kind === 'MENTIONS' ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.5)';
    },
    [hoverLink, hoverNode, searchActive, matchedIds, factSearchActive, matchedEdgeIds]
  );

  return (
    <ForceGraph2D
      ref={fgRef}
      width={width}
      height={height}
      graphData={graph}
      backgroundColor="#f8fafc"
      nodeRelSize={4}
      nodeId="id"
      nodeLabel={(n: GraphNode) => `${n.name} (${n.type})`}
      nodeCanvasObject={drawNode}
      nodePointerAreaPaint={drawNodePointerArea}
      linkColor={linkColor}
      linkWidth={(l: GraphLink) =>
        factSearchActive && matchedEdgeIds.has(l.id) ? 2.5 : l.id === hoverLink ? 2 : 1
      }
      linkLineDash={(l: GraphLink) => (l.kind === 'MENTIONS' ? [3, 3] : null)}
      linkDirectionalArrowLength={(l: GraphLink) => (l.kind === 'RELATES_TO' ? 3 : 0)}
      linkDirectionalArrowRelPos={1}
      onNodeHover={(n) => setHoverNode((n as GraphNode | null)?.id ?? null)}
      onLinkHover={(l) => setHoverLink((l as GraphLink | null)?.id ?? null)}
      onNodeClick={(n) => onSelect({ kind: 'node', data: n as GraphNode })}
      onLinkClick={(l) => onSelect({ kind: 'edge', data: l as GraphLink })}
      cooldownTicks={120}
    />
  );
}
