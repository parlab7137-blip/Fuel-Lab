# @fuellab/shared

Shared TypeScript for FuelLab: the types every package speaks, plus the pure
logic that must agree everywhere —

- `dayTotals()` — per-serving macros × servings eaten, summed for the counter
- `buildShoppingList()` — a week's plan → ingredients scaled by servings,
  summed by name+unit, grouped by store section (Produce, Meat, Dairy & eggs,
  Bread & tortillas, Grains, Baking, Canned & sauces, Pantry, Other)
- `mealBadge()` — breakfasts are "Meal prep"; lunch/dinner are "Cook fresh day-of"
- `isHighProtein()` — the 30g+ protein filter
- week math — `weekStartOf`, `dayIndexOf`, `addDays` (weeks run Mon–Sun)

```bash
npm install
npm run build   # tsc -> dist/
npm test        # node test/run.mjs against dist/
```
