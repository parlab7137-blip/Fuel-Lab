export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface Macros {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface Ingredient {
  name: string;
  amount: number | null;
  unit: string | null;
  section: string;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: MealType;
  baseServings: number | null;
  yieldText: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  description: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  instructions: string | null;
  /** True for user-added recipes ("Yours"); false for the seeded box. */
  isCustom: boolean;
  macros: Macros;
  ingredients: Ingredient[];
}

export interface RecipeSummary {
  id: string;
  name: string;
  mealType: MealType;
  isCustom: boolean;
  macros: Macros;
  prepMinutes: number | null;
  cookMinutes: number | null;
}

export interface PlanItem {
  id: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  dayIndex: number; // 0 = Monday .. 6 = Sunday
  recipeId: string;
  servings: number;
  recipe: RecipeSummary;
}

export type LogKind = 'plan' | 'quick';

export interface DayLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: LogKind;
  planItemId: string | null;
  recipeId: string | null;
  name: string;
  /** Servings of the recipe actually eaten (1 = one serving). */
  servingsEaten: number;
  /** Per-serving macros snapshot at log time. */
  perServing: Macros;
}

export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Settings {
  householdSize: number;
  targets: Targets;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface ShoppingLine {
  /** Stable key used for check-off state: name|unit|section, lowercased. */
  key: string;
  name: string;
  unit: string | null;
  /** Summed amount across the week (null when any contributing amount is unknown). */
  amount: number | null;
  section: string;
  checked: boolean;
}

export interface ShoppingGroup {
  section: string;
  lines: ShoppingLine[];
}

export interface TodayPlanMeal {
  planItem: PlanItem;
  /** Existing log entry created from this plan item, if the user confirmed it. */
  logEntryId: string | null;
}

export interface TodayResponse {
  date: string;
  weekStart: string;
  dayIndex: number;
  planned: TodayPlanMeal[];
  entries: DayLogEntry[];
  totals: DayTotals;
  targets: Targets;
}

export interface WeekLogDay {
  date: string;
  dayIndex: number;
  totals: DayTotals;
}

export interface CustomRecipeInput {
  name: string;
  mealType: MealType;
  baseServings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  description: string | null;
  instructions: string | null;
  macros: Macros;
  ingredients: Ingredient[];
}
