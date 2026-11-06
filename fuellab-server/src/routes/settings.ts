import { Router, Request, Response } from 'express';
import type { Settings } from '@fuellab/shared';
import { getSettings, saveSettings } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.json({ settings: await getSettings(req.currentUser.id) });
});

router.put('/', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Partial<Settings>;
  const householdSize = Number(body.householdSize);
  const t = body.targets ?? ({} as Settings['targets']);
  const targets = {
    calories: Number(t.calories),
    protein: Number(t.protein),
    carbs: Number(t.carbs),
    fat: Number(t.fat),
  };
  if (!Number.isInteger(householdSize) || householdSize < 1 || householdSize > 20) {
    res.status(400).json({ error: 'householdSize must be a whole number 1-20' });
    return;
  }
  if (Object.values(targets).some((v) => !Number.isFinite(v) || v < 0)) {
    res.status(400).json({ error: 'targets must be non-negative numbers' });
    return;
  }
  const settings: Settings = { householdSize, targets };
  await saveSettings(req.currentUser.id, settings);
  res.json({ settings });
});

export default router;
