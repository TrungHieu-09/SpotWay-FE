import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FLOORS, getStores, type StoreCategory } from '@/data/mock-floor';

const BLUE = '#1C4E9C';
const INK = '#14213D';
const MUTED = '#5B6B88';
const BORDER = '#E4E8F0';

type Group =
  | 'all'
  | 'coffee'
  | 'fashion'
  | 'books'
  | 'food'
  | 'electronics'
  | 'beauty'
  | 'supermarket'
  | 'pharmacy'
  | 'wc'
  | 'atm'
  | 'lift';

const GROUPS: Record<Group, StoreCategory[] | null> = {
  all: null,
  coffee: ['coffee'],
  fashion: ['fashion'],
  books: ['books'],
  food: ['food'],
  electronics: ['electronics'],
  beauty: ['beauty'],
  supermarket: ['supermarket'],
  pharmacy: ['pharmacy'],
  wc: ['wc_male', 'wc_female'],
  atm: ['atm'],
  lift: ['elevator', 'escalator'],
};

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

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowed = GROUPS[group];
    return FLOORS.flatMap((floor) =>
      getStores(floor)
        .filter((s) => s.category !== 'rest')
        .filter((s) => !allowed || allowed.includes(s.category))
        .filter(
          (s) =>
            !q ||
            s.name.toLowerCase().includes(q) ||
            t(`map.category.${s.category}`).toLowerCase().includes(q),
        )
        .map((s) => ({ ...s, floor })),
    );
  }, [query, group, t]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('scan.back')}
          hitSlop={8}
          onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={INK} />
        </Pressable>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder={t('map.searchPlaceholder')}
          placeholderTextColor={MUTED}
          style={styles.input}
        />
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {(Object.keys(GROUPS) as Group[]).map((g) => {
            const active = g === group;
            return (
              <Pressable
                key={g}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setGroup(g)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(`map.category.${g}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(s) => `${s.floor}:${s.id}`}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>{t('map.noResults')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/store',
                params: { id: item.id, floor: item.floor, from },
              })
            }>
            <View style={styles.rowIcon}>
              <MaterialIcons name={ICONS[item.category]} size={20} color={BLUE} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowText} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {t(`map.category.${item.category}`)}
              </Text>
            </View>
            <Text style={styles.rowFloor}>{t('map.floor', { floor: item.floor })}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  input: { flex: 1, height: 40, fontSize: 15, color: INK },
  chipsWrap: { borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 10 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: BLUE, borderColor: BLUE },
  chipText: { fontSize: 13, fontWeight: '600', color: INK },
  chipTextActive: { color: '#FFFFFF' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EDF8',
  },
  rowBody: { flex: 1 },
  rowText: { fontSize: 15, fontWeight: '600', color: INK },
  rowMeta: { fontSize: 13, color: MUTED, marginTop: 2 },
  rowFloor: { fontSize: 13, color: MUTED },
  empty: { padding: 24, textAlign: 'center', color: MUTED },
});
