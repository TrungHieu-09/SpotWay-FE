import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import {
  CURRENT_LOCATION_NODE,
  DEMO_DESTINATION_ID,
  doorNodeId,
  getGraph,
  FLOOR_VIEWBOX,
  METERS_PER_UNIT,
  MOCK_BUILDING,
  STAIRS,
  DEFAULT_FLOOR,
  FLOORS,
  getStores,
  type Floor,
  WALK_SPEED_MPS,
} from '@/data/mock-floor';
import { StoreIcon, wrapLabel } from '@/components/floor-plan-parts';
import { findPath } from '@/data/pathfinding';
import { useAccessibilityMode } from '@/hooks/use-accessibility-mode';

const BLUE = '#1C4E9C';
const ORANGE = '#F2641E';
const INK = '#14213D';
const MUTED = '#5B6B88';
const BORDER = '#E4E8F0';
const WALL = '#8A8F98';


// Extra headroom so the first row of stores is not hidden under the floating controls.
const PLAN = {
  x: FLOOR_VIEWBOX.x,
  y: FLOOR_VIEWBOX.y - 135,
  w: FLOOR_VIEWBOX.width,
  h: FLOOR_VIEWBOX.height + 135,
};
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const VIEW_BOX = `${PLAN.x} ${PLAN.y} ${PLAN.w} ${PLAN.h}`;
const SELECTED_FILL = '#D3D7DE';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const DASH = [8, 4, 2, 4];
const DASH_LENGTH = DASH.reduce((a, b) => a + b, 0);

