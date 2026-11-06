import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Settings } from '@fuellab/shared';
import { api } from '../api';
import { useAuth } from '../auth';

export default function SettingsView() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSettings().then(({ settings: s }) => setSettings(s)).catch((e: Error) => setError(e.message));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const { settings: s } = await api.saveSettings(settings);
      setSettings(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!settings) return <p className="muted">{error ?? 'Loading…'}</p>;

  const num = (v: string) => Number(v) || 0;

  return (
    <div className="settings">
      <h2>Household settings</h2>
      <p className="muted">
        Signed in as {user?.name} ({user?.email}). Household size drives the planner's default servings; targets drive the
        Today counter.
      </p>
      <form onSubmit={submit} className="form narrow">
        <label>
          Household size (people you cook for)
          <input
            type="number"
            min="1"
            max="20"
            value={settings.householdSize}
            onChange={(e) => setSettings({ ...settings, householdSize: num(e.target.value) })}
          />
        </label>
        <fieldset>
          <legend>Daily targets</legend>
          <div className="row">
            <label>
              Calories
              <input type="number" min="0" value={settings.targets.calories} onChange={(e) => setSettings({ ...settings, targets: { ...settings.targets, calories: num(e.target.value) } })} />
            </label>
            <label>
              Protein (g)
              <input type="number" min="0" value={settings.targets.protein} onChange={(e) => setSettings({ ...settings, targets: { ...settings.targets, protein: num(e.target.value) } })} />
            </label>
            <label>
              Carbs (g)
              <input type="number" min="0" value={settings.targets.carbs} onChange={(e) => setSettings({ ...settings, targets: { ...settings.targets, carbs: num(e.target.value) } })} />
            </label>
            <label>
              Fat (g)
              <input type="number" min="0" value={settings.targets.fat} onChange={(e) => setSettings({ ...settings, targets: { ...settings.targets, fat: num(e.target.value) } })} />
            </label>
          </div>
        </fieldset>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          {saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </form>
      <button className="danger" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
