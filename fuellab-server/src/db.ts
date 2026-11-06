import type { Client, InStatement, InValue } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  DayLogEntry,
  Ingredient,
  PlanItem,
  PublicUser,
  Recipe,
  RecipeSummary,
  Settings,
} from '@fuellab/shared';
import { SEED_RECIPES } from './seed';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

interface DbRecipe {
  id: string;
  owner_id: string | null;
  name: string;
  meal_type: string;
  base_servings: number | null;
  yield_text: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  description: string | null;
  source_name: string | null;
  source_url: string | null;
  instructions: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  is_custom: number;
  created_at: string;
}

interface DbIngredient {
  recipe_id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  section: string;
  position: number;
}

interface DbPlanItem {
  id: string;
  user_id: string;
  week_start: string;
  day_index: number;
  recipe_id: string;
  servings: number;
  created_at: string;
}

interface DbDayLog {
  id: string;
  user_id: string;
  date: string;
  kind: string;
  plan_item_id: string | null;
  recipe_id: string | null;
  name: string;
  servings_eaten: number;
  cal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  created_at: string;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  household_size INTEGER NOT NULL DEFAULT 2,
  target_calories INTEGER NOT NULL DEFAULT 2200,
  target_protein INTEGER NOT NULL DEFAULT 160,
  target_carbs INTEGER NOT NULL DEFAULT 220,
  target_fat INTEGER NOT NULL DEFAULT 70
)`,
  `CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner')),
  base_servings REAL,
  yield_text TEXT,
  prep_minutes INTEGER,
  cook_minutes INTEGER,
  description TEXT,
  source_name TEXT,
  source_url TEXT,
  instructions TEXT,
  calories REAL,
  protein REAL,
  carbs REAL,
  fat REAL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  name TEXT NOT NULL,
  amount REAL,
  unit TEXT,
  section TEXT NOT NULL DEFAULT 'Other',
  position INTEGER NOT NULL DEFAULT 0
)`,
  `CREATE TABLE IF NOT EXISTS plan_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  week_start TEXT NOT NULL,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  servings REAL NOT NULL,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS day_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('plan','quick')),
  plan_item_id TEXT,
  recipe_id TEXT,
  name TEXT NOT NULL,
  servings_eaten REAL NOT NULL DEFAULT 1,
  cal REAL,
  protein REAL,
  carbs REAL,
  fat REAL,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS shopping_checks (
  user_id TEXT NOT NULL REFERENCES users(id),
  week_start TEXT NOT NULL,
  item_key TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, week_start, item_key)
)`,
  'CREATE INDEX IF NOT EXISTS idx_ingredients_recipe ON ingredients(recipe_id)',
  'CREATE INDEX IF NOT EXISTS idx_plan_user_week ON plan_items(user_id, week_start)',
  'CREATE INDEX IF NOT EXISTS idx_log_user_date ON day_log(user_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_recipes_owner ON recipes(owner_id)',
];

/** Household defaults for new accounts. */
export const DEFAULT_SETTINGS: Settings = {
  householdSize: 2,
  targets: { calories: 2200, protein: 160, carbs: 220, fat: 70 },
};

let client: Client | null = null;
let ready: Promise<void> | null = null;

/**
 * Database location.
 *  - Turso (production): TURSO_DATABASE_URL (libsql://...) + TURSO_AUTH_TOKEN.
 *    DATABASE_URL / DATABASE_AUTH_TOKEN are accepted as aliases.
 *  - Local: a SQLite file, DATABASE_PATH (default ./data/fuellab.db).
 */
function dbConfig(): { url: string; authToken?: string } {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined;
  if (url) return { url, authToken };
  const dbPath = path.resolve(process.env.DATABASE_PATH || './data/fuellab.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return { url: 'file:' + dbPath.replace(/\\/g, '/') };
}

/**
 * Connect, create the schema and seed the recipe box. Safe to call on every request: the
 * work runs once per process (or per serverless instance) and later calls reuse the promise.
 */
export function openDatabase(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const { url, authToken } = dbConfig();
      // The /web client talks HTTP only (no native binary), which is all Turso needs.
      // Local files need the full Node client.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lib = url.startsWith('file:') ? require('@libsql/client') : require('@libsql/client/web');
      const c: Client = lib.createClient({ url, authToken });
      await c.batch(SCHEMA, 'write');
      await seedRecipes(c);
      client = c;
    })().catch((err) => {
      ready = null; // let the next request retry instead of failing forever
      throw err;
    });
  }
  return ready;
}

/** Inserts the starter recipe box once (the whole box is one transaction). */
async function seedRecipes(c: Client): Promise<void> {
  const rs = await c.execute('SELECT COUNT(*) AS n FROM recipes WHERE owner_id IS NULL');
  if (Number(rs.rows[0][0]) > 0) return;
  const now = nowIso();
  const stmts: InStatement[] = [];
  for (const r of SEED_RECIPES) {
    stmts.push({
      sql: `INSERT OR IGNORE INTO recipes (id, owner_id, name, meal_type, base_servings, yield_text, prep_minutes, cook_minutes,
        description, source_name, source_url, instructions, calories, protein, carbs, fat, is_custom, created_at)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        r.id, r.name, r.mealType, r.baseServings, r.yieldText, r.prepMinutes, r.cookMinutes,
        r.description, r.sourceName, r.sourceUrl, r.instructions, r.calories, r.protein, r.carbs, r.fat, now,
      ],
    });
    r.ingredients.forEach((ing, i) =>
      stmts.push({
        sql: 'INSERT INTO ingredients (recipe_id, name, amount, unit, section, position) VALUES (?, ?, ?, ?, ?, ?)',
        args: [r.id, ing.name, ing.amount, ing.unit, ing.section, i],
      }),
    );
  }
  await c.batch(stmts, 'write');
  console.log(`[seed] inserted ${SEED_RECIPES.length} starter recipes`);
}