export default function FloorMapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { from, dest, floor: floorParam, ts } = useLocalSearchParams<{
    from?: string;
    dest?: string;
    floor?: string;
    ts?: string;
  }>();

  const [floor, setFloor] = useState<Floor>(
    FLOORS.includes(floorParam as Floor) ? (floorParam as Floor) : DEFAULT_FLOOR,
  );
  const [destId, setDestId] = useState<string | null>(
    dest ?? (floor === DEFAULT_FLOOR ? DEMO_DESTINATION_ID : null),
  );
  const [navigating, setNavigating] = useState(true);
  const [marked, setMarked] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [accessible] = useAccessibilityMode();
  const insets = useSafeAreaInsets();

  // A destination picked on the search screen replaces the current one.
  useEffect(() => {
    if (!dest) return;
    if (FLOORS.includes(floorParam as Floor)) setFloor(floorParam as Floor);
    setDestId(dest);
    setNavigating(true);
    setMarked(false);
  }, [dest, floorParam, ts]);

  const stores = useMemo(() => getStores(floor), [floor]);
  const store = useMemo(() => stores.find((s) => s.id === destId) ?? null, [stores, destId]);
  const changeFloor = (f: Floor) => {
    if (f === floor) return;
    setFloor(f);
    setDestId(null);
    setNavigating(false);
    setMarked(false);
    setDetailOpen(false);
  };
  const graph = useMemo(() => getGraph(floor), [floor]);
  const path = useMemo(
    () => (store ? findPath(graph, CURRENT_LOCATION_NODE, doorNodeId(store.id)) : null),
    [graph, store],
  );

  // Route polyline: graph nodes, then a final hop from the corridor into the store's doorway.
  const routePoints = useMemo(() => {
    if (!path || !store) return null;
    const last = path.points[path.points.length - 1];
    const doorway = {
      x: Math.min(store.x + store.width, Math.max(store.x, last.x)),
      y: Math.min(store.y + store.height, Math.max(store.y, last.y)),
    };
    return [...path.points, doorway].map((p) => `${p.x},${p.y}`).join(' ');
  }, [path, store]);

  const meters = path ? Math.round(path.length * METERS_PER_UNIT) : 0;
  const minutes = Math.max(1, Math.ceil(meters / WALK_SPEED_MPS / 60));

  const origin = graph.nodes[CURRENT_LOCATION_NODE];

  // Pulse ring around the current location.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const flow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [flow]);
  const dashOffset = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -DASH_LENGTH] });
  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [6, 22] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  // Pan + pinch-to-zoom: the whole map layer is transformed on the UI thread.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const box = useSharedValue({ w: 0, h: 0 });

  const gesture = useMemo(() => {
    const clampPan = (v: number, size: number, s: number) => {
      'worklet';
      const max = (size * (s - 1)) / 2 + 60;
      return Math.min(max, Math.max(-max, v));
    };
    const pan = Gesture.Pan()
      .maxPointers(2)
      .onUpdate((e) => {
        tx.value = clampPan(savedTx.value + e.translationX, box.value.w, scale.value);
        ty.value = clampPan(savedTy.value + e.translationY, box.value.h, scale.value);
      })
      .onEnd(() => {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      });
    const pinch = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, savedScale.value * e.scale));
        tx.value = clampPan(tx.value, box.value.w, scale.value);
        ty.value = clampPan(ty.value, box.value.h, scale.value);
      })
      .onEnd(() => {
        savedScale.value = scale.value;
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      });
    return Gesture.Simultaneous(pan, pinch);
  }, [box, savedScale, savedTx, savedTy, scale, tx, ty]);

  const mapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const zoomBy = (delta: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale.value + delta));
    scale.value = withTiming(next);
    savedScale.value = next;
    if (next === MIN_ZOOM) {
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      savedTx.value = 0;
      savedTy.value = 0;
    }
  };

  const openSearch = () => router.push({ pathname: '/search', params: { from } });
  // First tap selects a store as destination; tapping the selected store again opens its details.
  const onStorePress = (id: string) => {
    if (id === destId) {
      setDetailOpen(true);
      return;
    }
    setDestId(id);
    setNavigating(true);
    setMarked(false);
  };
  // Start turn-by-turn guidance for the selected (or demo) destination.
  const startGuidance = () => {
    const id = destId ?? (floor === DEFAULT_FLOOR ? DEMO_DESTINATION_ID : null);
    if (!id) return;
    setDestId(id);
    setNavigating(true);
    router.push({ pathname: '/directions', params: { to: id, floor, from } });
  };
  const startFromDetail = () => {
    setDetailOpen(false);
    startGuidance();
  };
  const clearDestination = () => {
    setDestId(null);
    setNavigating(false);
    setMarked(false);
    setDetailOpen(false);
  };

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <Reanimated.View
          style={[StyleSheet.absoluteFill, mapStyle]}
          onLayout={(e) => {
            box.value = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
          }}>
        <Svg width="100%" height="100%" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMin meet">
          <Defs>
            <Pattern id="hatch" patternUnits="userSpaceOnUse" width={6} height={6}>
              <Line x1={0} y1={0} x2={0} y2={6} stroke="#C9CDD4" strokeWidth={1.5} />
            </Pattern>
          </Defs>

          <Rect
            x={8}
            y={8}
            width={FLOOR_VIEWBOX.width - 16}
            height={FLOOR_VIEWBOX.height - 16}
            fill="none"
            stroke={WALL}
            strokeWidth={4}
          />

          {stores.map((s) => {
            const rest = s.category === 'rest';
            const cx = s.x + s.width / 2;
            const cy = s.y + s.height / 2;
            const selected = s.id === destId;
            const isDest = selected && marked;
            const liftHint = accessible && s.category === 'elevator';
            const dimmed = accessible && s.category === 'escalator';
            return (
              <G
                key={s.id}
                opacity={dimmed ? 0.35 : 1}
                onPress={rest ? undefined : () => onStorePress(s.id)}>
                <Rect
                  x={s.x}
                  y={s.y}
                  width={s.width}
                  height={s.height}
                  fill={rest ? 'url(#hatch)' : selected ? SELECTED_FILL : '#F9F9F9'}
                  stroke={isDest ? ORANGE : liftHint ? BLUE : WALL}
                  strokeWidth={isDest || liftHint ? 3 : 2.5}
                />
                {!rest && <StoreIcon category={s.category} x={cx} y={cy - 10} />}
                {wrapLabel(s.name).map((line, i) => (
                  <SvgText
                    key={i}
                    x={cx}
                    y={rest ? cy + i * 8 : cy + 8 + i * 7.5}
                    fontSize={6.5}
                    fill={INK}
                    textAnchor="middle">
                    {line}
                  </SvgText>
                ))}
              </G>
            );
          })}

          {/* stairs / escalator */}
          <Circle cx={STAIRS.x} cy={STAIRS.y} r={STAIRS.r} fill="#FFFFFF" stroke={WALL} strokeWidth={3} />
          <Path
            d={`M${STAIRS.x - 14} ${STAIRS.y - 14} L${STAIRS.x + 14} ${STAIRS.y + 14} M${STAIRS.x + 14} ${STAIRS.y - 14} L${STAIRS.x - 14} ${STAIRS.y + 14}`}
            stroke={WALL}
            strokeWidth={2.5}
          />

          {navigating && routePoints && (
            <AnimatedPolyline
              points={routePoints}
              fill="none"
              stroke={BLUE}
              strokeWidth={3}
              strokeDasharray={DASH}
              strokeDashoffset={dashOffset}
              strokeLinejoin="round"
            />
          )}

          <AnimatedCircle cx={origin.x} cy={origin.y} r={pulseR} fill={BLUE} opacity={pulseOpacity} />
          <Circle cx={origin.x} cy={origin.y} r={7} fill={BLUE} stroke="#FFFFFF" strokeWidth={3} />
        </Svg>
        </Reanimated.View>
      </GestureDetector>

      <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.building} numberOfLines={1}>
          {from ? `${MOCK_BUILDING.name} · ${from}` : MOCK_BUILDING.name}
        </Text>
        <View style={styles.searchRow}>
          <Pressable
            accessibilityRole="search"
            accessibilityLabel={t('map.searchPlaceholder')}
            onPress={openSearch}
            style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={MUTED} />
            <Text style={styles.searchText} numberOfLines={1}>
              {t('map.searchPlaceholder')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('map.directions')}
            onPress={startGuidance}
            style={[styles.actionBtn, { backgroundColor: BLUE }]}>
            <MaterialIcons name="directions" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('map.markDest')}
            accessibilityState={{ selected: marked }}
            onPress={() => setMarked((m) => !m)}
            style={[styles.actionBtn, { backgroundColor: ORANGE }]}>
            <MaterialIcons name="place" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.floorRow}>
          <View style={styles.floorPill}>
            {FLOORS.map((f) => {
              const active = f === floor;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('map.floor', { floor: f })}
                  onPress={() => changeFloor(f)}
                  style={[styles.floorItem, active && styles.floorItemActive]}>
                  <Text style={[styles.floorText, active && styles.floorTextActive]}>{f}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {store && path && (
          <View style={styles.destCard}>
            <MaterialIcons name="alt-route" size={20} color={BLUE} />
            <View style={styles.destBody}>
              <Text style={styles.destName} numberOfLines={1}>
                {store.name}
              </Text>
              <Text style={styles.destMeta}>{t('map.walkTime', { meters, minutes })}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('map.details')}
              hitSlop={8}
              onPress={() => setDetailOpen(true)}>
              <MaterialIcons name="info-outline" size={20} color={MUTED} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('map.cancelRoute')}
              hitSlop={8}
              onPress={clearDestination}>
              <MaterialIcons name="close" size={20} color={MUTED} />
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <Modal
        visible={detailOpen && !!store}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setDetailOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {store?.category && (
              <Text style={styles.modalCategory}>{t(`map.category.${store.category}`)}</Text>
            )}
            <Text style={styles.modalName}>{store?.name}</Text>
            {store?.description && <Text style={styles.modalDesc}>{store.description}</Text>}
            <View style={styles.modalFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('map.close')}
                hitSlop={8}
                onPress={() => setDetailOpen(false)}>
                <Text style={styles.modalClose}>{t('map.close')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  setDetailOpen(false);
                  if (store) {
                    router.push({ pathname: '/store', params: { id: store.id, floor, from } });
                  }
                }}>
                <Text style={styles.modalLink}>{t('map.details')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('map.directions')}
                onPress={startFromDetail}
                style={styles.modalGo}>
                <MaterialIcons name="directions" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        <View style={styles.tabBar}>
          <View style={[styles.tab, styles.tabActive]}>
            <MaterialIcons name="map" size={18} color="#FFFFFF" />
            <Text style={[styles.tabText, styles.tabTextActive]}>{t('map.tab.map')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openSearch}
            style={styles.tab}>
            <MaterialIcons name="search" size={18} color={MUTED} />
            <Text style={styles.tabText}>{t('map.tab.search')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: accessible }}
            onPress={() => router.push('/accessibility')}
            style={[styles.tab, accessible && styles.tabAccessible]}>
            <MaterialIcons name="accessible" size={18} color={accessible ? BLUE : MUTED} />
            <Text style={[styles.tabText, accessible && { color: BLUE }]}>
              {t('map.tab.accessibility')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.zoom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('map.zoomIn')}
          onPress={() => zoomBy(ZOOM_STEP)}
          style={styles.zoomBtn}>
          <MaterialIcons name="add" size={22} color={INK} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('map.zoomOut')}
          onPress={() => zoomBy(-ZOOM_STEP)}
          style={styles.zoomBtn}>
          <MaterialIcons name="remove" size={22} color={INK} />
        </Pressable>
      </View>
    </View>
  );
}

