import { useCallback, useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { isHighProtein, mealBadge, type Recipe } from '@fuellab/shared';
import { api } from '../api';
import { colors, styles } from '../theme';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
];

const SORTS = [
  { key: 'name', label: 'Name' },
  { key: 'protein', label: 'Most protein' },
  { key: 'calories', label: 'Fewest kcal' },
];

export function RecipeBadges({ recipe }: { recipe: Recipe }) {
  return (
    <View style={styles.row}>
      <Text style={styles.badge}>{recipe.mealType}</Text>
      <Text style={[styles.badge, styles.badgeSubtle]}>{mealBadge(recipe.mealType)}</Text>
      {recipe.isCustom && <Text style={[styles.badge, styles.badgeYours]}>Yours</Text>}
      {isHighProtein(recipe) && <Text style={[styles.badge, styles.badgeHp]}>High protein</Text>}
    </View>
  );
}

export function macroLine(recipe: Recipe): string {
  if (recipe.macros.calories == null) return 'macros not listed';
  return `${recipe.macros.calories} kcal · ${recipe.macros.protein ?? '—'}g protein · ${recipe.macros.carbs ?? '—'}g carbs · ${recipe.macros.fat ?? '—'}g fat`;
}

export function RecipesScreen({ navigation }: { navigation: any }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState('');
  const [highProtein, setHighProtein] = useState(false);
  const [sort, setSort] = useState('name');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listRecipes({ search, mealType, highProtein, sort })
      .then(({ recipes: list }) => setRecipes(list))
      .catch((e: Error) => setError(e.message));
  }, [search, mealType, highProtein, sort]);

  useFocusEffect(load);

  return (
    <View style={styles.screen}>
      <View style={{ padding: 16, gap: 10 }}>
        <TextInput style={styles.input} placeholder="Search recipes or ingredients…" value={search} onChangeText={setSearch} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f.key} style={[styles.chip, mealType === f.key && styles.chipActive]} onPress={() => setMealType(f.key)}>
                <Text style={[styles.chipText, mealType === f.key && styles.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.chip, highProtein && styles.chipActive]} onPress={() => setHighProtein(!highProtein)}>
              <Text style={[styles.chipText, highProtein && styles.chipTextActive]}>30g+ protein</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.row}>
          {SORTS.map((s) => (
            <TouchableOpacity key={s.key} style={[styles.chip, sort === s.key && styles.chipActive]} onPress={() => setSort(s.key)}>
              <Text style={[styles.chipText, sort === s.key && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('AddRecipe')}>
            <Text style={styles.buttonText}>+ Add your own</Text>
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.muted}>{recipes.length} recipes</Text>
      </View>
      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <RecipeBadges recipe={item} />
            <Text style={styles.muted}>{macroLine(item)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export function RecipeDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const recipe = route.params.recipe as Recipe;
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    try {
      await api.deleteRecipe(recipe.id);
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>{recipe.name}</Text>
      <RecipeBadges recipe={recipe} />
      {recipe.yieldText && <Text style={styles.muted}>Makes {recipe.yieldText}</Text>}
      {recipe.description && <Text>{recipe.description}</Text>}
      <Text style={{ fontWeight: '600' }}>{macroLine(recipe)} (per serving)</Text>
      <Text style={styles.h2}>Ingredients{recipe.baseServings ? ` (for ${recipe.baseServings} servings)` : ''}</Text>
      {recipe.ingredients.map((ing, i) => (
        <Text key={i}>
          • {ing.amount != null ? `${ing.amount} ` : ''}
          {ing.unit ? `${ing.unit} ` : ''}
          {ing.name}
        </Text>
      ))}
      <Text style={styles.h2}>Method</Text>
      {recipe.instructions ? (
        recipe.instructions
          .split('\n')
          .filter((s) => s.trim())
          .map((step, i) => <Text key={i}>{`${i + 1}. ${step}`}</Text>)
      ) : (
        <Text style={styles.muted}>No written steps in the box for this one — it links out to the original video.</Text>
      )}
      {recipe.sourceName && <Text style={styles.muted}>Source: {recipe.sourceName}{recipe.sourceUrl ? ` — ${recipe.sourceUrl}` : ''}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {recipe.isCustom && (
        <TouchableOpacity style={[styles.buttonGhost, { borderColor: colors.danger }]} onPress={remove}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete this recipe</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
