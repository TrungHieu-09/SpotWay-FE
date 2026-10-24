import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FLOORS, WALK_SPEED_MPS, type Floor } from '@/data/mock-floor';
import { planRoute, stepSummary, type StepKind } from '@/data/route-steps';
import { useActiveStep } from '@/hooks/use-active-step';

const BLUE = '#1C4E9C';
const INK = '#14213D';
const MUTED = '#5B6B88';
const BORDER = '#E4E8F0';
const BG = '#F5F7FB';
const ACTIVE_BG = '#E6EDF8';

const STEP_ICON: Record<StepKind, keyof typeof MaterialIcons.glyphMap> = {
  straight: 'arrow-upward',
  left: 'turn-left',
  right: 'turn-right',
  arrive: 'flag',
};

export default function DirectionsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { to, floor: floorParam, from } = useLocalSearchParams<{
    to?: string;
    floor?: string;
    from?: string;
  }>();
  const destId = to ?? '';
  const floor: Floor = FLOORS.includes(floorParam as Floor) ? (floorParam as Floor) : '1';

  const plan = useMemo(() => planRoute(floor, destId), [floor, destId]);
  const [active, setActive] = useActiveStep(`${floor}:${destId}`);

  const goToMap = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/directions', params: { to: destId, floor, from } });
  };

  if (!plan) {
    return (
      <SafeAreaView style={styles.root}>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={goToMap} style={styles.emptyBack}>
          <MaterialIcons name="arrow-back" size={24} color={INK} />
        </Pressable>
        <Text style={styles.empty}>{t('nav.noRoute')}</Text>
      </SafeAreaView>
    );
  }

  const { store, route } = plan;
  const { steps } = route;
  const current = Math.min(active, steps.length - 1);
  const totalMeters = steps.reduce((sum, s) => sum + s.meters, 0);
  const minutes = Math.max(1, Math.ceil(totalMeters / WALK_SPEED_MPS / 60));

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('scan.back')}
          hitSlop={8}
          onPress={goToMap}
          style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={INK} />
        </Pressable>
        <View style={styles.topTitle}>
          <Text style={styles.title} numberOfLines={1}>
            {store.name}
          </Text>
          <Text style={styles.subtitle}>{t('dir.time', { minutes, meters: totalMeters })}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dir.mapBack')}
          hitSlop={8}
          onPress={goToMap}
          style={styles.iconBtn}>
          <MaterialIcons name="map" size={22} color={BLUE} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {steps.map((s, i) => {
          const state = i < current ? 'past' : i === current ? 'active' : 'next';
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: state === 'active' }}
              onPress={() => {
                setActive(i);
                goToMap();
              }}
              style={[
                styles.row,
                state === 'active' && styles.rowActive,
                state === 'past' && styles.rowPast,
              ]}>
              <View
                style={[
                  styles.stepIcon,
                  state === 'active' && styles.stepIconActive,
                  state === 'next' && styles.stepIconNext,
                  state === 'past' && styles.stepIconPast,
                ]}>
                <MaterialIcons
                  name={STEP_ICON[s.kind]}
                  size={state === 'past' ? 18 : 22}
                  color={state === 'active' ? '#FFFFFF' : state === 'past' ? '#A8B3C7' : BLUE}
                />
              </View>
              <Text
                style={[
                  styles.stepText,
                  state === 'active' && styles.stepTextActive,
                  state === 'past' && styles.stepTextPast,
                ]}
                numberOfLines={2}>
                {stepSummary(t, s, store.name)}
              </Text>
              {s.meters > 0 && (
                <Text style={[styles.meters, state === 'past' && styles.stepTextPast]}>
                  {s.meters}m
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: INK },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  list: { padding: 16, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowActive: { backgroundColor: ACTIVE_BG, borderColor: BLUE, borderWidth: 1.5 },
  rowPast: { paddingVertical: 6, backgroundColor: 'transparent', borderColor: 'transparent' },
  stepIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepIconActive: { backgroundColor: BLUE },
  stepIconNext: { borderWidth: 1.5, borderColor: BLUE, backgroundColor: '#FFFFFF' },
  stepIconPast: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#D5DBE6' },
  stepText: { flex: 1, fontSize: 15, fontWeight: '500', color: INK },
  stepTextActive: { fontWeight: '800' },
  stepTextPast: { color: '#A8B3C7' },
  meters: { fontSize: 13, fontWeight: '600', color: MUTED },
  emptyBack: { padding: 16 },
  empty: { padding: 24, textAlign: 'center', color: MUTED },
});
