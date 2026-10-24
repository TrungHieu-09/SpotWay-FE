import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAccessibilityMode } from '@/hooks/use-accessibility-mode';

const BLUE = '#1C4E9C';
const INK = '#14213D';
const MUTED = '#5B6B88';
const BORDER = '#E2E8F0';
const TINT = '#E0EDFF';
const BG = '#F8FAFC';

const BENEFITS: { icon: keyof typeof MaterialIcons.glyphMap; key: string }[] = [
  { icon: 'elevator', key: 'access.liftFirst' },
  { icon: 'accessible-forward', key: 'access.avoidSteps' },
  { icon: 'schedule', key: 'access.recalcTime' },
];

export default function AccessibilityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [enabled, setEnabled] = useAccessibilityMode();

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

        <Text style={styles.footnote}>{t('access.footnote')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
  listCard: {
    padding: 12,
    gap: 8,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
  footnote: { textAlign: 'center', paddingHorizontal: 16, fontSize: 13, color: MUTED },
});
