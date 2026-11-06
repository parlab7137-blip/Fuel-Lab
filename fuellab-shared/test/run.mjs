// Dependency-free checks for @fuellab/shared helpers. Run: npm run build && npm test
import assert from 'node:assert';
import { buildShoppingList, dayTotals, isHighProtein, mealBadge, scaleFactor, weekStartOf, dayIndexOf } from '../dist/index.js';

// meal badge rule
assert.equal(mealBadge('breakfast'), 'Meal prep');
assert.equal(mealBadge('lunch'), 'Cook fresh day-of');
assert.equal(mealBadge('dinner'), 'Cook fresh day-of');

// high protein filter (30g+)
assert.equal(isHighProtein({ macros: { calories: 430, protein: 45, carbs: 22, fat: 18 } }), true);
assert.equal(isHighProtein({ macros: { calories: 300, protein: 12, carbs: 40, fat: 9 } }), false);
assert.equal(isHighProtein({ macros: { calories: null, protein: null, carbs: null, fat: null } }), false);

// scale factor
assert.equal(scaleFactor({ baseServings: 12 }, 2), 2 / 12);
assert.equal(scaleFactor({ baseServings: null }, 2), 1);

// day totals: 430 kcal/45p per serving x 1 + quick add snapshot 200/10 x 1
const totals = dayTotals([
  { perServing: { calories: 430, protein: 45, carbs: 22, fat: 18 }, servingsEaten: 1 },
  { perServing: { calories: 200, protein: 10, carbs: 5, fat: 2 }, servingsEaten: 1 },
  { perServing: { calories: 100, protein: 5, carbs: 0, fat: 0 }, servingsEaten: 0.5 },
]);
assert.equal(totals.calories, 680);
assert.equal(totals.protein, 57.5);

// shopping aggregation: 2 lb beef at base 12 planned 2 -> 0.33 lb; same ingredient twice sums
const recipe = {
  id: 'r1', name: 'Test', mealType: 'breakfast', baseServings: 12, yieldText: null,
  prepMinutes: null, cookMinutes: null, description: null, sourceName: null, sourceUrl: null,
  instructions: null, isCustom: false,
  macros: { calories: 430, protein: 45, carbs: 22, fat: 18 },
  ingredients: [
    { name: 'lean ground beef 96/4', amount: 2, unit: 'lb', section: 'Meat' },
    { name: 'large eggs', amount: 12, unit: null, section: 'Dairy & eggs' },
  ],
};
const groups = buildShoppingList([{ recipe, servings: 2 }, { recipe, servings: 2 }]);
const meat = groups.find((g) => g.section === 'Meat');
assert.ok(meat);
assert.equal(meat.lines[0].amount, 0.66); // per-item: 2 * 2/12 = 0.33 (rounded), summed over 2 plan items = 0.66
const dairy = groups.find((g) => g.section === 'Dairy & eggs');
assert.equal(dairy.lines[0].amount, 4); // 12 * (2/12) * 2

// week math: 2026-11-09 is a Monday
assert.equal(weekStartOf('2026-11-09'), '2026-11-09');
assert.equal(dayIndexOf('2026-11-09'), 0);
assert.equal(dayIndexOf('2026-11-15'), 6); // Sunday
assert.equal(weekStartOf('2026-11-15'), '2026-11-09');

console.log('shared tests: all passed');
