import { useEffect, useState } from 'react';
import { addDays, weekStartOf, type ShoppingGroup } from '@fuellab/shared';
import { api, todayLocal } from '../api';
import { weekRange } from '../format';

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
      <div className="page-head">
        <div>
          <h1 className="page-title">Shopping</h1>
          <p className="muted page-sub">For {weekRange(weekStart)}</p>
        </div>
        <div className="step-nav">
          {weekStart !== weekStartOf(todayLocal()) && (
            <button className="pill-btn" onClick={() => setWeekStart(weekStartOf(todayLocal()))}>
              This week
            </button>
          )}
          <button className="round-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            ‹
          </button>
          <button className="round-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            ›
          </button>
        </div>
      </div>
      {total === 0 ? (
        <p className="empty">Nothing planned this week yet. Add meals in the Planner and the list builds itself.</p>
      ) : (
        <div className="shop-progress">
          <div className="shop-progress-text">
            <strong>
              {done} of {total}
            </strong>{' '}
            <span className="muted">{done === total ? 'all picked up' : 'picked up'}</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {groups.map((group) => (
        <section key={group.section} className="shop-group">
          <h3>
            {group.section}{' '}
            <span className="count">
              {group.lines.filter((l) => l.checked).length}/{group.lines.length}
            </span>
          </h3>
          <ul>
            {group.lines.map((line) => (
              <li key={line.key} className={line.checked ? 'checked' : ''}>
                <label>
                  <input type="checkbox" checked={line.checked} onChange={(e) => toggle(line.key, e.target.checked)} />
                  <span>
                    {line.amount != null ? `${line.amount} ` : ''}
                    {line.unit ? `${line.unit} ` : ''}
                    {line.name}
                    {line.amount == null ? <em className="muted"> amount varies</em> : null}
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
