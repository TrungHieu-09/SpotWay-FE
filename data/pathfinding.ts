export type GraphNode = { id: string; x: number; y: number };
export type GraphEdge = { from: string; to: string; weight: number };
export type Graph = { nodes: Record<string, GraphNode>; edges: GraphEdge[] };

export type PathResult = {
  nodeIds: string[];
  points: { x: number; y: number }[];
  /** Total length in graph units. */
  length: number;
};

/** Dijkstra shortest path over an undirected graph. Returns null when unreachable. */
export function findPath(graph: Graph, startId: string, endId: string): PathResult | null {
  if (!graph.nodes[startId] || !graph.nodes[endId]) return null;

  const adjacency: Record<string, { to: string; weight: number }[]> = {};
  for (const e of graph.edges) {
    (adjacency[e.from] ??= []).push({ to: e.to, weight: e.weight });
    (adjacency[e.to] ??= []).push({ to: e.from, weight: e.weight });
  }

  const dist: Record<string, number> = {};
  const prev: Record<string, string | undefined> = {};
  const visited = new Set<string>();
  for (const id of Object.keys(graph.nodes)) dist[id] = Infinity;
  dist[startId] = 0;

  while (true) {
    let current: string | null = null;
    let best = Infinity;
    for (const id in dist) {
      if (!visited.has(id) && dist[id] < best) {
        best = dist[id];
        current = id;
      }
    }
    if (current === null) return null;
    if (current === endId) break;
    visited.add(current);
    for (const { to, weight } of adjacency[current] ?? []) {
      const next = dist[current] + weight;
      if (next < dist[to]) {
        dist[to] = next;
        prev[to] = current;
      }
    }
  }

  const nodeIds: string[] = [];
  for (let id: string | undefined = endId; id !== undefined; id = prev[id]) nodeIds.unshift(id);
  return {
    nodeIds,
    points: nodeIds.map((id) => ({ x: graph.nodes[id].x, y: graph.nodes[id].y })),
    length: dist[endId],
  };
}
