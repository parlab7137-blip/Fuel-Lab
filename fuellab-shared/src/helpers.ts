import type {
  DayLogEntry,
  DayTotals,
  Ingredient,
  Macros,
  MealType,
  Recipe,
  ShoppingGroup,
  ShoppingLine,
} from './types';

/** Store sections in shopping order — matches the Meal Prep Planner web app. */
export const STORE_SECTIONS: string[] = [
  'Produce',
  'Meat',
  'Dairy & eggs',
  'Bread & tortillas',
  'Grains',
  'Baking',
  'Canned & sauces',
  'Pantry',
  'Other',
];

export const HIGH_PROTEIN_MIN_GRAMS = 30;

export function isHighProtein(recipe: Pick<Recipe, 'macros'>): boolean {
  return recipe.macros.protein != null && recipe.macros.protein >= HIGH_PROTEIN_MIN_GRAMS;
}

/**
 * Planner badge rule carried over from the web planner:
 * breakfasts are the meal-prep items; lunch and dinner are planned and
 * shopped, but cooked fresh on the day.
 */
export function mealBadge(mealType: MealType): 'Meal prep' | 'Cook fresh day-of' {
  return mealType === 'breakfast' ? 'Meal prep' : 'Cook fresh day-of';
}

export function emptyTotals(): DayTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function addMacros(into: DayTotals, macros: Macros, servings: number): void {
  into.calories += (macros.calories ?? 0) * servings;
  into.protein += (macros.protein ?? 0) * servings;
  into.carbs += (macros.carbs ?? 0) * servings;
  into.fat += (macros.fat ?? 0) * servings;
}

/** Totals for a day log: per-serving macros × servings eaten, summed. */
export function dayTotals(entries: Pick<DayLogEntry, 'perServing' | 'servingsEaten'>[]): DayTotals {
  const totals = emptyTotals();
  for (const entry of entries) addMacros(totals, entry.perServing, entry.servingsEaten);
  return roundTotals(totals);
}

export function roundTotals(totals: DayTotals): DayTotals {
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(totals.calories),
    protein: r(totals.protein),
    carbs: r(totals.carbs),
    fat: r(totals.fat),
  };
}

/**
 * Scale factor for a planned recipe: planned servings ÷ the recipe's own
 * base servings. Recipes with unknown base servings (the artifact left one
 * null) are scaled 1:1 — flagged in the README.
 */
export function scaleFactor(recipe: Pick<Recipe, 'baseServings'>, plannedServings: number): number {
  if (!recipe.baseServings || recipe.baseServings <= 0) return 1;
  return plannedServings / recipe.baseServings;
}

export function scaledAmount(ingredient: Ingredient, factor: number): number | null {
  if (ingredient.amount == null) return null;
  return Math.round(ingredient.amount * factor * 100) / 100;
}

export interface PlanForShopping {
  recipe: Recipe;
  servings: number;
}

/**
 * Aggregate a week's plan into a shopping list: every ingredient scaled by
 * its plan item's servings, summed across recipes by name+unit+section,
 * grouped by store section in STORE_SECTIONS order.
 */
export function buildShoppingList(
  plan: PlanForShopping[],
  checkedKeys: Set<string> = new Set(),
): ShoppingGroup[] {
  const byKey = new Map<string, ShoppingLine & { amountKnown: boolean }>();
  for (const { recipe, servings } of plan) {
    const factor = scaleFactor(recipe, servings);
    for (const ingredient of recipe.ingredients) {
      const section = STORE_SECTIONS.includes(ingredient.section) ? ingredient.section : 'Other';
      const key = `${ingredient.name.trim().toLowerCase()}|${(ingredient.unit ?? '').toLowerCase()}|${section.toLowerCase()}`;
      const amount = scaledAmount(ingredient, factor);
      const existing = byKey.get(key);
      if (existing) {
        if (amount == null) existing.amountKnown = false;
        else if (existing.amount != null) existing.amount = Math.round((existing.amount + amount) * 100) / 100;
      } else {
        byKey.set(key, {
          key,
          name: ingredient.name,
          unit: ingredient.unit,
          amount,
          section,
          checked: checkedKeys.has(key),
          amountKnown: amount != null,
        });
      }
    }
  }
  const groups: ShoppingGroup[] = [];
  for (const section of STORE_SECTIONS) {
    const lines = [...byKey.values()]
      .filter((line) => line.section === section)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ amountKnown, ...line }) => ({ ...line, amount: amountKnown ? line.amount : null }));
    if (lines.length > 0) groups.push({ section, lines });
  }
  return groups;
}

/** Monday (YYYY-MM-DD) of the week containing `date` (YYYY-MM-DD). */
export function weekStartOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const delta = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
}

/** Day index (0 = Monday .. 6 = Sunday) of `date` within its week. */
export function dayIndexOf(date: string): number {
  const d = new Date(`${date}T12:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

/** Add `days` to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
