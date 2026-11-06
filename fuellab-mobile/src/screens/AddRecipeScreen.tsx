import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { STORE_SECTIONS, type MealType } from '@fuellab/shared';
import { api } from '../api';
import { styles } from '../theme';

interface Row {
  name: string;
  amount: string;
  unit: string;
  section: string;
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

export default function AddRecipeScreen({ navigation }: { navigation: any }) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [baseServings, setBaseServings] = useState('2');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [cookMinutes, setCookMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [rows, setRows] = useState<Row[]>([{ name: '', amount: '', unit: '', section: 'Produce' }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.createRecipe({
        name,
        mealType,
        baseServings: num(baseServings),
        prepMinutes: num(prepMinutes),
        cookMinutes: num(cookMinutes),
        description: description || null,
        instructions: instructions || null,
        macros: { calories: num(calories), protein: num(protein), carbs: num(carbs), fat: num(fat) },
        ingredients: rows
          .filter((r) => r.name.trim())
          .map((r) => ({ name: r.name.trim(), amount: num(r.amount), unit: r.unit.trim() || null, section: r.section })),
      });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const cycleSection = (i: number) => {
    const next = (STORE_SECTIONS.indexOf(rows[i].section) + 1) % STORE_SECTIONS.length;
    setRows(rows.map((r, j) => (j === i ? { ...r, section: STORE_SECTIONS[next] } : r)));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Grandma's chicken soup" />
      <Text style={styles.label}>Meal type</Text>
      <View style={styles.row}>
        {MEAL_TYPES.map((t) => (
          <TouchableOpacity key={t} style={[styles.chip, mealType === t && styles.chipActive]} onPress={() => setMealType(t)}>
            <Text style={[styles.chipText, mealType === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>Servings it makes</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={baseServings} onChangeText={setBaseServings} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>Prep (min)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={prepMinutes} onChangeText={setPrepMinutes} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>Cook (min)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={cookMinutes} onChangeText={setCookMinutes} />
        </View>
      </View>
      <Text style={styles.label}>Description (optional)</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} />
      <Text style={styles.label}>Per-serving macros (optional)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Calories" keyboardType="numeric" value={calories} onChangeText={setCalories} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Protein" keyboardType="numeric" value={protein} onChangeText={setProtein} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Carbs" keyboardType="numeric" value={carbs} onChangeText={setCarbs} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Fat" keyboardType="numeric" value={fat} onChangeText={setFat} />
      </View>
      <Text style={styles.label}>Ingredients</Text>
      {rows.map((row, i) => (
        <View key={i} style={[styles.card, { gap: 8 }]}>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Amount" keyboardType="numeric" value={row.amount} onChangeText={(v) => setRows(rows.map((r, j) => (j === i ? { ...r, amount: v } : r)))} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Unit" value={row.unit} onChangeText={(v) => setRows(rows.map((r, j) => (j === i ? { ...r, unit: v } : r)))} />
          </View>
          <TextInput style={styles.input} placeholder="Ingredient" value={row.name} onChangeText={(v) => setRows(rows.map((r, j) => (j === i ? { ...r, name: v } : r)))} />
          <View style={styles.row}>
            <Text style={styles.muted}>Store section:</Text>
            <TouchableOpacity style={styles.chip} onPress={() => cycleSection(i)}>
              <Text style={styles.chipText}>{row.section} (tap to change)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRows(rows.filter((_, j) => j !== i))}>
              <Text style={styles.error}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.buttonGhost} onPress={() => setRows([...rows, { name: '', amount: '', unit: '', section: 'Other' }])}>
        <Text style={styles.buttonGhostText}>+ Ingredient</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Steps (one per line)</Text>
      <TextInput style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]} multiline value={instructions} onChangeText={setInstructions} placeholder={'Chop the onion.\nBrown the meat…'} />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save recipe'}</Text>
      </TouchableOpacity>
      <View style={{ height: 8 }} />
      <Text style={[styles.muted, styles.small]}>Sections cycle through: {STORE_SECTIONS.join(' · ')}</Text>
    </ScrollView>
  );
}
