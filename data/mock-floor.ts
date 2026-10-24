import type { Graph, GraphEdge, GraphNode } from './pathfinding';

export const MOCK_BUILDING = { code: 'SPW', name: 'SpotWay Plaza' };

/** SVG coordinate space of the floor plan. */
export const FLOOR_VIEWBOX = { x: 0, y: 0, width: 400, height: 600 };
/** Graph units -> metres (used for distance / walking time). */
export const METERS_PER_UNIT = 0.1;
export const WALK_SPEED_MPS = 1.2;

export type StoreCategory =
  | 'fashion'
  | 'coffee'
  | 'books'
  | 'food'
  | 'wc_male'
  | 'wc_female'
  | 'elevator'
  | 'escalator'
  | 'atm'
  | 'electronics'
  | 'beauty'
  | 'supermarket'
  | 'pharmacy'
  | 'rest';

export type CorridorId = 'top' | 'left' | 'right' | 'bottom' | 'mid1' | 'mid2';

export type Store = {
  id: string;
  name: string;
  category: StoreCategory;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corridor the entrance opens onto. Rest areas have none and are not selectable. */
  corridor?: CorridorId;
};

const DESCRIPTIONS: Record<StoreCategory, string> = {
  fashion: 'Quần áo, giày dép và phụ kiện thời trang.',
  coffee: 'Cà phê, trà và đồ uống pha chế.',
  books: 'Sách, văn phòng phẩm và không gian đọc.',
  food: 'Món ăn Việt phục vụ tại chỗ và mang đi.',
  wc_male: 'Nhà vệ sinh nam.',
  wc_female: 'Nhà vệ sinh nữ.',
  elevator: 'Thang máy, phù hợp cho xe đẩy và xe lăn.',
  escalator: 'Thang cuốn lên xuống giữa các tầng.',
  atm: 'Máy rút tiền tự động, hoạt động 24/7.',
  electronics: 'Điện thoại, laptop, thiết bị điện tử và phụ kiện.',
  beauty: 'Mỹ phẩm, làm đẹp và chăm sóc cá nhân.',
  supermarket: 'Siêu thị tạp hoá và hàng tiêu dùng hằng ngày.',
  pharmacy: 'Nhà thuốc và sản phẩm chăm sóc sức khoẻ.',
  rest: 'Khu vực nghỉ chân với ghế ngồi.',
};

export const FLOORS = ['B1', '1', '2', '3', '4', '5', '6'] as const;
export type Floor = (typeof FLOORS)[number];

type Slot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  corridor?: CorridorId;
};

/**
 * Per-floor arrangement. Corridors, restrooms, lifts and escalator stay in the building
 * core; what changes is how the tenant blocks are cut up around them.
 */
type FloorLayout = {
  /** widths of shops left of the restrooms (x 20..192) */
  topLeft: number[];
  /** heights of the left/right column shops above the core corridor (y 120..320) */
  leftUpper: number[];
  rightUpper: number[];
  /** heights below the core corridor (y 370..470) */
  leftLower: number[];
  rightLower: number[];
  /** widths of the island shops above the lifts (x 124..276) */
  island: number[];
  /** lower island: 'rest' = big rest area, 'cells' = 3 shops + small rest, 'split' = rest + 1 shop */
  lower: 'rest' | 'cells' | 'split';
  /** widths of the bottom row shops (x 20..256) */
  bottom: number[];
};

