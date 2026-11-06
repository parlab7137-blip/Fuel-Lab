import { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { addDays, type TodayResponse, type WeekLogDay } from '@fuellab/shared';
import { api, todayLocal } from '../api';
import { colors, styles } from '../theme';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// react-native-svg ships with Expo Go; if it is unavailable in a custom
// build the ring degrades to the numeric totals below it.
function Ring({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <Svg width="140" height="140" viewBox="0 0 140 140">
      <Circle cx="70" cy="70" r={r} stroke="#e6ece6" strokeWidth="12" fill="none" />
      <Circle
        cx="70"
        cy="70"
        r={r}
        stroke={colors.green}
        strokeWidth="12"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <SvgText x="70" y="68" textAnchor="middle" fontSize="28" fontWeight="800" fill={colors.ink}>
        {Math.round(value)}
      </SvgText>
      <SvgText x="70" y="88" textAnchor="middle" fontSize="12" fill={colors.muted}>
        {`of ${target} kcal`}
      </SvgText>
    </Svg>
  );
}

function Bar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ width: 56, fontWeight: '700', fontSize: 13 }}>{label}</Text>
      <View style={{ flex: 1, height: 10, backgroundColor: '#e6ece6', borderRadius: 999, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.green }} />
      </View>
      <Text style={[styles.muted, { width: 86, textAlign: 'right', fontSize: 13 }]}>
        {Math.round(value * 10) / 10} / {target}g
      </Text>
    </View>
  );
}

export default function TodayScreen() {
  const [date, setDate] = useState(todayLocal());
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [week, setWeek] = useState<WeekLogDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quick, setQuick] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  const load = useCallback(() => {
    api
      .getToday(date)
      .then((t) => {
        setToday(t);
        api.getWeekLog(t.weekStart).then(({ days }) => setWeek(days)).catch(() => undefined);
      })
      .catch((e: Error) => setError(e.message));
  }, [date]);

  useFocusEffect(load);

  if (!today) {
    return (
      <View style={[styles.screen, { padding: 20 }]}>
        <Text style={styles.muted}>{error ?? 'Loading…'}</Text>
      </View>
    );
  }

  const confirm = async (planItemId: string) => {
    const res = await api.confirmPlanItem(date, planItemId);
    setToday(res.today);
    load();
  };
  const setServings = async (id: string, servings: number) => {
    const res = await api.setEntryServings(id, servings);
    setToday(res.today);
    load();
  };
  const removeEntry = async (id: string) => {
    await api.deleteEntry(id);
    load();
  };
  const quickAdd = async () => {
    try {
      const res = await api.quickAdd(
        date,
        quick.name,
        Number(quick.calories),
        Number(quick.protein),
        quick.carbs === '' ? null : Number(quick.carbs),
        quick.fat === '' ? null : Number(quick.fat),
      );
      setToday(res.today);
      setQuick({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => setDate(addDays(date, -1))}>
          <Text style={styles.buttonGhostText}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', flex: 1, textAlign: 'center' }}>{date === todayLocal() ? `Today · ${date}` : date}</Text>
        <TouchableOpacity style={styles.buttonGhost} onPress={() => setDate(addDays(date, 1))}>
          <Text style={styles.buttonGhostText}>→</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={[styles.card, { alignItems: 'center', gap: 12 }]}>
        <Ring value={today.totals.calories} target={today.targets.calories} />
        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          <Bar label="Protein" value={today.totals.protein} target={today.targets.protein} />
          <Bar label="Carbs" value={today.totals.carbs} target={today.targets.carbs} />
          <Bar label="Fat" value={today.totals.fat} target={today.targets.fat} />
        </View>
        <Text style={styles.muted}>{Math.max(0, today.targets.calories - today.totals.calories)} kcal left today</Text>
      </View>

      <Text style={styles.h2}>Planned for today</Text>
      {today.planned.length === 0 && <Text style={styles.muted}>Nothing planned — add meals in the Planner tab.</Text>}
      {today.planned.map(({ planItem, logEntryId }) => (
        <View key={planItem.id} style={styles.card}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={{ fontWeight: '600', flex: 1 }}>
              {planItem.recipe.name}
              {planItem.recipe.isCustom ? ' · Yours' : ''}
            </Text>
            {logEntryId ? (
              <Text style={[styles.badge, styles.badgeHp]}>✓ Logged</Text>
            ) : (
              <TouchableOpacity style={styles.button} onPress={() => confirm(planItem.id)}>
                <Text style={styles.buttonText}>Ate it ✓</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.muted}>
            {planItem.recipe.mealType} ·{' '}
            {planItem.recipe.macros.calories != null
              ? `${planItem.recipe.macros.calories} kcal · ${planItem.recipe.macros.protein ?? '—'}g protein per serving`
              : 'macros not listed'}
          </Text>
        </View>
      ))}

      <Text style={styles.h2}>Logged</Text>
      {today.entries.length === 0 && <Text style={styles.muted}>Nothing logged yet today.</Text>}
      {today.entries.map((entry) => (
        <View key={entry.id} style={styles.card}>
          <Text style={{ fontWeight: '600' }}>
            {entry.name}
            <Text style={styles.muted}>
              {' '}
              · {entry.perServing.calories != null ? `${Math.round((entry.perServing.calories ?? 0) * entry.servingsEaten)} kcal` : 'macros not listed'}
              {entry.kind === 'quick' ? ' · quick add' : ''}
            </Text>
          </Text>
          <View style={styles.row}>
            <Text style={styles.muted}>Servings:</Text>
            {[0.5, 1, 2].map((s) => (
              <TouchableOpacity key={s} style={styles.buttonGhost} onPress={() => setServings(entry.id, s)}>
                <Text style={styles.buttonGhostText}>{s === 0.5 ? '½×' : `${s}×`}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.muted}>{entry.servingsEaten}×</Text>
            <TouchableOpacity style={styles.buttonGhost} onPress={() => removeEntry(entry.id)}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={styles.h2}>Quick add (off-plan food)</Text>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="What did you eat?" value={quick.name} onChangeText={(v) => setQuick({ ...quick, name: v })} />
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Calories" keyboardType="numeric" value={quick.calories} onChangeText={(v) => setQuick({ ...quick, calories: v })} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Protein (g)" keyboardType="numeric" value={quick.protein} onChangeText={(v) => setQuick({ ...quick, protein: v })} />
        </View>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Carbs (g, optional)" keyboardType="numeric" value={quick.carbs} onChangeText={(v) => setQuick({ ...quick, carbs: v })} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Fat (g, optional)" keyboardType="numeric" value={quick.fat} onChangeText={(v) => setQuick({ ...quick, fat: v })} />
        </View>
        <TouchableOpacity style={styles.button} onPress={quickAdd}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.h2}>This week</Text>
      <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }]}>
        {week.map((day) => {
          const pct = today.targets.calories > 0 ? Math.min(100, (day.totals.calories / today.targets.calories) * 100) : 0;
          return (
            <TouchableOpacity key={day.date} style={{ alignItems: 'center', gap: 4 }} onPress={() => setDate(day.date)}>
              <Text style={styles.small}>{DAY_NAMES[day.dayIndex]}</Text>
              <View style={{ width: 18, height: 56, backgroundColor: '#e6ece6', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' }}>
                <View style={{ height: `${pct}%`, backgroundColor: day.date === date ? colors.greenDark : colors.green, width: '100%' }} />
              </View>
              <Text style={styles.small}>{day.totals.calories}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.muted, styles.small]}>Each bar is that day's logged calories against your {today.targets.calories} kcal target.</Text>
    </ScrollView>
  );
}
