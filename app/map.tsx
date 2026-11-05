import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, useWindowDimensions, Platform, Alert, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, Pattern, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import {
  blockedNodes,
  CURRENT_LOCATION_NODE,
  DEMO_DESTINATION_ID,
  doorNodeId,
  getGraph,
  FLOOR_VIEWBOX,
  METERS_PER_UNIT,
  isVenueCode,
  MOCK_BUILDING,
  DEFAULT_FLOOR,
  FLOORS,
  getStores,
  type Floor,
  type StoreCategory,
  WALK_SPEED_MPS,
} from '@/data/mock-floor';
import { StoreIcon, wrapLabel } from '@/components/floor-plan-parts';
import { HazardOverlay } from '@/components/hazard-overlay';
import { findNearest, findPath } from '@/data/pathfinding';
import { useAccessibilityMode, useHighContrast, useTextScale } from '@/hooks/use-accessibility-mode';
import { useIncident } from '@/hooks/use-incident';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

import { useColors, type Colors } from '@/hooks/use-colors';
const DANGER = '#D64545';

// Bottom navigation bar: floating controls sit above it by this height plus the safe-area inset.
const TAB_BAR_HEIGHT = 56;
const FLOAT_GAP = 16;


/** Room reserved for the destination card under the top controls, so selecting a store never resizes the map. */
const DEST_CARD_HEIGHT = 66;
const ZOOM_BUTTON = 40;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const VIEW_BOX = `${FLOOR_VIEWBOX.x} ${FLOOR_VIEWBOX.y} ${FLOOR_VIEWBOX.width} ${FLOOR_VIEWBOX.height}`;

