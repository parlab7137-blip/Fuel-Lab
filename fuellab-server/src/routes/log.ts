import { Router, Request, Response } from 'express';
import {
  addDays,
  dayIndexOf,
  dayTotals,
  weekStartOf,
  type DayLogEntry,
  type TodayResponse,
  type WeekLogDay,
} from '@fuellab/shared';
import {
  deleteDayLog,
  findPlanLogEntry,
  getPlanItem,
  getSettings,
  insertDayLog,
  listDayLog,
  listDayLogRange,
  listPlanItems,
  updateDayLogServings,
} from '../db';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function buildToday(userId: string, date: string): Promise<TodayResponse> {
  const weekStart = weekStartOf(date);
  const dayIndex = dayIndexOf(date);
  const [allItems, entries, settings] = await Promise.all([
    listPlanItems(userId, weekStart),
    listDayLog(userId, date),
    getSettings(userId),
  ]);
  const planItems = allItems.filter((i) => i.dayIndex === dayIndex);
  const planned = planItems.map((planItem) => ({
    planItem,
    logEntryId: entries.find((e) => e.kind === 'plan' && e.planItemId === planItem.id)?.id ?? null,
  }));
  return { date, weekStart, dayIndex, planned, entries, totals: dayTotals(entries), targets: settings.targets };
}

router.get('/today', async (req: Request, res: Response) => {
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
    return;
  }
  res.json(await buildToday(req.currentUser.id, date));
});

router.get('/week', async (req: Request, res: Response) => {
  const weekStart = typeof req.query.weekStart === 'string' ? req.query.weekStart : '';
  if (!DATE_RE.test(weekStart)) {
    res.status(400).json({ error: 'weekStart (YYYY-MM-DD) is required' });
    return;
  }
  const userId = req.currentUser.id;
  const [entries, settings] = await Promise.all([
    listDayLogRange(userId, weekStart, addDays(weekStart, 6)),
    getSettings(userId),
  ]);
  const days: WeekLogDay[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = addDays(weekStart, dayIndex);
    days.push({ date, dayIndex, totals: dayTotals(entries.filter((e) => e.date === date)) });
  }
  res.json({ weekStart, targets: settings.targets, days });
});

/** Confirm a planned meal was eaten. Idempotent per plan item + date. */
router.post('/from-plan', async (req: Request, res: Response) => {
  const { date, planItemId, servingsEaten } = req.body ?? {};
  if (typeof date !== 'string' || !DATE_RE.test(date) || typeof planItemId !== 'string') {
    res.status(400).json({ error: 'date and planItemId are required' });
    return;
  }
  const userId = req.currentUser.id;
  const planItem = await getPlanItem(userId, planItemId);
  if (!planItem) {
    res.status(404).json({ error: 'Plan item not found' });
    return;
  }
  const existing = await findPlanLogEntry(userId, date, planItemId);
  if (existing) {
    res.json({ entry: existing, today: await buildToday(userId, date) });
    return;
  }
  const n = servingsEaten === undefined ? 1 : Number(servingsEaten);
  if (!Number.isFinite(n) || n <= 0 || n > 20) {
    res.status(400).json({ error: 'servingsEaten must be a positive number' });
    return;
  }
  const entry = await insertDayLog(userId, {
    date,
    kind: 'plan',
    planItemId,
    recipeId: planItem.recipeId,
    name: planItem.recipe.name,
    servingsEaten: n,
    perServing: planItem.recipe.macros,
  });
  res.status(201).json({ entry, today: await buildToday(userId, date) });
});

/** Quick-add an off-plan food: name + calories + protein required. */
router.post('/quick', async (req: Request, res: Response) => {
  const { date, name, calories, protein, carbs, fat } = req.body ?? {};
  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    res.status(400).json({ error: 'date (YYYY-MM-DD) is required' });
    return;
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const cal = Number(calories);
  const pro = Number(protein);
  if (!Number.isFinite(cal) || cal < 0 || !Number.isFinite(pro) || pro < 0) {
    res.status(400).json({ error: 'calories and protein are required numbers' });
    return;
  }
  const opt = (v: unknown) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const entry: DayLogEntry = await insertDayLog(req.currentUser.id, {
    date,
    kind: 'quick',
    planItemId: null,
    recipeId: null,
    name: name.trim(),
    servingsEaten: 1,
    perServing: { calories: cal, protein: pro, carbs: opt(carbs), fat: opt(fat) },
  });
  res.status(201).json({ entry, today: await buildToday(req.currentUser.id, date) });
});

router.patch('/:id', async (req: Request, res: Response) => {
  const n = Number((req.body ?? {}).servingsEaten);
  if (!Number.isFinite(n) || n <= 0 || n > 20) {
    res.status(400).json({ error: 'servingsEaten must be a positive number' });
    return;
  }
  const entry = await updateDayLogServings(req.currentUser.id, String(req.params.id), n);
  if (!entry) {
    res.status(404).json({ error: 'Log entry not found' });
    return;
  }
  res.json({ entry, today: await buildToday(req.currentUser.id, entry.date) });
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (!(await deleteDayLog(req.currentUser.id, String(req.params.id)))) {
    res.status(404).json({ error: 'Log entry not found' });
    return;
  }
  res.json({ ok: true });
});

export default router;
