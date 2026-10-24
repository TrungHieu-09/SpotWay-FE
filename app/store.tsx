import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CURRENT_LOCATION_NODE,
  doorNodeId,
  FLOORS,
  getGraph,
  getStores,
  METERS_PER_UNIT,
  openingHours,
  zoneOf,
  type Floor,
  type StoreCategory,
} from '@/data/mock-floor';
import { findPath } from '@/data/pathfinding';
import { getStoreImage } from '@/data/store-images';

const BLUE = '#1C4E9C';
const INK = '#14213D';
const MUTED = '#5B6B88';
const BORDER = '#E4E8F0';
const SURFACE = '#F0F3FF';
const OPEN_BG = '#E7EEFF';
const OPEN_FG = '#244886';

const ICONS: Record<StoreCategory, keyof typeof MaterialIcons.glyphMap> = {
  fashion: 'checkroom',
  coffee: 'local-cafe',
  books: 'menu-book',
  food: 'restaurant',
  wc_male: 'wc',
  wc_female: 'wc',
  elevator: 'elevator',
  escalator: 'stairs',
  atm: 'atm',
  electronics: 'smartphone',
  beauty: 'spa',
  supermarket: 'shopping-cart',
  pharmacy: 'local-pharmacy',
  rest: 'event-seat',
};

export default function StoreDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, floor: floorParam, from } = useLocalSearchParams<{
    id?: string;
    floor?: string;
    from?: string;
  }>();
  const floor: Floor = FLOORS.includes(floorParam as Floor) ? (floorParam as Floor) : '1';

  const store = useMemo(() => getStores(floor).find((s) => s.id === id) ?? null, [floor, id]);
  const meters = useMemo(() => {
    if (!store) return null;
    const p = findPath(getGraph(floor), CURRENT_LOCATION_NODE, doorNodeId(store.id));
    return p ? Math.round(p.length * METERS_PER_UNIT) : null;
  }, [floor, store]);

  const goBack = () => router.back();

  if (!store) {
    return (
      <SafeAreaView style={styles.root}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.backFlat} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={INK} />
        </Pressable>
        <Text style={styles.empty}>{t('map.noResults')}</Text>
      </SafeAreaView>
    );
  }

  const icon = ICONS[store.category];
  const photo = getStoreImage(store);
  const category = t(`map.category.${store.category}`);
  const meta = [
    category,
    t('map.floor', { floor }),
    t(`store.zone.${zoneOf(store.corridor)}`),
    meters !== null ? `${meters}m` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={styles.hero}>
          {photo ? (
            <Image source={photo} contentFit="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <MaterialIcons name={icon} size={120} color="rgba(255,255,255,0.16)" />
          )}
          <View style={styles.heroShade} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('scan.back')}
            onPress={goBack}
            style={[styles.back, { top: insets.top + 12 }]}>
            <MaterialIcons name="arrow-back" size={22} color={INK} />
          </Pressable>
        </View>

        <View style={styles.logoWrap}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <MaterialIcons name={icon} size={28} color={BLUE} />
            </View>
          </View>
        </View>

        <View style={styles.block}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {store.name}
            </Text>
            <View style={styles.openBadge}>
              <View style={styles.openDot} />
              <Text style={styles.openText}>{t('store.open')}</Text>
            </View>
          </View>
          <Text style={styles.meta}>{meta}</Text>
        </View>

        <View style={[styles.block, styles.grid]}>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <MaterialIcons name="schedule" size={17} color={MUTED} />
              <Text style={styles.cardLabel}>{t('store.hours')}</Text>
            </View>
            <Text style={styles.cardValue}>{openingHours(store.category)}</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <MaterialIcons name="category" size={17} color={MUTED} />
              <Text style={styles.cardLabel}>{t('store.type')}</Text>
            </View>
            <Text style={styles.cardValue}>{category}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.desc}>{store.description}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.dismissTo({
              pathname: '/map',
              params: { from, dest: store.id, floor, ts: String(Date.now()) },
            })
          }
          style={styles.cta}>
          <MaterialIcons name="near-me" size={22} color="#FFFFFF" />
          <Text style={styles.ctaText}>{t('store.startDirections')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9F9FF' },
  hero: {
    height: 275,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    top: '55%',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  back: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  backFlat: { padding: 16 },
  logoWrap: { paddingHorizontal: 24 },
  logoOuter: {
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  logoInner: {
    flex: 1,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  block: { paddingHorizontal: 24, marginTop: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: INK },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: OPEN_BG,
  },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3C5D9D' },
  openText: { fontSize: 11, fontWeight: '800', color: OPEN_FG },
  meta: { fontSize: 14, color: '#434751', marginTop: 6 },
  grid: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: SURFACE },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardLabel: { fontSize: 11, fontWeight: '800', color: '#434751' },
  cardValue: { fontSize: 16, fontWeight: '800', color: INK },
  desc: { fontSize: 14, lineHeight: 22, color: '#434751' },
  empty: { padding: 24, textAlign: 'center', color: MUTED },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cta: {
    height: 56,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BLUE,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});