const NEAREST_CHIPS: {
  key: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  categories: StoreCategory[];
}[] = [
  { key: 'wc', icon: 'wc', categories: ['wc_male', 'wc_female'] },
  { key: 'atm', icon: 'atm', categories: ['atm'] },
  { key: 'elevator', icon: 'elevator', categories: ['elevator'] },
  { key: 'pharmacy', icon: 'local-pharmacy', categories: ['pharmacy'] },
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const DASH = [8, 4, 2, 4];
const DASH_LENGTH = DASH.reduce((a, b) => a + b, 0);

export default function FloorMapScreen() {
  const colors = useColors();
  const { BLUE, INK, MUTED, WALL, STORE_FILL, SELECTED_FILL, STRONG } = colors;
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [accessible] = useAccessibilityMode();
  const [highContrast] = useHighContrast();
  // Store names scale at half the rate of the other text so they still fit their cells.
  const mapTextScale = 1 + (useTextScale() - 1) * 0.5;
  const wall = highContrast ? INK : WALL;
  const [incident] = useIncident();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const floatBottom = TAB_BAR_HEIGHT + insets.bottom + FLOAT_GAP;
  // The map sits between the measured top controls and the zoom buttons / tab bar.
  const [topControlsH, setTopControlsH] = useState(0);
  const [floorMenuOpen, setFloorMenuOpen] = useState(false);
  const [floorMenuPos, setFloorMenuPos] = useState({ top: 0, right: 16 });
  const floorBtnRef = useRef<View>(null);
  const openFloorMenu = () => {
    floorBtnRef.current?.measureInWindow((x, y, w, h) => {
      setFloorMenuPos({ top: y + h + 4, right: Math.max(8, windowWidth - (x + w)) });
      setFloorMenuOpen(true);
    });
  };
  const mapBottom = floatBottom + ZOOM_BUTTON + FLOAT_GAP;

  // A destination picked on the search screen replaces the current one.
  useEffect(() => {
    if (!dest) return;
    if (FLOORS.includes(floorParam as Floor)) setFloor(floorParam as Floor);
    setDestId(dest);
    setNavigating(true);
  }, [dest, floorParam, ts]);

  const stores = useMemo(() => getStores(floor), [floor]);
  const store = useMemo(() => stores.find((s) => s.id === destId) ?? null, [stores, destId]);
  const changeFloor = (f: Floor) => {
    if (f === floor) return;
    setFloor(f);
    setDestId(null);
    setNavigating(false);
    setDetailOpen(false);
  };
  const graph = useMemo(() => getGraph(floor), [floor]);
  const path = useMemo(
    () => (store ? findPath(graph, CURRENT_LOCATION_NODE, doorNodeId(store.id), blockedNodes(incident, floor)) : null),
    [graph, store, incident, floor],
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
  // The user is assumed to stand at the entrance of the default floor only.
  const onUserFloor = floor === DEFAULT_FLOOR;

  // The map starts right under the controls; the destination card pushes it down smoothly.
  const cardVisible = !!store && (!!path || !onUserFloor);
  const topPad = useSharedValue(0);
  const mapTopTarget = topControlsH + 4 + (cardVisible ? DEST_CARD_HEIGHT + 8 : 0);
  useEffect(() => {
    topPad.value = withTiming(mapTopTarget, { duration: 200 });
  }, [mapTopTarget, topPad]);
  const areaStyle = useAnimatedStyle(() => ({ top: topPad.value }));

  // Blinking alert button while a simulated incident is on (static when motion is reduced).
  const reduceMotion = useReduceMotion();
  const alertBlink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!incident || reduceMotion) {
      alertBlink.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(alertBlink, { toValue: 0.4, duration: 450, useNativeDriver: true }),
        Animated.timing(alertBlink, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [incident, reduceMotion, alertBlink]);
  const [alertOpen, setAlertOpen] = useState(false);

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
  };
  // Start turn-by-turn guidance for the selected (or demo) destination.
  const startGuidance = () => {
    const id = destId ?? (floor === DEFAULT_FLOOR ? DEMO_DESTINATION_ID : null);
    if (!id) return;
    setDestId(id);
    setNavigating(true);
    router.push({ pathname: '/directions', params: { to: id, floor, from, originFloor: DEFAULT_FLOOR } });
  };
  const startFromDetail = () => {
    setDetailOpen(false);
    startGuidance();
  };
  const goNearest = (categories: StoreCategory[]) => {
    const hit = findNearest(categories, CURRENT_LOCATION_NODE, {
      fromFloor: DEFAULT_FLOOR,
      accessible,
      hazard: incident,
    });
    if (!hit) {
      const msg = t('map.nearest.notFound');
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
      else Alert.alert(msg);
      return;
    }
    router.push({
      pathname: '/directions',
      params: { to: hit.storeId, floor: hit.floor, from, originFloor: DEFAULT_FLOOR },
    });
  };
  const startEvacuation = () => {
    Alert.alert(t('evac.confirmTitle'), t('evac.confirmMsg'), [
      { text: t('evac.cancel'), style: 'cancel' },
      {
        text: t('evac.confirmGo'),
        style: 'destructive',
        onPress: () => router.push({ pathname: '/directions', params: { mode: 'evac', floor, from } }),
      },
    ]);
  };
  const clearDestination = () => {
    setDestId(null);
    setNavigating(false);
    setDetailOpen(false);
  };

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <Reanimated.View
          style={[styles.mapArea, { bottom: mapBottom }, areaStyle, mapStyle]}
          onLayout={(e) => {
            box.value = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
          }}>
        <Svg width="100%" height="100%" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMid meet">
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
            stroke={wall}
            strokeWidth={4}
          />

          {stores.map((s) => {
            const rest = s.category === 'rest';
            const cx = s.x + s.width / 2;
            const cy = s.y + s.height / 2;
            const selected = s.id === destId;
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
                  fill={rest ? 'url(#hatch)' : selected ? SELECTED_FILL : STORE_FILL}
                  stroke={liftHint ? BLUE : wall}
                  strokeWidth={liftHint ? 3 : 2.5}
                />
                {!rest && <StoreIcon category={s.category} x={cx} y={cy - 10} />}
                {wrapLabel(s.name).map((line, i) => (
                  <SvgText
                    key={i}
                    x={cx}
                    y={rest ? cy + i * 8 : cy + 8 + i * 7.5}
                    fontSize={6.5 * mapTextScale}
                    fill={highContrast ? STRONG : INK}
                    textAnchor="middle">
                    {line}
                  </SvgText>
                ))}
              </G>
            );
          })}

          <HazardOverlay hazard={incident} floor={floor} />

          {navigating && onUserFloor && routePoints && (
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

          {onUserFloor && (
            <>
              <AnimatedCircle cx={origin.x} cy={origin.y} r={pulseR} fill={BLUE} opacity={pulseOpacity} />
              <Circle cx={origin.x} cy={origin.y} r={7} fill={BLUE} stroke="#FFFFFF" strokeWidth={3} />
            </>
          )}
        </Svg>
        </Reanimated.View>
      </GestureDetector>

      <View
        style={[styles.overlay, { paddingTop: insets.top + 12 }]}
        pointerEvents="box-none"
        onLayout={(e) => setTopControlsH(e.nativeEvent.layout.height)}>
        {incident && (
          <Pressable
            accessibilityRole="alert"
            onPress={startEvacuation}
            style={styles.incidentBanner}>
            <MaterialIcons name="warning" size={22} color="#FFFFFF" />
            <View style={styles.incidentBody}>
              <Text style={styles.incidentText}>
                {t('evac.banner', {
                  type: t(`hazard.type.${incident.type}`),
                  floor: incident.floor,
                  zone: t(`hazard.zone.${incident.zone}`),
                })}
              </Text>
              <Text style={styles.incidentCta}>{t('evac.bannerCta')}</Text>
            </View>
          </Pressable>
        )}
        <View style={styles.titleRow}>
          <Text style={styles.building} numberOfLines={1}>
            {from && isVenueCode(from) ? `${MOCK_BUILDING.name} · ${from}` : MOCK_BUILDING.name}
          </Text>
        </View>

        <View style={styles.searchRow}>
          <Pressable
            accessibilityRole="search"
            accessibilityLabel={t('map.searchPlaceholder')}
            onPress={openSearch}
            style={styles.searchBox}>
            <MaterialIcons name="search" size={18} color={MUTED} />
            <Text style={styles.searchText} numberOfLines={1}>
              {t('map.searchPlaceholder')}
            </Text>
          </Pressable>
          <Pressable
            ref={floorBtnRef}
            accessibilityRole="button"
            accessibilityLabel={t('map.floorPick', { floor })}
            accessibilityState={{ expanded: floorMenuOpen }}
            onPress={openFloorMenu}
            style={styles.floorBtn}>
            <Text style={styles.floorBtnText}>{t('map.floor', { floor })}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color={MUTED} />
            {incident && <View style={styles.floorDot} />}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('evac.button')}
            onPress={startEvacuation}
            style={[styles.chip, styles.chipEvac]}>
            <MaterialIcons name="exit-to-app" size={16} color="#FFFFFF" />
            <Text style={[styles.chipText, styles.chipEvacText]} numberOfLines={1}>
              {t('evac.button')}
            </Text>
          </Pressable>
          {NEAREST_CHIPS.map((c) => (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              onPress={() => goNearest(c.categories)}
              style={styles.chip}>
              <MaterialIcons name={c.icon} size={16} color={BLUE} />
              <Text style={styles.chipText} numberOfLines={1}>
                {t(`map.nearest.${c.key}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

      </View>

      <Modal visible={floorMenuOpen} transparent animationType="fade" onRequestClose={() => setFloorMenuOpen(false)}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel={t('evac.cancel')}
          onPress={() => setFloorMenuOpen(false)}>
          <View style={[styles.floorMenu, { top: floorMenuPos.top, right: floorMenuPos.right }]}>
            <ScrollView>
            {FLOORS.map((f) => {
              const active = f === floor;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('map.floor', { floor: f })}
                  onPress={() => {
                    setFloorMenuOpen(false);
                    changeFloor(f);
                  }}
                  style={[styles.floorMenuItem, active && styles.floorMenuItemActive]}>
                  <Text maxFontSizeMultiplier={1.15} style={[styles.floorMenuText, active && { color: BLUE }]}>{t('map.floor', { floor: f })}</Text>
                  {incident?.floor === f && <View style={styles.floorMenuDot} />}
                  {active && <MaterialIcons name="check" size={16} color={BLUE} />}
                </Pressable>
              );
            })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <View style={[styles.cardSlot, { top: topControlsH + 4 }]} pointerEvents="box-none">
          {store && (path || !onUserFloor) && (
            <View style={styles.destCard}>
              <MaterialIcons name="alt-route" size={20} color={BLUE} />
              <View style={styles.destBody}>
                <Text style={styles.destName} numberOfLines={1}>
                  {store.name}
                </Text>
                {onUserFloor && (
                  <Text style={styles.destMeta}>{t('map.walkTime', { meters, minutes })}</Text>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('map.details')}
                hitSlop={8}
                onPress={() => setDetailOpen(true)}>
                <MaterialIcons name="info-outline" size={18} color={MUTED} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('map.cancelRoute')}
                hitSlop={8}
                onPress={clearDestination}>
                <MaterialIcons name="close" size={18} color={MUTED} />
              </Pressable>
            </View>
          )}
      </View>

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

      <View style={[styles.tabBarWrap, { paddingBottom: insets.bottom }]}>
        <View style={styles.tabBar}>
          <View style={styles.tab}>
            <View style={styles.tabIndicator} />
            <MaterialIcons name="map" size={22} color={BLUE} />
            <Text style={[styles.tabText, styles.tabTextActive]}>{t('map.tab.map')}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={openSearch} style={styles.tab}>
            <MaterialIcons name="search" size={22} color={MUTED} />
            <Text style={styles.tabText}>{t('map.tab.search')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: accessible }}
            onPress={() => router.push('/accessibility')}
            style={[styles.tab, accessible && styles.tabAccessible]}>
            <MaterialIcons name="accessible" size={22} color={accessible ? BLUE : MUTED} />
            <Text style={[styles.tabText, accessible && { color: BLUE }]}>
              {t('map.tab.accessibility')}
            </Text>
          </Pressable>
        </View>
      </View>

      {incident && (
        <Animated.View style={[styles.alertWrap, { bottom: floatBottom, opacity: alertBlink }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('evac.alertButton')}
            onPress={() => setAlertOpen(true)}
            style={styles.alertBtn}>
            <MaterialIcons name="warning" size={22} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      )}

      <Modal visible={alertOpen && !!incident} transparent animationType="fade" onRequestClose={() => setAlertOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAlertOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={[styles.modalCategory, { color: DANGER }]}>{t('evac.alertTitle')}</Text>
            {incident && (
              <Text style={styles.modalName}>
                {t('evac.banner', {
                  type: t(`hazard.type.${incident.type}`),
                  floor: incident.floor,
                  zone: t(`hazard.zone.${incident.zone}`),
                })}
              </Text>
            )}
            <View style={styles.modalFooter}>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setAlertOpen(false)}>
                <Text style={styles.modalClose}>{t('map.close')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setAlertOpen(false);
                  router.push({ pathname: '/directions', params: { mode: 'evac', floor, from } });
                }}
                style={styles.alertGo}>
                <Text style={styles.alertGoText}>{t('evac.nowBtn')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.zoom, { bottom: floatBottom }]}>
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

const makeStyles = ({ BLUE, INK, MUTED, BORDER, CANVAS, CARD, ACTIVE_BG, TINT }: Colors) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: CANVAS },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  building: { flex: 1, fontSize: 14, fontWeight: '700', color: INK },
  floorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  floorBtnText: { fontSize: 13, fontWeight: '700', color: INK },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchText: { flex: 1, fontSize: 13, color: MUTED },
  floorMenu: {
    position: 'absolute',
    width: 124,
    maxHeight: 260,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  floorMenuItem: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  floorMenuItemActive: { backgroundColor: ACTIVE_BG },
  floorMenuText: { flex: 1, fontSize: 14, fontWeight: '600', color: INK },
  floorMenuDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DANGER },
  alertWrap: { position: 'absolute', right: 116 },
  alertBtn: {
    width: ZOOM_BUTTON,
    height: ZOOM_BUTTON,
    borderRadius: ZOOM_BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DANGER,
    ...shadow,
  },
  alertGo: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DANGER,
  },
  alertGoText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  mapArea: { position: 'absolute', left: 0, right: 0 },
  cardSlot: { position: 'absolute', left: 16, right: 16 },
  chipRow: { gap: 8, alignItems: 'center', paddingRight: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: TINT,
    borderWidth: 1,
    borderColor: `${BLUE}55`,
  },
  chipEvac: { backgroundColor: DANGER, borderColor: DANGER },
  chipText: { fontSize: 12.5, fontWeight: '600', color: BLUE },
  chipEvacText: { fontWeight: '800', color: '#FFFFFF' },
  incidentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: DANGER,
    ...shadow,
  },
  incidentBody: { flex: 1, gap: 4 },
  incidentText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  incidentCta: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', textDecorationLine: 'underline' },
  floorDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: DANGER,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: CARD,
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
  modalCard: { padding: 20, borderRadius: 20, backgroundColor: CARD, ...shadow },
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
  zoom: { position: 'absolute', right: 16, flexDirection: 'row', gap: 8 },
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  tabBar: { flexDirection: 'row', height: TAB_BAR_HEIGHT },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 36,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: BLUE,
  },
  tabAccessible: {},
  tabText: { fontSize: 12, fontWeight: '700', color: MUTED },
  tabTextActive: { color: BLUE },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
});
