import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { StoreIcon, wrapLabel } from '@/components/floor-plan-parts';
import {
  FLOOR_VIEWBOX,
  FLOORS,
  getStores,
  STAIRS,
  WALK_SPEED_MPS,
  zoneOf,
  type Floor,
} from '@/data/mock-floor';
import { planRoute, stepHeadline, type StepKind } from '@/data/route-steps';
import { useActiveStep } from '@/hooks/use-active-step';

const BLUE = '#1C4E9C';
const INK = '#14213D';
const MUTED = '#5B6B88';
const BORDER = '#E4E8F0';
const WALL = '#8A8F98';
const ACTIVE_BG = '#E6EDF8';
const DANGER = '#D64545';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STEP_ICON: Record<StepKind, keyof typeof MaterialIcons.glyphMap> = {
  straight: 'arrow-upward',
  left: 'turn-left',
  right: 'turn-right',
  arrive: 'flag',
};

type Focus = 'follow' | 'stairs' | 'elevator';

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export default function DirectionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const {
    to,
    dest,
    floor: floorParam,
    from,
  } = useLocalSearchParams<{ to?: string; dest?: string; floor?: string; from?: string }>();
  const destId = to ?? dest ?? '';
  const floor: Floor = FLOORS.includes(floorParam as Floor) ? (floorParam as Floor) : '1';

  const plan = useMemo(() => planRoute(floor, destId), [floor, destId]);
  const [active, setActive] = useActiveStep(`${floor}:${destId}`);
  const [viewFloor, setViewFloor] = useState<Floor>(floor);
  const [focus, setFocus] = useState<Focus>('follow');

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
  const pulseR = pulse.interpolate({ inputRange: [0, 1], outputRange: [10, 28] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  const stores = useMemo(() => getStores(viewFloor), [viewFloor]);
  const elevator = stores.find((s) => s.category === 'elevator') ?? null;

  if (!plan) {
    return (
      <SafeAreaView style={styles.root}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.emptyBack}>
          <MaterialIcons name="arrow-back" size={24} color={INK} />
        </Pressable>
        <Text style={styles.empty}>{t('nav.noRoute')}</Text>
      </SafeAreaView>
    );
  }

  const { store, route } = plan;
  const { corners, steps } = route;
  const legCount = corners.length - 1;
  const current = Math.min(active, steps.length - 1);
  const step = steps[current];
  const next = steps[current + 1];
  const onRouteFloor = viewFloor === floor;

  // Position + heading of the walker.
  const position = corners[Math.min(current, legCount)];
  const legFrom = corners[Math.min(current, legCount - 1)];
  const legTo = corners[Math.min(current + 1, legCount)];
  const heading = (Math.atan2(legTo.x - legFrom.x, -(legTo.y - legFrom.y)) * 180) / Math.PI;

  const remainingMeters = steps.slice(current).reduce((sum, s) => sum + s.meters, 0);
  const remainingMinutes = Math.max(1, Math.ceil(remainingMeters / WALK_SPEED_MPS / 60));

  // Camera: follow the current leg, or jump to a facility the user asked about.
  const focusPoint =
    focus === 'stairs'
      ? { x: STAIRS.x, y: STAIRS.y }
      : focus === 'elevator' && elevator
        ? { x: elevator.x + elevator.width / 2, y: elevator.y + elevator.height / 2 }
        : null;
  const aspect = winH / winW;
  let vbW: number;
  let cx: number;
  let cy: number;
  if (focusPoint || !onRouteFloor) {
    vbW = 240;
    cx = focusPoint?.x ?? FLOOR_VIEWBOX.width / 2;
    cy = focusPoint?.y ?? FLOOR_VIEWBOX.height / 2;
    if (!focusPoint) vbW = FLOOR_VIEWBOX.width;
  } else {
    const minX = Math.min(legFrom.x, legTo.x);
    const maxX = Math.max(legFrom.x, legTo.x);
    const minY = Math.min(legFrom.y, legTo.y);
    const maxY = Math.max(legFrom.y, legTo.y);
    vbW = Math.min(FLOOR_VIEWBOX.width, Math.max(maxX - minX + 200, (maxY - minY + 200) / aspect, 320));
    cx = (minX + maxX) / 2;
    cy = (minY + maxY) / 2;
  }
  const vbH = vbW * aspect;
  const vbX = Math.min(Math.max(FLOOR_VIEWBOX.width - vbW, 0), Math.max(0, cx - vbW / 2));
  // The instruction card is taller than the bottom bar, so nudge content down a little.
  const vbY = Math.min(
    Math.max(FLOOR_VIEWBOX.height - vbH, 0),
    Math.max(-60, cy - vbH / 2 - vbH * 0.06),
  );
  const viewBox = `${vbX} ${vbY} ${vbW} ${vbH}`;

  const pts = (list: { x: number; y: number }[]) => list.map((p) => `${p.x},${p.y}`).join(' ');
  const done = current > 0 ? corners.slice(0, Math.min(current, legCount) + 1) : [];
  const now = current < legCount ? [corners[current], corners[current + 1]] : [];
  const upcoming = current + 1 < legCount ? corners.slice(current + 1) : [];

  const sub = step.kind === 'arrive' ? store.name : step.landmark
    ? t('dir.toward', { place: step.landmark })
    : t(`store.zone.${zoneOf(store.corridor)}`);
  const afterText = next
    ? next.kind === 'arrive'
      ? t('dir.arrived')
      : stepHeadline(t, next)
    : null;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid slice">
          <Defs>
            <Pattern id="hatchDir" patternUnits="userSpaceOnUse" width={6} height={6}>
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
            const mx = s.x + s.width / 2;
            const my = s.y + s.height / 2;
            const isDest = onRouteFloor && s.id === store.id;
            const isLift = s.category === 'elevator';
            return (
              <G key={s.id}>
                <Rect
                  x={s.x}
                  y={s.y}
                  width={s.width}
                  height={s.height}
                  fill={rest ? 'url(#hatchDir)' : isDest ? '#D3D7DE' : '#F9F9F9'}
                  stroke={isLift ? BLUE : WALL}
                  strokeWidth={isLift ? 3 : 2.5}
                />
                {!rest && <StoreIcon category={s.category} x={mx} y={my - 10} />}
                {wrapLabel(s.name).map((line, i) => (
                  <SvgText
                    key={i}
                    x={mx}
                    y={rest ? my + i * 8 : my + 8 + i * 7.5}
                    fontSize={6.5}
                    fill={INK}
                    textAnchor="middle">
                    {line}
                  </SvgText>
                ))}
              </G>
            );
          })}

          {/* stairwell */}
          <Circle cx={STAIRS.x} cy={STAIRS.y} r={STAIRS.r} fill="#FFFFFF" stroke={BLUE} strokeWidth={3} />
          <G transform={`translate(${STAIRS.x}, ${STAIRS.y})`}>
            <Path
              d="M-8 7 H-3 V3 H1 V-1 H5 V-5 H8"
              fill="none"
              stroke={BLUE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>

          {onRouteFloor && done.length > 1 && (
            <Polyline
              points={pts(done)}
              fill="none"
              stroke={BLUE}
              strokeWidth={3}
              strokeOpacity={0.25}
              strokeDasharray={[8, 4, 2, 4]}
              strokeLinejoin="round"
            />
          )}
          {onRouteFloor && upcoming.length > 1 && (
            <Polyline
              points={pts([corners[current + 1], ...upcoming.slice(1)])}
              fill="none"
              stroke={BLUE}
              strokeWidth={3}
              strokeDasharray={[8, 4, 2, 4]}
              strokeLinejoin="round"
            />
          )}
          {onRouteFloor && now.length > 1 && (
            <Polyline
              points={pts(now)}
              fill="none"
              stroke={BLUE}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {onRouteFloor && (
            <G>
              <AnimatedCircle
                cx={position.x}
                cy={position.y}
                r={pulseR}
                fill={BLUE}
                opacity={pulseOpacity}
              />
              <G transform={`translate(${position.x}, ${position.y}) rotate(${heading})`}>
                <Path
                  d="M0 -11 L8 9 L0 4 L-8 9 Z"
                  fill={BLUE}
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
              </G>
            </G>
          )}
        </Svg>
      </View>

      <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          onPress={() => setActive(Math.min(current + 1, steps.length - 1))}
          style={styles.card}>
          <View style={styles.cardIcon}>
            <MaterialIcons name={STEP_ICON[step.kind]} size={44} color="#FFFFFF" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardMain} numberOfLines={1}>
              {stepHeadline(t, step)}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {sub}
            </Text>
            {afterText && (
              <Text style={styles.cardNext} numberOfLines={1}>
                {t('dir.next', { action: lowerFirst(afterText) })}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('dir.list')}
            hitSlop={10}
            onPress={() =>
              router.push({ pathname: '/directions-list', params: { to: destId, floor, from } })
            }
            style={styles.menu}>
            <MaterialIcons name="menu" size={24} color={INK} />
          </Pressable>
        </Pressable>
      </SafeAreaView>

      <View style={[styles.sideLeft, { top: insets.top + 150 }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: focus === 'stairs' }}
          onPress={() => setFocus((f) => (f === 'stairs' ? 'follow' : 'stairs'))}
          style={styles.facility}>
          <View style={[styles.facilityBtn, focus === 'stairs' && styles.facilityBtnOn]}>
            <MaterialIcons name="stairs" size={22} color={focus === 'stairs' ? '#FFFFFF' : BLUE} />
          </View>
          <Text style={styles.facilityLabel}>{t('dir.stairs')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: focus === 'elevator' }}
          onPress={() => setFocus((f) => (f === 'elevator' ? 'follow' : 'elevator'))}
          style={styles.facility}>
          <View style={[styles.facilityBtn, focus === 'elevator' && styles.facilityBtnOn]}>
            <MaterialIcons name="elevator" size={22} color={focus === 'elevator' ? '#FFFFFF' : BLUE} />
          </View>
          <Text style={styles.facilityLabel}>{t('dir.lift')}</Text>
        </Pressable>
      </View>

      <View style={[styles.sideRight, { top: insets.top + 150 }]} pointerEvents="box-none">
        <View style={styles.floorColumn}>
          {[...FLOORS].reverse().map((f) => {
            const on = f === viewFloor;
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t('map.floor', { floor: f })}
                onPress={() => {
                  setViewFloor(f);
                  setFocus('follow');
                }}
                style={[styles.floorItem, on && styles.floorItemOn]}>
                <Text style={[styles.floorText, on && styles.floorTextOn]}>{f}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomName} numberOfLines={1}>
            {store.name}
          </Text>
          <Text style={styles.bottomMeta}>
            {t('dir.time', { minutes: remainingMinutes, meters: remainingMeters })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.dismissTo({ pathname: '/map', params: { from, floor, ts: String(Date.now()) } })
          }
          hitSlop={8}>
          <Text style={styles.exit}>{t('dir.exit')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const shadow = {
  shadowColor: '#14213D',
  shadowOpacity: 0.14,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  card: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    ...shadow,
  },
  cardIcon: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
  },
  cardBody: { flex: 1, gap: 2 },
  cardMain: { fontSize: 22, fontWeight: '800', color: INK },
  cardSub: { fontSize: 14, color: MUTED },
  cardNext: { marginTop: 4, fontSize: 12, fontWeight: '600', color: MUTED },
  menu: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACTIVE_BG,
  },
  sideLeft: { position: 'absolute', left: 12, gap: 12 },
  facility: { alignItems: 'center', gap: 4 },
  facilityBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
  facilityBtnOn: { backgroundColor: BLUE, borderColor: BLUE },
  facilityLabel: { fontSize: 11, fontWeight: '700', color: INK },
  sideRight: { position: 'absolute', right: 12 },
  floorColumn: {
    padding: 4,
    gap: 4,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    ...shadow,
  },
  floorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorItemOn: { backgroundColor: BLUE },
  floorText: { fontSize: 13, fontWeight: '700', color: MUTED },
  floorTextOn: { color: '#FFFFFF' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  bottomInfo: { flex: 1 },
  bottomName: { fontSize: 16, fontWeight: '800', color: INK },
  bottomMeta: { fontSize: 13, color: MUTED, marginTop: 2 },
  exit: { fontSize: 15, fontWeight: '800', color: DANGER },
  emptyBack: { padding: 16 },
  empty: { padding: 24, textAlign: 'center', color: MUTED },
});