const LAYOUTS: Record<Floor, FloorLayout> = {
  B1: {
    topLeft: [172],
    leftUpper: [100, 50, 50],
    rightUpper: [50, 50, 50, 50],
    leftLower: [100],
    rightLower: [50, 50],
    island: [152],
    lower: 'cells',
    bottom: [116, 116],
  },
  '1': {
    topLeft: [84, 84],
    leftUpper: [50, 50, 50, 50],
    rightUpper: [50, 50, 50, 50],
    leftLower: [50, 50],
    rightLower: [50, 50],
    island: [48, 48, 48],
    lower: 'rest',
    bottom: [56, 56, 56],
  },
  '2': {
    topLeft: [54, 54, 54],
    leftUpper: [66, 67, 67],
    rightUpper: [100, 50, 50],
    leftLower: [50, 50],
    rightLower: [100],
    island: [74, 74],
    lower: 'split',
    bottom: [76, 76, 76],
  },
  '3': {
    topLeft: [84, 84],
    leftUpper: [50, 50, 50, 50],
    rightUpper: [66, 67, 67],
    leftLower: [100],
    rightLower: [50, 50],
    island: [48, 48, 48],
    lower: 'cells',
    bottom: [56, 56, 56],
  },
  '4': {
    topLeft: [172],
    leftUpper: [66, 67, 67],
    rightUpper: [50, 50, 50, 50],
    leftLower: [50, 50],
    rightLower: [100],
    island: [74, 74],
    lower: 'split',
    bottom: [116, 116],
  },
  '5': {
    topLeft: [54, 54, 54],
    leftUpper: [100, 50, 50],
    rightUpper: [100, 50, 50],
    leftLower: [50, 50],
    rightLower: [50, 50],
    island: [152],
    lower: 'rest',
    bottom: [76, 76, 76],
  },
  '6': {
    topLeft: [84, 84],
    leftUpper: [50, 50, 50, 50],
    rightUpper: [50, 50, 50, 50],
    leftLower: [50, 50],
    rightLower: [100],
    island: [74, 74],
    lower: 'cells',
    bottom: [116, 116],
  },
};

const GAP = 4;

/** Free (tenant) slots of a floor, in a stable order. */
function freeSlots(layout: FloorLayout): Slot[] {
  const slots: Slot[] = [];
  const row = (prefix: string, widths: number[], x0: number, y: number, h: number, c: CorridorId) => {
    let x = x0;
    widths.forEach((w, i) => {
      slots.push({ id: `${prefix}${i + 1}`, x, y, width: w, height: h, corridor: c });
      x += w + GAP;
    });
  };
  const column = (prefix: string, heights: number[], x: number, y0: number, c: CorridorId) => {
    let y = y0;
    heights.forEach((h, i) => {
      slots.push({ id: `${prefix}${i + 1}`, x, y, width: 56, height: h, corridor: c });
      y += h;
    });
  };
  row('tl', layout.topLeft, 20, 20, 50, 'top');
  column('lu', layout.leftUpper, 20, 120, 'left');
  column('ll', layout.leftLower, 20, 370, 'left');
  column('ru', layout.rightUpper, 324, 120, 'right');
  column('rl', layout.rightLower, 324, 370, 'right');
  row('is', layout.island, 124, 120, 50, 'top');
  if (layout.lower === 'cells') row('lc', [48, 48, 48], 124, 370, 50, 'mid2');
  if (layout.lower === 'split') row('lc', [52], 224, 370, 100, 'mid2');
  row('bt', layout.bottom, 20, 520, 50, 'bottom');
  return slots;
}

const CORE_SLOTS: Slot[] = [
  { id: 'wc_m', x: 208, y: 20, width: 84, height: 50, corridor: 'top' },
  { id: 'wc_f', x: 296, y: 20, width: 84, height: 50, corridor: 'top' },
  { id: 'lift1', x: 124, y: 197, width: 48, height: 50, corridor: 'mid1' },
  { id: 'lift2', x: 176, y: 197, width: 48, height: 50, corridor: 'mid1' },
];

const REST_AREAS: Record<FloorLayout['lower'], { x: number; y: number; width: number; height: number }> = {
  rest: { x: 124, y: 370, width: 152, height: 100 },
  cells: { x: 124, y: 430, width: 152, height: 40 },
  split: { x: 124, y: 370, width: 96, height: 100 },
};

type Tenant = [name: string, category: StoreCategory, description?: string];

// Same on every floor: restrooms, lifts and escalator stay stacked in the building core.
const CORE: Record<string, Tenant> = {
  wc_m: ['WC Nam', 'wc_male'],
  wc_f: ['WC Nữ', 'wc_female'],
  lift1: ['Thang máy', 'elevator'],
  lift2: ['Thang cuốn', 'escalator'],
};

