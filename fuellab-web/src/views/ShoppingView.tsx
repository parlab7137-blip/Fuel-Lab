import { useEffect, useState } from 'react';
import { addDays, weekStartOf, type ShoppingGroup } from '@fuellab/shared';
import { api, todayLocal } from '../api';

export default function ShoppingView() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocal()));
  const [groups, setGroups] = useState<ShoppingGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.getShopping(weekStart).then(({ groups: g }) => setGroups(g)).catch((e: Error) => setError(e.message));
  };

  useEffect(load, [weekStart]);

  const toggle = async (key: string, checked: boolean) => {
    setGroups((prev) =>
      prev.map((g) => ({ ...g, lines: g.lines.map((l) => (l.key === key ? { ...l, checked } : l)) })),
    );
    try {
      await api.setShoppingCheck(weekStart, key, checked);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const total = groups.reduce((n, g) => n + g.lines.length, 0);
  const done = groups.reduce((n, g) => n + g.lines.filter((l) => l.checked).length, 0);

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev week</button>
        <strong>Shopping for week of {weekStart}</strong>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week →</button>
        <span className="muted">
          {total === 0 ? 'Nothing planned this week yet' : `${done}/${total} picked up`}
        </span>
      </div>
      {error && <p className="error">{error}</p>}
      {groups.map((group) => (
        <section key={group.section} className="shop-group">
          <h3>{group.section}</h3>
          <ul>
            {group.lines.map((line) => (
              <li key={line.key} className={line.checked ? 'checked' : ''}>
                <label>
                  <input type="checkbox" checked={line.checked} onChange={(e) => toggle(line.key, e.target.checked)} />
                  <span>
                    {line.amount != null ? `${line.amount} ` : ''}
                    {line.unit ? `${line.unit} ` : ''}
                    {line.name}
                    {line.amount == null ? ' (amount varies)' : ''}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
