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
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
        </div>
      </div>
      <div className="panel account">
        <span className="avatar big">{(user?.name ?? '?').trim().charAt(0).toUpperCase()}</span>
        <div>
          <strong>{user?.name}</strong>
          <div className="muted small">{user?.email}</div>
        </div>
      </div>
      <form onSubmit={submit} className="form narrow">
        <div className="panel">
        <h2 className="panel-title">Household</h2>
        <p className="muted small">Sets how many servings new meals in the Planner start with.</p>
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
        </div>
        <div className="panel">
          <h2 className="panel-title">Daily targets</h2>
          <p className="muted small">What the ring and bars on Today count toward.</p>
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
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          {saved ? 'Saved ✓' : 'Save settings'}
        </button>
      </form>
      <button className="danger logout" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
