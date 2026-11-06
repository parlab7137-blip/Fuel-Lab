import { Router, Request, Response } from 'express';
import { buildShoppingList } from '@fuellab/shared';
import { getCheckedKeys, listPlanWithRecipes, setShoppingCheck } from '../db';

const router = Router();
const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', async (req: Request, res: Response) => {
  const weekStart = typeof req.query.weekStart === 'string' ? req.query.weekStart : '';
  if (!WEEK_RE.test(weekStart)) {
    res.status(400).json({ error: 'weekStart (YYYY-MM-DD, a Monday) is required' });
    return;
  }
  const userId = req.currentUser.id;
  const [planned, checked] = await Promise.all([listPlanWithRecipes(userId, weekStart), getCheckedKeys(userId, weekStart)]);
  const plan = planned.map(({ item, recipe }) => ({ recipe, servings: item.servings }));
  const groups = buildShoppingList(plan, checked);
  res.json({ weekStart, groups });
});

router.post('/check', async (req: Request, res: Response) => {
  const { weekStart, key, checked } = req.body ?? {};
  if (typeof weekStart !== 'string' || !WEEK_RE.test(weekStart) || typeof key !== 'string' || key.length === 0) {
    res.status(400).json({ error: 'weekStart and key are required' });
    return;
  }
  await setShoppingCheck(req.currentUser.id, weekStart, key, checked === true);
  res.json({ ok: true });
});

export default router;
