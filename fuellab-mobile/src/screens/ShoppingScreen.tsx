import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addDays, weekStartOf, type ShoppingGroup } from '@fuellab/shared';
import { api, todayLocal } from '../api';
import { styles } from '../theme';

export default function ShoppingScreen() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocal()));
  const [groups, setGroups] = useState<ShoppingGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getShopping(weekStart).then(({ groups: g }) => setGroups(g)).catch((e: Error) => setError(e.message));
  }, [weekStart]);

  useFocusEffect(load);

  const toggle = async (key: string, checked: boolean) => {
    setGroups((prev) => prev.map((g) => ({ ...g, lines: g.lines.map((l) => (l.key === key ? { ...l, checked } : l)) })));
    try {
      await api.setShoppingCheck(weekStart, key, checked);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const total = groups.reduce((n, g) => n + g.lines.length, 0);
  const done = groups.reduce((n, g) => n + g.lines.filter((l) => l.checked).length, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => setWeekStart(addDays(weekStart, -7))}>
          <Text style={styles.buttonGhostText}>← Prev</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', flex: 1, textAlign: 'center' }}>Week of {weekStart}</Text>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => setWeekStart(addDays(weekStart, 7))}>
          <Text style={styles.buttonGhostText}>Next →</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.muted}>{total === 0 ? 'Nothing planned this week yet' : `${done}/${total} picked up`}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {groups.map((group) => (
        <View key={group.section} style={styles.card}>
          <Text style={styles.cardTitle}>{group.section}</Text>
          {group.lines.map((line) => (
            <TouchableOpacity key={line.key} style={styles.row} onPress={() => toggle(line.key, !line.checked)}>
              <Text style={{ fontSize: 18 }}>{line.checked ? '☑' : '☐'}</Text>
              <Text style={line.checked ? { textDecorationLine: 'line-through', color: '#6b7670', flex: 1 } : { flex: 1 }}>
                {line.amount != null ? `${line.amount} ` : ''}
                {line.unit ? `${line.unit} ` : ''}
                {line.name}
                {line.amount == null ? ' (amount varies)' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