function db(): Client {
  if (!client) throw new Error('Database not initialized');
  return client;
}

type Row = Record<string, unknown>;

async function all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const rs = await db().execute({ sql, args });
  // libsql rows are array-like objects; copy into plain objects keyed by column name.
  return rs.rows.map((r) => {
    const o: Row = {};
    rs.columns.forEach((col, i) => (o[col] = r[i]));
    return o as T;
  });
}

async function get<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

/** Runs one statement and returns how many rows it changed. */
async function run(sql: string, args: InValue[] = []): Promise<number> {
  const rs = await db().execute({ sql, args });
  return rs.rowsAffected;
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ----- users & settings -----

export async function createUser(name: string, email: string, passwordHash: string): Promise<DbUser> {
  const user: DbUser = { id: newId(), name, email, password_hash: passwordHash, created_at: nowIso() };
  const s = DEFAULT_SETTINGS;
  await db().batch(
    [
      {
        sql: 'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [user.id, user.name, user.email, user.password_hash, user.created_at],
      },
      {
        sql: 'INSERT INTO settings (user_id, household_size, target_calories, target_protein, target_carbs, target_fat) VALUES (?, ?, ?, ?, ?, ?)',
        args: [user.id, s.householdSize, s.targets.calories, s.targets.protein, s.targets.carbs, s.targets.fat],
      },
    ],
    'write',
  );
  return user;
}

export function getUserByEmail(email: string): Promise<DbUser | undefined> {
  return get<DbUser>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
}

export function getUserById(id: string): Promise<DbUser | undefined> {
  return get<DbUser>('SELECT * FROM users WHERE id = ?', [id]);
}

export function toPublicUser(user: DbUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

export async function getSettings(userId: string): Promise<Settings> {
  const row = await get<{
    household_size: number;
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fat: number;
  }>('SELECT * FROM settings WHERE user_id = ?', [userId]);
  if (!row) return DEFAULT_SETTINGS;
  return {
    householdSize: row.household_size,
    targets: { calories: row.target_calories, protein: row.target_protein, carbs: row.target_carbs, fat: row.target_fat },
  };
}

export async function saveSettings(userId: string, settings: Settings): Promise<void> {
  await run(
    `INSERT INTO settings (user_id, household_size, target_calories, target_protein, target_carbs, target_fat)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET household_size = excluded.household_size,
       target_calories = excluded.target_calories, target_protein = excluded.target_protein,
       target_carbs = excluded.target_carbs, target_fat = excluded.target_fat`,
    [userId, settings.householdSize, settings.targets.calories, settings.targets.protein, settings.targets.carbs, settings.targets.fat],
  );
}

// ----- recipes -----

function toRecipe(row: DbRecipe, ingredients: Ingredient[]): Recipe {
  return {
    id: row.id,
    name: row.name,
    mealType: row.meal_type as Recipe['mealType'],
    baseServings: row.base_servings,
    yieldText: row.yield_text,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    description: row.description,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    instructions: row.instructions,
    isCustom: Number(row.is_custom) === 1,
    macros: { calories: row.calories, protein: row.protein, carbs: row.carbs, fat: row.fat },
    ingredients,
  };
}

async function ingredientsFor(recipeIds: string[]): Promise<Map<string, Ingredient[]>> {
  const map = new Map<string, Ingredient[]>();
  if (recipeIds.length === 0) return map;
  const placeholders = recipeIds.map(() => '?').join(',');
  const rows = await all<DbIngredient>(
    `SELECT * FROM ingredients WHERE recipe_id IN (${placeholders}) ORDER BY position`,
    recipeIds,
  );
  for (const row of rows) {
    const list = map.get(row.recipe_id) ?? [];
    list.push({ name: row.name, amount: row.amount, unit: row.unit, section: row.section });
    map.set(row.recipe_id, list);
  }
  return map;
}

async function withIngredients(rows: DbRecipe[]): Promise<Recipe[]> {
  const ingredients = await ingredientsFor(rows.map((r) => r.id));
  return rows.map((r) => toRecipe(r, ingredients.get(r.id) ?? []));
}

/** Starter box + the user's own custom recipes. */
export async function listRecipes(userId: string): Promise<Recipe[]> {
  const rows = await all<DbRecipe>(
    'SELECT * FROM recipes WHERE owner_id IS NULL OR owner_id = ? ORDER BY is_custom ASC, name ASC',
    [userId],
  );
  return withIngredients(rows);
}

/** The given recipes (that this user can see), keyed by id. One query each for recipes and ingredients. */
export async function getRecipes(userId: string, recipeIds: string[]): Promise<Map<string, Recipe>> {
  const ids = [...new Set(recipeIds)];
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all<DbRecipe>(
    `SELECT * FROM recipes WHERE id IN (${placeholders}) AND (owner_id IS NULL OR owner_id = ?)`,
    [...ids, userId],
  );
  return new Map((await withIngredients(rows)).map((r) => [r.id, r]));
}

export async function getRecipe(userId: string, recipeId: string): Promise<Recipe | undefined> {
  return (await getRecipes(userId, [recipeId])).get(recipeId);
}

export async function insertCustomRecipe(userId: string, recipe: Recipe): Promise<void> {
  const stmts: InStatement[] = [
    {
      sql: `INSERT INTO recipes (id, owner_id, name, meal_type, base_servings, yield_text, prep_minutes, cook_minutes,
        description, source_name, source_url, instructions, calories, protein, carbs, fat, is_custom, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 'Yours', NULL, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        recipe.id, userId, recipe.name, recipe.mealType, recipe.baseServings, recipe.prepMinutes, recipe.cookMinutes,
        recipe.description, recipe.instructions, recipe.macros.calories, recipe.macros.protein, recipe.macros.carbs,
        recipe.macros.fat, nowIso(),
      ],
    },
    ...recipe.ingredients.map((ing, i) => ({
      sql: 'INSERT INTO ingredients (recipe_id, name, amount, unit, section, position) VALUES (?, ?, ?, ?, ?, ?)',
      args: [recipe.id, ing.name, ing.amount, ing.unit, ing.section, i],
    })),
  ];
  await db().batch(stmts, 'write');
}

/** Deletes one of the user's own recipes, its ingredients, and any plan slots that used it. */
export async function deleteCustomRecipe(userId: string, recipeId: string): Promise<boolean> {
  const owned = await get<{ id: string }>(
    'SELECT id FROM recipes WHERE id = ? AND owner_id = ? AND is_custom = 1',
    [recipeId, userId],
  );
  if (!owned) return false;
  await db().batch(
    [
      { sql: 'DELETE FROM plan_items WHERE recipe_id = ? AND user_id = ?', args: [recipeId, userId] },
      { sql: 'DELETE FROM ingredients WHERE recipe_id = ?', args: [recipeId] },
      { sql: 'DELETE FROM recipes WHERE id = ? AND owner_id = ?', args: [recipeId, userId] },
    ],
    'write',
  );
  return true;
}

// ----- plan -----

function toPlanItem(row: DbPlanItem, recipe: Recipe): PlanItem {
  const summary: RecipeSummary = {
    id: recipe.id,
    name: recipe.name,
    mealType: recipe.mealType,
    isCustom: recipe.isCustom,
    macros: recipe.macros,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
  };
  return { id: row.id, weekStart: row.week_start, dayIndex: row.day_index, recipeId: row.recipe_id, servings: row.servings, recipe: summary };
}

/** A week's plan, with the full recipes each slot uses (for the shopping list). */
export async function listPlanWithRecipes(
  userId: string,
  weekStart: string,
): Promise<{ item: PlanItem; recipe: Recipe }[]> {
  const rows = await all<DbPlanItem>(
    'SELECT * FROM plan_items WHERE user_id = ? AND week_start = ? ORDER BY day_index, created_at',
    [userId, weekStart],
  );
  const recipes = await getRecipes(userId, rows.map((r) => r.recipe_id));
  return rows.flatMap((row) => {
    const recipe = recipes.get(row.recipe_id);
    return recipe ? [{ item: toPlanItem(row, recipe), recipe }] : [];
  });
}

export async function listPlanItems(userId: string, weekStart: string): Promise<PlanItem[]> {
  return (await listPlanWithRecipes(userId, weekStart)).map((p) => p.item);
}

export async function getPlanItem(userId: string, planItemId: string): Promise<PlanItem | undefined> {
  const row = await get<DbPlanItem>('SELECT * FROM plan_items WHERE id = ? AND user_id = ?', [planItemId, userId]);
  if (!row) return undefined;
  const recipe = await getRecipe(userId, row.recipe_id);
  return recipe ? toPlanItem(row, recipe) : undefined;
}

export async function insertPlanItem(
  userId: string,
  weekStart: string,
  dayIndex: number,
  recipeId: string,
  servings: number,
): Promise<PlanItem> {
  const id = newId();
  await run(
    'INSERT INTO plan_items (id, user_id, week_start, day_index, recipe_id, servings, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, weekStart, dayIndex, recipeId, servings, nowIso()],
  );
  const item = await getPlanItem(userId, id);
  if (!item) throw new Error('plan item vanished');
  return item;
}

export async function deletePlanItem(userId: string, planItemId: string): Promise<boolean> {
  return (await run('DELETE FROM plan_items WHERE id = ? AND user_id = ?', [planItemId, userId])) > 0;
}

// ----- day log (calorie counter) -----

function toDayLogEntry(row: DbDayLog): DayLogEntry {
  return {
    id: row.id,
    date: row.date,
    kind: row.kind as DayLogEntry['kind'],
    planItemId: row.plan_item_id,
    recipeId: row.recipe_id,
    name: row.name,
    servingsEaten: row.servings_eaten,
    perServing: { calories: row.cal, protein: row.protein, carbs: row.carbs, fat: row.fat },
  };
}

export async function listDayLog(userId: string, date: string): Promise<DayLogEntry[]> {
  const rows = await all<DbDayLog>('SELECT * FROM day_log WHERE user_id = ? AND date = ? ORDER BY created_at', [userId, date]);
  return rows.map(toDayLogEntry);
}

/** Every log entry from `from` to `to` (inclusive), for the week strip. */
export async function listDayLogRange(userId: string, from: string, to: string): Promise<DayLogEntry[]> {
  const rows = await all<DbDayLog>(
    'SELECT * FROM day_log WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, created_at',
    [userId, from, to],
  );
  return rows.map(toDayLogEntry);
}

export async function insertDayLog(userId: string, entry: Omit<DayLogEntry, 'id'>): Promise<DayLogEntry> {
  const row: DbDayLog = {
    id: newId(), user_id: userId, date: entry.date, kind: entry.kind,
    plan_item_id: entry.planItemId, recipe_id: entry.recipeId, name: entry.name,
    servings_eaten: entry.servingsEaten, cal: entry.perServing.calories, protein: entry.perServing.protein,
    carbs: entry.perServing.carbs, fat: entry.perServing.fat, created_at: nowIso(),
  };
  await run(
    `INSERT INTO day_log (id, user_id, date, kind, plan_item_id, recipe_id, name, servings_eaten, cal, protein, carbs, fat, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id, row.user_id, row.date, row.kind, row.plan_item_id, row.recipe_id, row.name,
      row.servings_eaten, row.cal, row.protein, row.carbs, row.fat, row.created_at,
    ],
  );
  return toDayLogEntry(row);
}

export async function findPlanLogEntry(userId: string, date: string, planItemId: string): Promise<DayLogEntry | undefined> {
  const row = await get<DbDayLog>(
    "SELECT * FROM day_log WHERE user_id = ? AND date = ? AND plan_item_id = ? AND kind = 'plan'",
    [userId, date, planItemId],
  );
  return row ? toDayLogEntry(row) : undefined;
}

export async function updateDayLogServings(userId: string, entryId: string, servingsEaten: number): Promise<DayLogEntry | undefined> {
  const changed = await run('UPDATE day_log SET servings_eaten = ? WHERE id = ? AND user_id = ?', [servingsEaten, entryId, userId]);
  if (changed === 0) return undefined;
  const row = await get<DbDayLog>('SELECT * FROM day_log WHERE id = ?', [entryId]);
  return row ? toDayLogEntry(row) : undefined;
}

export async function deleteDayLog(userId: string, entryId: string): Promise<boolean> {
  return (await run('DELETE FROM day_log WHERE id = ? AND user_id = ?', [entryId, userId])) > 0;
}

// ----- shopping check-off -----

export async function getCheckedKeys(userId: string, weekStart: string): Promise<Set<string>> {
  const rows = await all<{ item_key: string }>(
    'SELECT item_key FROM shopping_checks WHERE user_id = ? AND week_start = ? AND checked = 1',
    [userId, weekStart],
  );
  return new Set(rows.map((r) => r.item_key));
}

export async function setShoppingCheck(userId: string, weekStart: string, itemKey: string, checked: boolean): Promise<void> {
  await run(
    `INSERT INTO shopping_checks (user_id, week_start, item_key, checked) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, week_start, item_key) DO UPDATE SET checked = excluded.checked`,
    [userId, weekStart, itemKey, checked ? 1 : 0],
  );
}