const TENANTS: Record<Floor, Tenant[]> = {
  '1': [
    ['Cà phê Góc Phố', 'coffee', 'Quán cà phê rang xay, có không gian làm việc yên tĩnh.'],
    ['Nhà sách Hoa Sen', 'books', 'Nhà sách tổng hợp, sách thiếu nhi và văn phòng phẩm.'],
    ['Canifa', 'fashion'],
    ['Trung Nguyên Legend', 'coffee'],
    ['Fahasa', 'books'],
    ['ATM Agribank', 'atm'],
    ['Owen', 'fashion'],
    ['Biti’s', 'fashion'],
    ['Highlands Coffee', 'coffee'],
    ['Yame', 'fashion'],
    ['Nhà sách Phương Nam', 'books'],
    ['Juno', 'fashion'],
    ['The Coffee House', 'coffee'],
    ['Aristino', 'fashion'],
    ['Katinat', 'coffee'],
    ['Vascara', 'fashion'],
    ['Cộng Cà Phê', 'coffee'],
    ['Ninomaxx', 'fashion'],
    ['Pantio', 'fashion'],
    ['Phúc Long', 'coffee'],
  ],
  '2': [
    ['Elise', 'fashion'],
    ['Blue Exchange', 'fashion'],
    ['IVY moda', 'fashion'],
    ['Gumac', 'fashion'],
    ['Mattana', 'fashion'],
    ['ATM Techcombank', 'atm'],
    ['Sixdo', 'fashion'],
    ['Hnoss', 'fashion'],
    ['Bé Yêu Kids', 'fashion'],
    ['Giày Thượng Đình', 'fashion'],
    ['Túi xách Mixx', 'fashion'],
    ['Mắt kính Sài Gòn', 'fashion'],
    ['Đồng hồ Đăng Quang', 'fashion'],
    ['Trang sức PNJ', 'fashion'],
    ['Trang sức SJC', 'fashion'],
    ['Gấm Boutique', 'fashion'],
    ['Lụa Hà Đông', 'fashion'],
    ['The Coffee House', 'coffee'],
    ['Cộng Cà Phê', 'coffee'],
    ['ABC Bakery', 'food'],
  ],
  '3': [
    ['Thế Giới Di Động', 'electronics'],
    ['FPT Shop', 'electronics'],
    ['Điện máy Xanh', 'electronics'],
    ['CellphoneS', 'electronics'],
    ['Phụ kiện Điện thoại', 'electronics'],
    ['ATM MB Bank', 'atm'],
    ['Phong Vũ', 'electronics'],
    ['Gia dụng Sunhouse', 'electronics'],
    ['Camera An Ninh', 'electronics'],
    ['Loa & Tai nghe', 'electronics'],
    ['Đồng hồ thông minh', 'electronics'],
    ['Thiết bị Game', 'electronics'],
    ['Fahasa', 'books'],
    ['Sách Kim Đồng', 'books'],
    ['Nhà xuất bản Trẻ', 'books'],
    ['Văn phòng phẩm Hồng Hà', 'books'],
    ['Trung Nguyên Legend', 'coffee'],
    ['Katinat', 'coffee'],
    ['Cà phê Sách', 'coffee'],
    ['Nhà thuốc An Khang', 'pharmacy'],
  ],
  '4': [
    ['Phở 24', 'food'],
    ['Quán Ngon', 'food'],
    ['Nhà hàng Sen Tây Hồ', 'food'],
    ['Pizza 4P’s', 'food'],
    ['Gogi House', 'food'],
    ['ATM Sacombank', 'atm'],
    ['Cơm niêu Sài Gòn', 'food'],
    ['Sushi Hokkaido Sachi', 'food'],
    ['Bún chả Hương Liên', 'food'],
    ['Bánh xèo 46A', 'food'],
    ['Hủ tiếu Nam Vang', 'food'],
    ['Bún bò Huế O Xuân', 'food'],
    ['Lẩu Dê Núi', 'food'],
    ['Chè Bà Ba', 'food'],
    ['Trà sữa Tocotoco', 'coffee'],
    ['Kem Tràng Tiền', 'food'],
    ['Highlands Coffee', 'coffee'],
    ['Bánh mì Hội An', 'food'],
    ['Cà phê Muối', 'coffee'],
    ['Nhà thuốc Long Châu', 'pharmacy'],
  ],
  '5': [
    ['Trung Nguyên E-Coffee', 'coffee'],
    ['Cộng Cà Phê', 'coffee'],
    ['Phúc Long', 'coffee'],
    ['The Coffee House', 'coffee'],
    ['Katinat', 'coffee'],
    ['ATM Vietinbank', 'atm'],
    ['Highlands Coffee', 'coffee'],
    ['Cà phê Muối Hà Nội', 'coffee'],
    ['Spa Thảo Mộc', 'beauty'],
    ['Hasaki', 'beauty'],
    ['Cocoon', 'beauty'],
    ['Thái Spa', 'beauty'],
    ['Tiệm tóc Nam', 'beauty'],
    ['Nail Xinh', 'beauty'],
    ['Nhà thuốc An Khang', 'pharmacy'],
    ['Tiệm bánh Hoàng Mai', 'food'],
    ['Trà đạo Sen', 'coffee'],
    ['Nhà sách Cá Chép', 'books'],
    ['Cà phê Vườn Xưa', 'coffee'],
    ['Kem Cây Dừa', 'food'],
  ],
  '6': [
    ['Nhà hàng Sân Thượng', 'food'],
    ['Sky Bar', 'coffee'],
    ['BBQ Garden', 'food'],
    ['Pizza Rooftop', 'food'],
    ['Cà phê View Phố', 'coffee'],
    ['ATM VPBank', 'atm'],
    ['Lẩu Nướng Mây', 'food'],
    ['Hải sản Biển Đông', 'food'],
    ['Sushi Sakura', 'food'],
    ['Cà phê Vườn Trên Mây', 'coffee'],
    ['Trà chiều Sen', 'coffee'],
    ['Quầy Bar Hoàng Hôn', 'coffee'],
    ['Highlands Coffee', 'coffee'],
    ['Kem Nướng', 'food'],
    ['Nước dừa Tươi', 'coffee'],
    ['The Coffee House', 'coffee'],
    ['Bánh ngọt Sao Đêm', 'food'],
    ['Cộng Cà Phê', 'coffee'],
    ['Trà sữa Phúc Long', 'coffee'],
    ['Nhà thuốc Pharmacity', 'pharmacy'],
  ],
  'B1': [
    ['Siêu thị Co.opmart', 'supermarket'],
    ['Bách Hoá Xanh', 'supermarket'],
    ['Nhà thuốc Long Châu', 'pharmacy'],
    ['Nhà thuốc Pharmacity', 'pharmacy'],
    ['Trung Nguyên Legend', 'coffee'],
    ['ATM Vietcombank', 'atm'],
    ['Phở 24', 'food'],
    ['Cơm tấm Cali', 'food'],
    ['Kichi Kichi', 'food'],
    ['The Coffee House', 'coffee'],
    ['Highlands Coffee', 'coffee'],
    ['Phúc Long Coffee & Tea', 'coffee'],
    ['Bánh mì Huỳnh Hoa', 'food'],
    ['Nhà sách Cá Chép', 'books'],
    ['Hasaki', 'beauty'],
    ['Cocoon', 'beauty'],
    ['Sửa chữa Điện thoại', 'electronics'],
    ['Văn phòng phẩm Thiên Long', 'books'],
    ['Tiệm bánh Kinh Đô', 'food'],
    ['ATM BIDV', 'atm'],
  ],
};

