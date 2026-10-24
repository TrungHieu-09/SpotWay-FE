import {
  CURRENT_LOCATION_NODE,
  doorNodeId,
  getGraph,
  getStores,
  METERS_PER_UNIT,
  type Floor,
  type Store,
} from './mock-floor';
import { findPath } from './pathfinding';

export type Point = { x: number; y: number };
export type StepKind = 'straight' | 'left' | 'right' | 'arrive';

export type RouteStep = {
  kind: StepKind;
  /** Length of the leg this step walks, in metres (0 for the arrival step). */
  meters: number;
  /** Nearby store used as a landmark in the instruction. */
  landmark: string | null;
  /** Arrival step only: which side the destination is on. */
  side: 'left' | 'right' | null;
};

export type StepRoute = {
  /** Corner points of the polyline, start first. */
  corners: Point[];
  /** One step per leg plus a final arrival step. */
  steps: RouteStep[];
};

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/** Drop repeated points and points that sit on a straight line between their neighbours. */
function simplify(points: Point[]): Point[] {
  const dedup = points.filter((p, i) => i === 0 || !same(p, points[i - 1]));
  return dedup.filter((p, i) => {
    if (i === 0 || i === dedup.length - 1) return true;
    const a = dedup[i - 1];
    const b = dedup[i + 1];
    return (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x) !== 0;
  });
}

const center = (s: Store): Point => ({ x: s.x + s.width / 2, y: s.y + s.height / 2 });

function nearestLandmark(at: Point, stores: Store[], destId: string): string | null {
  let best: { name: string; d: number } | null = null;
  for (const s of stores) {
    if (s.category === 'rest' || s.id === destId) continue;
    const c = center(s);
    const d = Math.hypot(c.x - at.x, c.y - at.y);
    if (d <= 90 && (!best || d < best.d)) best = { name: s.name, d };
  }
  return best?.name ?? null;
}

/**
 * Turn a polyline route into walking instructions. Screen coordinates are used (y grows
 * downwards), so a positive cross product means a right turn.
 */
export function buildSteps(
  points: Point[],
  stores: Store[],
  dest: Store,
  metersPerUnit: number,
): StepRoute {
  const corners = simplify(points);
  const steps: RouteStep[] = [];

  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i];
    const b = corners[i + 1];
    const meters = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) * metersPerUnit));

    let kind: StepKind = 'straight';
    if (i > 0) {
      const p = corners[i - 1];
      const cross = (a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x);
      kind = cross > 0 ? 'right' : 'left';
    }
    const ref = i === 0 ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
    steps.push({ kind, meters, landmark: nearestLandmark(ref, stores, dest.id), side: null });
  }

  // Which side of the final leg the destination sits on.
  let side: 'left' | 'right' | null = null;
  if (corners.length >= 2) {
    const a = corners[corners.length - 2];
    const b = corners[corners.length - 1];
    const c = center(dest);
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    side = cross > 0 ? 'right' : 'left';
  }
  steps.push({ kind: 'arrive', meters: 0, landmark: null, side });

  return { corners, steps };
}

// --- planning ---------------------------------------------------------------


export type PlannedRoute = {
  store: Store;
  stores: Store[];
  route: StepRoute;
};

/** Shortest walking route from the entrance to `destId` on `floor`, as turn-by-turn steps. */
export function planRoute(floor: Floor, destId: string): PlannedRoute | null {
  const stores = getStores(floor);
  const store = stores.find((s) => s.id === destId);
  if (!store) return null;
  const path = findPath(getGraph(floor), CURRENT_LOCATION_NODE, doorNodeId(store.id));
  if (!path) return null;
  const last = path.points[path.points.length - 1];
  const doorway = {
    x: Math.min(store.x + store.width, Math.max(store.x, last.x)),
    y: Math.min(store.y + store.height, Math.max(store.y, last.y)),
  };
  return { store, stores, route: buildSteps([...path.points, doorway], stores, store, METERS_PER_UNIT) };
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** One-line instruction used in lists, e.g. "Rẽ trái tại Juno". */
export function stepSummary(t: Translate, step: RouteStep, destName: string): string {
  const place = step.landmark ?? '';
  switch (step.kind) {
    case 'straight':
      return place ? t('nav.straightPast', { place }) : t('nav.straight');
    case 'left':
      return place ? t('nav.turnLeftAt', { place }) : t('nav.turnLeft');
    case 'right':
      return place ? t('nav.turnRightAt', { place }) : t('nav.turnRight');
    default:
      return step.side === 'left'
        ? t('nav.arriveLeft', { dest: destName })
        : step.side === 'right'
          ? t('nav.arriveRight', { dest: destName })
          : t('nav.arrive', { dest: destName });
  }
}

/** Headline for the big instruction card, e.g. "Rẽ trái 20m". */
export function stepHeadline(t: Translate, step: RouteStep): string {
  switch (step.kind) {
    case 'straight':
      return t('dir.mainStraight', { meters: step.meters });
    case 'left':
      return t('dir.mainLeft', { meters: step.meters });
    case 'right':
      return t('dir.mainRight', { meters: step.meters });
    default:
      return t('dir.arrived');
  }
}
