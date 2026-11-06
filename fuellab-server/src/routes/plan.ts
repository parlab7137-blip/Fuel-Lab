import { Router, Request, Response } from 'express';
import { deletePlanItem, getRecipe, insertPlanItem, listPlanItems } from '../db';

const router = Router();
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', async (req: Request, res: Response) => {
  const weekStart = typeof req.query.weekStart === 'string' ? req.query.weekStart : '';
  if (!WEEK_RE.test(weekStart)) {
    res.status(400).json({ error: 'weekStart (YYYY-MM-DD, a Monday) is required' });
    return;
  }
  res.json({ weekStart, items: await listPlanItems(req.currentUser.id, weekStart) });
});

router.post('/', async (req: Request, res: Response) => {
  const { weekStart, dayIndex, recipeId, servings } = req.body ?? {};
  if (typeof weekStart !== 'string' || !WEEK_RE.test(weekStart)) {
    res.status(400).json({ error: 'weekStart (YYYY-MM-DD) is required' });
    return;
  }
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    res.status(400).json({ error: 'dayIndex must be 0 (Mon) to 6 (Sun)' });
    return;
  }
  if (typeof recipeId !== 'string' || !(await getRecipe(req.currentUser.id, recipeId))) {
    res.status(404).json({ error: 'Recipe not found' });
    return;
  }
  const n = Number(servings);
  if (!Number.isFinite(n) || n <= 0 || n > 50) {
    res.status(400).json({ error: 'servings must be a positive number' });
    return;
  }
  const item = await insertPlanItem(req.currentUser.id, weekStart, dayIndex, recipeId, n);
  res.status(201).json({ item });
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (!(await deletePlanItem(req.currentUser.id, String(req.params.id)))) {
    res.status(404).json({ error: 'Plan item not found' });
    return;
  }
  res.json({ ok: true });
});

export default router;