const buildStores = (floor: Floor): Store[] => {
  const tenants = TENANTS[floor];
  const free = freeSlots(LAYOUTS[floor]);
  const stores: Store[] = [...free, ...CORE_SLOTS].map((slot) => {
    const idx = free.indexOf(slot);
    const [name, category, description] = idx >= 0 ? tenants[idx % tenants.length] : CORE[slot.id];
    return {
      id: slot.id,
      name,
      category,
      description: description ?? DESCRIPTIONS[category],
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      corridor: slot.corridor,
    };
  });
  stores.push({
    id: 'rest_area',
    name: 'Khu nghỉ chân',
    category: 'rest',
    description: DESCRIPTIONS.rest,
    ...REST_AREAS[LAYOUTS[floor].lower],
  });
  return stores;
};

const STORES_BY_FLOOR = Object.fromEntries(FLOORS.map((fl) => [fl, buildStores(fl)])) as Record<
  Floor,
  Store[]
>;

export const getStores = (floor: Floor): Store[] => STORES_BY_FLOOR[floor];

/** Exit / stairwell marker, drawn as a circle with an X. */
export const STAIRS = { x: 352, y: 548, r: 20 };

// --- corridor graph ---------------------------------------------------------

const JUNCTIONS: GraphNode[] = [
  { id: 'n_t0', x: 20, y: 95 },
  { id: 'n_tl', x: 100, y: 95 },
  { id: 'n_tr', x: 300, y: 95 },
  { id: 'n_t1', x: 380, y: 95 },
  { id: 'n_l1', x: 100, y: 247 },
  { id: 'n_r1', x: 300, y: 247 },
  { id: 'n_l2', x: 100, y: 345 },
  { id: 'n_r2', x: 300, y: 345 },
  { id: 'n_b0', x: 20, y: 495 },
  { id: 'n_bl', x: 100, y: 495 },
  { id: 'n_br', x: 300, y: 495 },
  { id: 'entrance', x: 300, y: 545 },
];

