# fuellab-web

React + Vite web app for FuelLab: five tabs over the server API —

- **Today** — plan-driven calorie counter: progress ring + macro bars vs
  targets, confirm/adjust/remove planned meals, quick-add, week strip
- **Recipes** — search, meal-type chips, 30g+ protein filter, sort by
  protein/calories; detail with ingredients, method, macros, source link;
  **+ Add your own** form (custom recipes badged "Yours")
- **Planner** — Mon–Sun grid, breakfast/lunch/dinner slots with the
  meal-prep vs cook-fresh badges, servings default to household size
- **Shopping** — the week's aggregated list grouped by store section, with
  check-off that persists per week
- **Settings** — household size + daily targets, logout

```bash
npm install
npm run build   # tsc -b && vite build -> dist/ (served by fuellab-server)
npm run dev     # vite dev server, proxies /api to localhost:4000
```
