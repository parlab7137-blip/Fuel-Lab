import { Router, Request, Response } from 'express';
import type { CustomRecipeInput, MealType, Recipe } from '@fuellab/shared';
import { isHighProtein } from '@fuellab/shared';
import { newIdSafe } from '../util';
import { deleteCustomRecipe, getRecipe, insertCustomRecipe, listRecipes } from '../db';

const router = Router();

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
type SortKey = 'name' | 'protein' | 'calories';

router.get('/', async (req: Request, res: Response) => {
  const userId = req.currentUser.id;
  let recipes = await listRecipes(userId);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  if (search) {
    recipes = recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        (r.description ?? '').toLowerCase().includes(search) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(search)),
    );
  }
  const mealType = typeof req.query.mealType === 'string' ? req.query.mealType : '';
  if (MEAL_TYPES.includes(mealType as MealType)) {
    recipes = recipes.filter((r) => r.mealType === mealType);
  }
  if (req.query.highProtein === '1' || req.query.highProtein === 'true') {
    recipes = recipes.filter((r) => isHighProtein(r));
  }
  const sort = (typeof req.query.sort === 'string' ? req.query.sort : 'name') as SortKey;
  if (sort === 'protein') {
    recipes.sort((a, b) => (b.macros.protein ?? -1) - (a.macros.protein ?? -1));
  } else if (sort === 'calories') {
    recipes.sort((a, b) => (a.macros.calories ?? Number.MAX_SAFE_INTEGER) - (b.macros.calories ?? Number.MAX_SAFE_INTEGER));
  } else {
    recipes.sort((a, b) => a.name.localeCompare(b.name));
  }
  res.json({ recipes, total: recipes.length });
});

router.get('/:id', async (req: Request, res: Response) => {
  const recipe = await getRecipe(req.currentUser.id, String(req.params.id));
  if (!recipe) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  res.json({ recipe });
});

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.post('/', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Partial<CustomRecipeInput>;
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    res.status(400).json({ error: 'Recipe name is required' });
    return;
  }
  if (!body.mealType || !MEAL_TYPES.includes(body.mealType)) {
    res.status(400).json({ error: 'mealType must be breakfast, lunch, or dinner' });
    return;
  }
  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients
        .filter((i) => i && typeof i.name === 'string' && i.name.trim().length > 0)
        .map((i) => ({
          name: i.name.trim(),
          amount: numOrNull(i.amount),
          unit: typeof i.unit === 'string' && i.unit.trim() ? i.unit.trim() : null,
          section: typeof i.section === 'string' && i.section.trim() ? i.section.trim() : 'Other',
        }))
    : [];
  const recipe: Recipe = {
    id: newIdSafe(),
    name: body.name.trim(),
    mealType: body.mealType,
    baseServings: numOrNull(body.baseServings),
    yieldText: null,
    prepMinutes: numOrNull(body.prepMinutes),
    cookMinutes: numOrNull(body.cookMinutes),
    description: typeof body.description === 'string' ? body.description : null,
    sourceName: 'Yours',
    sourceUrl: null,
    instructions: typeof body.instructions === 'string' ? body.instructions : null,
    isCustom: true,
    macros: {
      calories: numOrNull(body.macros?.calories),
      protein: numOrNull(body.macros?.protein),
      carbs: numOrNull(body.macros?.carbs),
      fat: numOrNull(body.macros?.fat),
    },
    ingredients,
  };
  await insertCustomRecipe(req.currentUser.id, recipe);
  res.status(201).json({ recipe });
});

router.delete('/:id', async (req: Request, res: Response) => {
  const ok = await deleteCustomRecipe(req.currentUser.id, String(req.params.id));
  if (!ok) {
    res.status(404).json({ error: 'Custom recipe not found' });
    return;
  }
  res.json({ ok: true });
});

export default router;
