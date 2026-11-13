import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { addDays, type DayTotals, type Recipe, type Targets, type TodayResponse, type WeekLogDay } from '@fuellab/shared';
import { api, todayLocal } from '../api';
import { RecipeDetail } from './RecipesView';
import { greeting, longDate, relativeDay } from '../format';

function Ring({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="ring">
      <circle cx="70" cy="70" r={r} className="ring-bg" strokeWidth="12" fill="none" />
      <circle
        cx="70"
        cy="70"
        r={r}
        className="ring-fg"
        strokeWidth="12"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="66" textAnchor="middle" className="ring-big">
        {Math.round(value)}
      </text>
      <text x="70" y="86" textAnchor="middle" className="ring-small">
        of {target} kcal
      </text>
    </svg>
  );
}

function Bar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-value">
        {Math.round(value * 10) / 10} / {target}
        {unit}
      </span>
    </div>
  );
}

function TotalsBlock({ totals, targets }: { totals: DayTotals; targets: Targets }) {
  const left = Math.round(targets.calories - totals.calories);
  return (
    <div className="today-head">
      <Ring value={totals.calories} target={targets.calories} />
      <div className="bars">
        <p className={left >= 0 ? 'kcal-left' : 'kcal-left over'}>
          {left >= 0 ? (
            <>
              <strong>{left}</strong> kcal left
            </>
          ) : (
            <>
              <strong>{-left}</strong> kcal over
            </>
          )}
        </p>
        <Bar label="Protein" value={totals.protein} target={targets.protein} unit="g" />
        <Bar label="Carbs" value={totals.carbs} target={targets.carbs} unit="g" />
        <Bar label="Fat" value={totals.fat} target={targets.fat} unit="g" />
      </div>
    </div>
  );
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TodayView() {
  const [date, setDate] = useState(todayLocal());
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [week, setWeek] = useState<WeekLogDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quick, setQuick] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [open, setOpen] = useState<{ recipe: Recipe; servings: number } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  // Planned meals carry only a summary, so fetch the full recipe (ingredients, method) on tap.
  const openRecipe = async (recipeId: string, servings: number) => {
    setOpening(recipeId);
    try {
      const { recipe } = await api.getRecipe(recipeId);
      setOpen({ recipe, servings });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpening(null);
    }
  };

  const load = () => {
    api
      .getToday(date)
      .then((t) => {
        setToday(t);
        api.getWeekLog(t.weekStart).then(({ days }) => setWeek(days)).catch(() => undefined);
      })
      .catch((e: Error) => setError(e.message));
  };

  useEffect(load, [date]);

  const confirm = async (planItemId: string) => {
    const res = await api.confirmPlanItem(date, planItemId);
    setToday(res.today);
    load();
  };

  const setServings = async (entryId: string, servings: number) => {
    const res = await api.setEntryServings(entryId, servings);
    setToday(res.today);
    load();
  };

  const removeEntry = async (entryId: string) => {
    await api.deleteEntry(entryId);
    load();
  };

  const quickAdd = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.quickAdd(
        date,
        quick.name,
        Number(quick.calories),
        Number(quick.protein),
        quick.carbs === '' ? null : Number(quick.carbs),
        quick.fat === '' ? null : Number(quick.fat),
      );
      setToday(res.today);
      setQuick({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!today) return <p className="muted">{error ?? 'Loading…'}</p>;

  return (
    <div>
      <div className="page-head day-nav">
        <div>
          <p className="eyebrow">{date === todayLocal() ? greeting() : longDate(date)}</p>
          <h1 className="page-title">{relativeDay(date, todayLocal())}</h1>
          {date === todayLocal() && <p className="muted page-sub">{longDate(date)}</p>}
        </div>
        <div className="step-nav">
          {date !== todayLocal() && (
            <button className="pill-btn" onClick={() => setDate(todayLocal())}>
              Today
            </button>
          )}
          <button className="round-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            ‹
          </button>
          <button className="round-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            ›
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <TotalsBlock totals={today.totals} targets={today.targets} />

      <h2 className="section-title">
        Planned <span className="count">{today.planned.length}</span>
      </h2>
      {today.planned.length === 0 && <p className="empty">Nothing planned for this day. Add meals in the Planner.</p>}
      <ul className="today-list">
        {today.planned.map(({ planItem, logEntryId }) => (
          <li key={planItem.id} className="planned">
            <button
              type="button"
              className="planned-open"
              onClick={() => openRecipe(planItem.recipeId, planItem.servings)}
              aria-label={`View recipe: ${planItem.recipe.name}`}
            >
              <span className="planned-tags">
                <span className="badge">{planItem.recipe.mealType}</span>
                {planItem.recipe.isCustom && <span className="badge yours">Yours</span>}
              </span>
              <span className="planned-name">{planItem.recipe.name}</span>
              <span className="muted small">
                {planItem.recipe.macros.calories != null
                  ? `${planItem.recipe.macros.calories} kcal · ${planItem.recipe.macros.protein ?? "—"}g protein per serving`
                  : "Macros not listed"}
              </span>
              <span className="planned-link">{opening === planItem.recipeId ? "Opening…" : "View recipe ›"}</span>
            </button>
            {logEntryId ? (
              <span className="badge done">✓ Logged</span>
            ) : (
              <button className="primary small-btn" onClick={() => confirm(planItem.id)}>
                Ate it ✓
              </button>
            )}
          </li>
        ))}
      </ul>
      {open && (
        <RecipeDetail
          recipe={open.recipe}
          note={`Planned for today: ${open.servings} serving${open.servings === 1 ? "" : "s"}`}
          onClose={() => setOpen(null)}
        />
      )}

      <h2 className="section-title">
        Logged <span className="count">{today.entries.length}</span>
      </h2>
      {today.entries.length === 0 && <p className="empty">Nothing logged yet. Tap "Ate it" on a planned meal, or quick add below.</p>}
      <ul className="today-list">
        {today.entries.map((entry) => (
          <li key={entry.id} className="logged">
            <span className="logged-info">
              <span className="logged-name">{entry.name}</span>
              <span className="muted small">
                {entry.perServing.calories != null
                  ? `${Math.round((entry.perServing.calories ?? 0) * entry.servingsEaten)} kcal · ${
                      Math.round((entry.perServing.protein ?? 0) * entry.servingsEaten * 10) / 10
                    }g protein`
                  : 'macros not listed'}
                {entry.kind === 'quick' ? ' · quick add' : ''}
              </span>
            </span>
            <span className="servings-ctl">
              {[0.5, 1, 2].map((v) => (
                <button key={v} className={entry.servingsEaten === v ? 'seg active' : 'seg'} onClick={() => setServings(entry.id, v)}>
                  {v === 0.5 ? '½' : v}×
                </button>
              ))}
              <input
                type="number"
                step="0.25"
                min="0.25"
                defaultValue={entry.servingsEaten}
                key={entry.servingsEaten}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v > 0 && v !== entry.servingsEaten) setServings(entry.id, v);
                }}
                aria-label="Servings eaten"
              />
              <button className="icon" onClick={() => removeEntry(entry.id)} aria-label="Remove">✕</button>
            </span>
          </li>
        ))}
      </ul>

      <details className="quick-add">
        <summary>
          <span className="quick-plus">+</span>
          <span>
            <strong>Quick add</strong>
            <span className="muted small">Log food that wasn't on the plan</span>
          </span>
        </summary>
      <form onSubmit={quickAdd} className="quick-form">
        <input required placeholder="What did you eat?" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
        <input required type="number" min="0" placeholder="Calories" value={quick.calories} onChange={(e) => setQuick({ ...quick, calories: e.target.value })} />
        <input required type="number" min="0" placeholder="Protein (g)" value={quick.protein} onChange={(e) => setQuick({ ...quick, protein: e.target.value })} />
        <input type="number" min="0" placeholder="Carbs (g)" value={quick.carbs} onChange={(e) => setQuick({ ...quick, carbs: e.target.value })} />
        <input type="number" min="0" placeholder="Fat (g)" value={quick.fat} onChange={(e) => setQuick({ ...quick, fat: e.target.value })} />
        <button className="primary" type="submit">Add to log</button>
      </form>
      </details>

      <h2 className="section-title">This week</h2>
      <div className="week-strip">
        {week.map((day) => {
          const pct = today.targets.calories > 0 ? Math.min(100, (day.totals.calories / today.targets.calories) * 100) : 0;
          return (
            <button key={day.date} className={day.date === date ? 'strip-day active' : 'strip-day'} onClick={() => setDate(day.date)}>
              <span>{DAY_NAMES[day.dayIndex]}</span>
              <div className="strip-bar">
                <div className="strip-fill" style={{ height: `${pct}%` }} />
              </div>
              <span className="small">{day.totals.calories}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small">Bars show each day's logged calories against your {today.targets.calories} kcal target. Tap a day to view it.</p>
    </div>
  );
}
