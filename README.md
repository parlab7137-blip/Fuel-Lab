# FuelLab

Household meal planning: a recipe box, a Mon–Sun planner, a shopping list built from the
week's plan, and a calorie counter driven by what you planned.

| Package | What |
|---|---|
| `fuellab-shared` | types + pure logic shared by everything (day totals, shopping list, week math) |
| `fuellab-server` | Express API on SQLite / Turso (`@libsql/client`) |
| `fuellab-web` | React + Vite web app, installable on phones (Add to Home Screen) |
| `fuellab-mobile` | Expo app, not deployed yet (not part of the npm workspaces) |

```bash
npm install
npm run build
npm test
npm start          # http://localhost:4000 (PORT to change)
```

Starter recipes credit their creators with a link back to the original post.
Deploying: see [DEPLOY.md](DEPLOY.md).
