import type { MealType } from '@fuellab/shared';

/** Shape of one seeded recipe, as extracted from the Meal Prep Planner artifact. */
export interface SeedIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
  section: string;
}

export interface SeedRecipe {
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
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  ingredients: SeedIngredient[];
}
