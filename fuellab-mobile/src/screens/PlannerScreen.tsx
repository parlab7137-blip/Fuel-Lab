import { useCallback, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addDays, mealBadge, weekStartOf, type MealType, type PlanItem, type Recipe } from '@fuellab/shared';
import { api, todayLocal } from '../api';
import { colors, styles } from '../theme';
import { macroLine } from './RecipesScreen';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner'];

export default function PlannerScreen() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocal()));
  const [items, setItems] = useState<PlanItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [householdSize, setHouseholdSize] = useState(2);
  const [picker, setPicker] = useState<{ dayIndex: number; mealType: MealType } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getPlan(weekStart).then(({ items: list }) => setItems(list)).catch((e: Error) => setError(e.message));
  }, [weekStart]);

  useFocusEffect(load);
  useFocusEffect(
    useCallback(() => {
      api.listRecipes().then(({ recipes: list }) => setRecipes(list)).catch(() => undefined);
      api.getSettings().then(({ settings }) => setHouseholdSize(settings.householdSize)).catch(() => undefined);
    }, []),
  );

  const add = async (recipeId: string) => {
    if (!picker) return;
    try {
      await api.addPlanItem(weekStart, picker.dayIndex, recipeId, householdSize);
      setPicker(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    await api.removePlanItem(id);
    load();
  };

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
      <Text style={styles.muted}>New meals default to {householdSize} servings (household size). Breakfasts are meal-prep; lunch &amp; dinner are cooked fresh day-of.</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {DAYS.map((day, dayIndex) => (
        <View key={day} style={styles.card}>
          <Text style={styles.cardTitle}>
            {day} <Text style={styles.muted}>{addDays(weekStart, dayIndex).slice(5)}</Text>
          </Text>
          {SLOTS.map((slot) => (
            <View key={slot} style={{ gap: 6, marginTop: 6 }}>
              <View style={styles.row}>
                <Text style={{ fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{slot}</Text>
                <Text style={[styles.badge, styles.badgeSubtle]}>{mealBadge(slot)}</Text>
              </View>
              {items
                .filter((i) => i.dayIndex === dayIndex && i.recipe.mealType === slot)
                .map((item) => (
                  <View key={item.id} style={[styles.row, { justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: 8, padding: 8 }]}>
                    <Text style={{ fontWeight: '600', flex: 1 }}>
                      {item.recipe.name}
                      {item.recipe.isCustom ? ' · Yours' : ''} <Text style={styles.muted}>×{item.servings}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => remove(item.id)}>
                      <Text style={{ color: colors.danger, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              <TouchableOpacity style={[styles.buttonGhost, { borderStyle: 'dashed' }]} onPress={() => setPicker({ dayIndex, mealType: slot })}>
                <Text style={styles.muted}>+ Add {slot}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}

      <Modal visible={picker != null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.h1}>
              Add {picker?.mealType} — {picker ? DAYS[picker.dayIndex] : ''}
            </Text>
            <TouchableOpacity style={styles.buttonGhost} onPress={() => setPicker(null)}>
              <Text style={styles.buttonGhostText}>Close</Text>
            </TouchableOpacity>
          </View>
          {recipes
            .filter((r) => picker && r.mealType === picker.mealType)
            .map((r) => (
              <TouchableOpacity key={r.id} style={styles.card} onPress={() => add(r.id)}>
                <Text style={styles.cardTitle}>
                  {r.name}
                  {r.isCustom ? ' · Yours' : ''}
                </Text>
                <Text style={styles.muted}>{macroLine(r)}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}