const shadow = {
  shadowColor: '#14213D',
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 10 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    ...shadow,
  },
  searchText: { flex: 1, fontSize: 14, color: MUTED },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  floorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  floorPill: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
  floorItem: {
    minWidth: 40,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorItemActive: { backgroundColor: BLUE },
  floorText: { fontSize: 13, fontWeight: '700', color: MUTED },
  floorTextActive: { color: '#FFFFFF' },
  building: { marginTop: 8, fontSize: 13, fontWeight: '700', color: INK },
  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    ...shadow,
  },
  destBody: { flex: 1 },
  destName: { fontSize: 15, fontWeight: '700', color: INK },
  destMeta: { fontSize: 13, color: MUTED, marginTop: 2 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(20,33,61,0.4)',
  },
  modalCard: { padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF', ...shadow },
  modalCategory: { fontSize: 12, fontWeight: '700', color: BLUE, textTransform: 'uppercase' },
  modalName: { fontSize: 20, fontWeight: '800', color: INK, marginTop: 4 },
  modalDesc: { fontSize: 14, color: MUTED, marginTop: 6 },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalLink: { fontSize: 14, fontWeight: '700', color: BLUE },
  modalClose: { fontSize: 14, fontWeight: '600', color: MUTED },
  modalGo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
  },
  zoom: { position: 'absolute', right: 16, bottom: 110, gap: 8 },
  tabBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  tabBar: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  tabActive: { backgroundColor: BLUE },
  tabAccessible: { backgroundColor: '#E6EDF8' },
  tabText: { fontSize: 13, fontWeight: '700', color: MUTED },
  tabTextActive: { color: '#FFFFFF' },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
});
