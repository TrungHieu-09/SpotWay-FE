import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/scaled-text';
import {
  FLOORS,
  HAZARD_TYPES,
  HAZARD_ZONE_NAMES,
  type HazardZone,
} from '@/data/mock-floor';
import {
  useAccessibilityMode,
  useHighContrast,
  useTextSize,
  useThemeMode,
  type TextSize,
  type ThemeMode,
} from '@/hooks/use-accessibility-mode';
import { useIncident } from '@/hooks/use-incident';

import { useColors, type Colors } from '@/hooks/use-colors';
const DANGER = '#D64545';

const TEXT_SIZES: TextSize[] = ['small', 'medium', 'large'];
const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

const BENEFITS: { icon: keyof typeof MaterialIcons.glyphMap; key: string }[] = [
  { icon: 'elevator', key: 'access.liftFirst' },
  { icon: 'accessible-forward', key: 'access.avoidSteps' },
  { icon: 'schedule', key: 'access.recalcTime' },
];

export default function AccessibilityScreen() {
  const colors = useColors();
  const { BLUE, INK } = colors;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const router = useRouter();
  const [enabled, setEnabled] = useAccessibilityMode();
  const [incident, setIncident] = useIncident();
  const [demoOpen, setDemoOpen] = useState(false);
  const [draft, setDraft] = useState<HazardZone>(
    incident ?? { floor: '3', zone: 'west', type: 'fire' },
  );
  const [textSize, setTextSize] = useTextSize();
  const [highContrast, setHighContrast] = useHighContrast();
  const [themeMode, setThemeMode] = useThemeMode();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('scan.back')}
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.back}>
          <MaterialIcons name="arrow-back-ios-new" size={22} color={INK} />
        </Pressable>
        <Text style={styles.title}>{t('access.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="accessible" size={24} color={BLUE} />
              </View>
              <Text style={styles.toggleText}>{t('access.priority')}</Text>
            </View>
            <Switch
              accessibilityLabel={t('access.priority')}
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#CBD5E1', true: BLUE }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.desc}>{t('access.priorityDesc')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.toggleText}>{t('access.textSize')}</Text>
          <View style={styles.sizeRow}>
            {TEXT_SIZES.map((size) => (
              <Pressable
                key={size}
                accessibilityRole="button"
                accessibilityState={{ selected: textSize === size }}
                onPress={() => setTextSize(size)}
                style={[styles.sizeBtn, textSize === size && styles.sizeBtnOn]}>
                <Text style={[styles.sizeText, textSize === size && { color: '#FFFFFF' }]}>
                  {t(`access.size.${size}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="contrast" size={24} color={BLUE} />
              </View>
              <Text style={styles.toggleText}>{t('access.highContrast')}</Text>
            </View>
            <Switch
              accessibilityLabel={t('access.highContrast')}
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: '#CBD5E1', true: BLUE }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.desc}>{t('access.highContrastDesc')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.toggleText}>{t('access.theme')}</Text>
          <View style={styles.sizeRow}>
            {THEME_MODES.map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: themeMode === mode }}
                onPress={() => setThemeMode(mode)}
                style={[styles.sizeBtn, themeMode === mode && styles.sizeBtnOn]}>
                <Text style={[styles.sizeText, themeMode === mode && { color: '#FFFFFF' }]}>
                  {t(`access.theme.${mode}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.listCard}>
          {BENEFITS.map((b) => (
            <View key={b.key} style={styles.benefit}>
              <View style={styles.benefitLeft}>
                <View style={styles.iconSquare}>
                  <MaterialIcons name={b.icon} size={20} color={BLUE} />
                </View>
                <Text style={styles.benefitText}>{t(b.key)}</Text>
              </View>
              <View style={styles.check}>
                <MaterialIcons name="check" size={16} color={BLUE} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>{t('evac.demoTitle')}</Text>
          <Text style={styles.desc}>{t('evac.demoDesc')}</Text>
          {incident && (
            <Text style={styles.demoStatus}>
              {t('evac.banner', {
                type: t(`hazard.type.${incident.type}`),
                floor: incident.floor,
                zone: t(`hazard.zone.${incident.zone}`),
              })}
            </Text>
          )}
          <Pressable accessibilityRole="button" onPress={() => setDemoOpen(true)} style={styles.demoBtn}>
            <Text style={styles.demoBtnText}>{t('evac.demoOpen')}</Text>
          </Pressable>
        </View>

        <Modal visible={demoOpen} transparent animationType="fade" onRequestClose={() => setDemoOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setDemoOpen(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.demoTitle}>{t('evac.demoTitle')}</Text>
              <Text style={styles.desc}>{t('evac.demoDesc')}</Text>

              <Text style={styles.modalLabel}>{t('evac.demoFloor')}</Text>
              <View style={styles.demoFloors}>
                {FLOORS.map((f) => (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.floor === f }}
                onPress={() => setDraft({ ...draft, floor: f })}
                style={[styles.demoFloor, draft.floor === f && styles.demoFloorOn]}>
                <Text style={[styles.demoFloorText, draft.floor === f && { color: '#FFFFFF' }]}>{f}</Text>
              </Pressable>
                ))}
              </View>

              <Text style={styles.modalLabel}>{t('evac.demoZone')}</Text>
              <View style={styles.demoFloors}>
                {HAZARD_ZONE_NAMES.map((z) => (
              <Pressable
                key={z}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.zone === z }}
                onPress={() => setDraft({ ...draft, zone: z })}
                style={[styles.demoFloor, draft.zone === z && styles.demoFloorOn]}>
                <Text style={[styles.demoFloorText, draft.zone === z && { color: '#FFFFFF' }]}>{t(`hazard.zone.${z}`)}</Text>
              </Pressable>
                ))}
              </View>

              <Text style={styles.modalLabel}>{t('evac.demoType')}</Text>
              <View style={styles.demoFloors}>
                {HAZARD_TYPES.map((ty) => (
              <Pressable
                key={ty}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.type === ty }}
                onPress={() => setDraft({ ...draft, type: ty })}
                style={[styles.demoFloor, draft.type === ty && styles.demoFloorOn]}>
                <Text style={[styles.demoFloorText, draft.type === ty && { color: '#FFFFFF' }]}>{t(`hazard.type.${ty}`)}</Text>
              </Pressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setIncident(null);
                    setDemoOpen(false);
                  }}>
                  <Text style={styles.demoOff}>{t('evac.demoOff')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setIncident(draft);
                    setDemoOpen(false);
                  }}
                  style={styles.demoBtn}>
                  <Text style={styles.demoBtnText}>{t('evac.demoOn')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Text style={styles.footnote}>{t('access.footnote')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = ({ BLUE, INK, MUTED, BORDER, TINT, BG, CARD }: Colors) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    paddingRight: 40,
    fontSize: 17,
    fontWeight: '700',
    color: INK,
  },
  content: { padding: 16 },
  card: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  toggleLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TINT,
  },
  toggleText: { flex: 1, fontSize: 16, fontWeight: '700', color: INK },
  desc: { marginTop: 12, paddingLeft: 4, fontSize: 14, lineHeight: 22, color: MUTED },
  sizeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sizeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TINT,
  },
  sizeBtnOn: { backgroundColor: BLUE },
  sizeText: { fontSize: 14, fontWeight: '700', color: BLUE },
  listCard: {
    padding: 12,
    gap: 8,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: BG,
  },
  benefitLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TINT,
  },
  benefitText: { flex: 1, fontSize: 14, fontWeight: '500', color: INK },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TINT,
  },
  demoCard: {
    padding: 20,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: DANGER,
  },
  demoTitle: { fontSize: 16, fontWeight: '700', color: DANGER },
  demoFloors: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  demoFloor: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DANGER,
  },
  demoFloorOn: { backgroundColor: DANGER },
  demoFloorText: { fontSize: 14, fontWeight: '700', color: DANGER },
  demoStatus: { marginTop: 12, fontSize: 14, fontWeight: '700', color: DANGER },
  demoBtn: {
    marginTop: 14,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: DANGER,
  },
  demoBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(20,33,61,0.4)' },
  modalCard: { padding: 20, borderRadius: 20, backgroundColor: CARD },
  modalLabel: { marginTop: 16, fontSize: 13, fontWeight: '700', color: INK },
  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  demoOff: { marginTop: 14, fontSize: 14, fontWeight: '700', color: MUTED },
  footnote: { textAlign: 'center', paddingHorizontal: 16, fontSize: 13, color: MUTED },
});