type Corridor = { axis: 'h' | 'v'; junctions: string[]; stores?: CorridorId };
const CORRIDORS: Corridor[] = [
  { axis: 'h', junctions: ['n_t0', 'n_tl', 'n_tr', 'n_t1'], stores: 'top' },
  { axis: 'v', junctions: ['n_tl', 'n_l1', 'n_l2', 'n_bl'], stores: 'left' },
  { axis: 'v', junctions: ['n_tr', 'n_r1', 'n_r2', 'n_br'], stores: 'right' },
  { axis: 'h', junctions: ['n_l1', 'n_r1'], stores: 'mid1' },
  { axis: 'h', junctions: ['n_l2', 'n_r2'], stores: 'mid2' },
  { axis: 'h', junctions: ['n_b0', 'n_bl', 'n_br'], stores: 'bottom' },
  { axis: 'v', junctions: ['n_br', 'entrance'] },
];

const CORRIDOR_LINE: Record<CorridorId, { axis: 'x' | 'y'; at: number }> = {
  top: { axis: 'y', at: 95 },
  mid1: { axis: 'y', at: 247 },
  mid2: { axis: 'y', at: 345 },
  bottom: { axis: 'y', at: 495 },
  left: { axis: 'x', at: 100 },
  right: { axis: 'x', at: 300 },
};

/** Where a store's door sits on its corridor. */
export function doorPoint(store: { x: number; y: number; width: number; height: number; corridor?: CorridorId }): { x: number; y: number } | null {
  if (!store.corridor) return null;
  const line = CORRIDOR_LINE[store.corridor];
  const cx = store.x + store.width / 2;
  const cy = store.y + store.height / 2;
  return line.axis === 'y' ? { x: cx, y: line.at } : { x: line.at, y: cy };
}

function buildGraph(stores: Store[]): Graph {
  const nodes: Record<string, GraphNode> = {};
  for (const j of JUNCTIONS) nodes[j.id] = j;
  const doorIds: Partial<Record<CorridorId, string[]>> = {};
  for (const store of stores) {
    const p = doorPoint(store);
    if (!p || !store.corridor) continue;
    const id = `door:${store.id}`;
    nodes[id] = { id, ...p };
    (doorIds[store.corridor] ??= []).push(id);
  }

  const edges: GraphEdge[] = [];
  for (const c of CORRIDORS) {
    const ids = [...c.junctions, ...(c.stores ? (doorIds[c.stores] ?? []) : [])];
    const key = c.axis === 'h' ? 'x' : 'y';
    ids.sort((a, b) => nodes[a][key] - nodes[b][key]);
    for (let i = 0; i < ids.length - 1; i++) {
      const a = nodes[ids[i]];
      const b = nodes[ids[i + 1]];
      const weight = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (weight > 0) edges.push({ from: a.id, to: b.id, weight });
    }
  }
  return { nodes, edges };
}

const GRAPH_BY_FLOOR = Object.fromEntries(
  FLOORS.map((fl) => [fl, buildGraph(STORES_BY_FLOOR[fl])]),
) as Record<Floor, Graph>;

export const getGraph = (floor: Floor): Graph => GRAPH_BY_FLOOR[floor];

export const CURRENT_LOCATION_NODE = 'entrance';
export const DEMO_DESTINATION_ID = 'tl1';
export const DEFAULT_FLOOR: Floor = '1';

export const doorNodeId = (storeId: string) => `door:${storeId}`;

/** Every tenant in the mock building is open; services run around the clock. */
export function openingHours(category: StoreCategory): string {
  switch (category) {
    case 'atm':
    case 'wc_male':
    case 'wc_female':
    case 'elevator':
    case 'escalator':
    case 'rest':
      return '24/7';
    case 'coffee':
      return '8:00 – 22:00';
    case 'supermarket':
    case 'pharmacy':
      return '7:00 – 23:00';
    default:
      return '9:00 – 22:00';
  }
}

export function zoneOf(corridor?: CorridorId): 'west' | 'east' | 'north' | 'entrance' | 'center' {
  switch (corridor) {
    case 'left':
      return 'west';
    case 'right':
      return 'east';
    case 'top':
      return 'north';
    case 'bottom':
      return 'entrance';
    default:
      return 'center';
  }
}
