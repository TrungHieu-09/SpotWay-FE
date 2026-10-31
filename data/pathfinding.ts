import {
  blockedNodes,
  doorNodeId,
  FLOORS,
  getGraph,
  getStores,
  type Floor,
  type HazardZone,
  type Store,
  type StoreCategory,
} from './mock-floor';

export type GraphNode = { id: string; x: number; y: number };
export type GraphEdge = { from: string; to: string; weight: number };
export type Graph = { nodes: Record<string, GraphNode>; edges: GraphEdge[] };

export type PathResult = {
  nodeIds: string[];
  points: { x: number; y: number }[];
  /** Total length in graph units. */
  length: number;
};

/**
 * Dijkstra shortest path over an undirected graph. Returns null when unreachable. Nodes in
 * `blocked` are never entered (the start node is always allowed, so you can walk out of a hazard).
 */
export function findPath(
  graph: Graph,
  startId: string,
  endId: string,
  blocked?: ReadonlySet<string>,
): PathResult | null {
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
      if (next < dist[to] && !blocked?.has(to)) {
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

/** Extra cost (graph units, ~30m) for each floor crossed via a lift or escalator. */
export const FLOOR_CHANGE_COST = 300;

export type NearestResult = {
  storeId: string;
  floor: Floor;
  /** Total cost in graph units, including the penalty for every floor crossed. */
  cost: number;
};

export type NearestOptions = {
  /** Floor the user is standing on. */
  fromFloor: Floor;
  /** Step-free routing: only lifts connect floors, escalators are neither used nor returned. */
  accessible?: boolean;
  /** Simulated incident whose zone routes must avoid. */
  hazard?: HazardZone | null;
};

/**
 * Cheapest store of `category` (one or several) reachable from `fromNode` on `fromFloor`,
 * across all floors. Other floors cost the walk to a lift/escalator, FLOOR_CHANGE_COST per
 * floor crossed, then the walk from the same connector on the target floor to the store.
 */
export function findNearest(
  category: StoreCategory | StoreCategory[],
  fromNode: string,
  options: NearestOptions,
): NearestResult | null {
  const { fromFloor, accessible = false, hazard } = options;
  const wanted = new Set(Array.isArray(category) ? category : [category]);
  const connectorKinds: StoreCategory[] = accessible ? ['elevator'] : ['elevator', 'escalator'];
  const isConnector = (s: Store) => connectorKinds.includes(s.category);

  const fromGraph = getGraph(fromFloor);
  const toConnector: Record<string, number> = {};
  for (const s of getStores(fromFloor).filter(isConnector)) {
    const p = findPath(fromGraph, fromNode, doorNodeId(s.id), blockedNodes(hazard, fromFloor));
    if (p) toConnector[s.id] = p.length;
  }

  let best: NearestResult | null = null;
  for (const floor of FLOORS) {
    const graph = getGraph(floor);
    const stores = getStores(floor);
    for (const s of stores) {
      if (!wanted.has(s.category) || !s.corridor) continue;
      if (accessible && s.category === 'escalator') continue;
      const target = doorNodeId(s.id);

      let cost = Infinity;
      if (floor === fromFloor) {
        cost = findPath(graph, fromNode, target, blockedNodes(hazard, floor))?.length ?? Infinity;
      } else {
        const crossing = FLOOR_CHANGE_COST * Math.abs(FLOORS.indexOf(floor) - FLOORS.indexOf(fromFloor));
        for (const c of stores.filter(isConnector)) {
          if (toConnector[c.id] === undefined) continue;
          const rest = findPath(graph, doorNodeId(c.id), target, blockedNodes(hazard, floor))?.length;
          if (rest !== undefined) cost = Math.min(cost, toConnector[c.id] + crossing + rest);
        }
      }
      if (cost < (best?.cost ?? Infinity)) best = { storeId: s.id, floor, cost };
    }
  }
  return best;
}
