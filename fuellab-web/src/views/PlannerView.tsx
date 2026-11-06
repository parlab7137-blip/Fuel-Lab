import { useEffect, useState } from 'react';
import { addDays, mealBadge, weekStartOf, type MealType, type PlanItem, type Recipe } from '@fuellab/shared';
import { api, todayLocal } from '../api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner'];

export default function PlannerView() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(todayLocal()));
  const [items, setItems] = useState<PlanItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [householdSize, setHouseholdSize] = useState(2);
  const [picker, setPicker] = useState<{ dayIndex: number; mealType: MealType } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.getPlan(weekStart).then(({ items: list }) => setItems(list)).catch((e: Error) => setError(e.message));
  };

  useEffect(load, [weekStart]);
  useEffect(() => {
    api.listRecipes().then(({ recipes: list }) => setRecipes(list)).catch(() => undefined);
    api.getSettings().then(({ settings }) => setHouseholdSize(settings.householdSize)).catch(() => undefined);
  }, []);

  const add = async (recipeId: string) => {
    if (!picker) return;
    try {
      await api.addPlanItem(weekStart, picker.dayIndex, recipeId, householdSize);
      setPicker(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    await api.removePlanItem(id);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev week</button>
        <strong>Week of {weekStart}</strong>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}>Next week →</button>
        <button onClick={() => setWeekStart(weekStartOf(todayLocal()))}>This week</button>
        <span className="muted">New meals default to {householdSize} servings (household size)</span>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="week">
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="day">
            <h3>
              {day} <span className="muted small">{addDays(weekStart, dayIndex).slice(5)}</span>
            </h3>
            {SLOTS.map((slot) => (
              <div key={slot} className="slot">
                <div className="slot-head">
                  <span className="slot-name">{slot}</span>
                  <span className="badge subtle">{mealBadge(slot)}</span>
                </div>
                {items
                  .filter((i) => i.dayIndex === dayIndex && i.recipe.mealType === slot)
                  .map((item) => (
                    <div key={item.id} className="plan-item">
                      <span>
                        {item.recipe.name}
                        {item.recipe.isCustom && <span className="badge yours">Yours</span>}
                      </span>
                      <span className="muted small">×{item.servings} servings</span>
                      <button className="icon" onClick={() => remove(item.id)} aria-label="Remove">✕</button>
                    </div>
                  ))}
                <button className="add" onClick={() => setPicker({ dayIndex, mealType: slot })}>
                  + Add
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      {picker && (
        <div className="modal-backdrop" onClick={() => setPicker(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>
                Add {picker.mealType} — {DAYS[picker.dayIndex]}
              </h2>
              <button className="icon" onClick={() => setPicker(null)} aria-label="Close">✕</button>
            </div>
            <div className="picker-list">
              {recipes
                .filter((r) => r.mealType === picker.mealType)
                .map((r) => (
                  <button key={r.id} className="picker-item" onClick={() => add(r.id)}>
                    <span>{r.name}{r.isCustom ? ' · Yours' : ''}</span>
                    <span className="muted small">
                      {r.macros.calories != null ? `${r.macros.calories} kcal · ${r.macros.protein ?? '—'}g protein` : 'macros not listed'}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
