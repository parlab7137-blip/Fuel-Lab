# @fuellab/server

Express + SQLite (better-sqlite3) + JWT (HS256, 30-day tokens) API for
FuelLab. Single-household model: register/login, and every row is scoped to
the signed-in user. Seeded custom recipes, plans, day logs, and shopping
check-offs are per-user; the 100 seeded recipes are shared read-only box data.

## Run

```bash
npm install
npm run build
cp .env.example .env   # set JWT_SECRET (required in production)
npm start              # port 4000 (PORT env), serves ../fuellab-web/dist if built
```

Data lives in `data/fuellab.db` (override with `DATABASE_PATH`). On first
boot the box is seeded from `src/seed.ts` — the 100 recipes extracted live
from the Meal Prep Planner web app (see the master README for the known gaps:
4 recipes without written methods, 3 without macros, 1 without base servings).

## API

| Route | What |
|---|---|
| `POST /api/auth/register` / `POST /api/auth/login` | account + token |
| `GET /api/me` | current user |
| `GET /api/recipes?search&mealType&highProtein&sort` | box + your customs |
| `GET /api/recipes/:id` · `POST /api/recipes` · `DELETE /api/recipes/:id` | detail / add your own / delete yours |
| `GET/POST /api/plan` · `DELETE /api/plan/:id` | weekly plan (`weekStart` = Monday) |
| `GET /api/shopping?weekStart` · `POST /api/shopping/check` | aggregated list + check-off |
| `GET /api/log/today?date` · `GET /api/log/week?weekStart` | counter day + week strip |
| `POST /api/log/from-plan` · `POST /api/log/quick` · `PATCH/DELETE /api/log/:id` | confirm planned meal / quick-add / adjust or remove |
| `GET/PUT /api/settings` | household size + daily targets |
