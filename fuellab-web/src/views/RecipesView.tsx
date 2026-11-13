import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { isHighProtein, mealBadge, STORE_SECTIONS, type MealType, type Recipe } from '@fuellab/shared';
import { api } from '../api';

const MEAL_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
];

export default function RecipesView() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState('');
  const [highProtein, setHighProtein] = useState(false);
  const [sort, setSort] = useState('name');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .listRecipes({ search, mealType, highProtein, sort })
      .then(({ recipes: list }) => setRecipes(list))
      .catch((e: Error) => setError(e.message));
  };

  useEffect(load, [search, mealType, highProtein, sort]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Recipes</h1>
          <p className="muted page-sub">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</p>
        </div>
        <button className="primary" onClick={() => setShowForm(true)}>
          + New recipe
        </button>
      </div>
      <div className="filter-bar">
        <input
          className="search"
          type="search"
          placeholder="Search recipes or ingredients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="chips">
          {MEAL_FILTERS.map((f) => (
            <button key={f.key} className={mealType === f.key ? 'chip active' : 'chip'} onClick={() => setMealType(f.key)}>
              {f.label}
            </button>
          ))}
          <button className={highProtein ? 'chip active' : 'chip'} aria-pressed={highProtein} onClick={() => setHighProtein(!highProtein)}>
            High protein
          </button>
          <select className="chip-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="name">A to Z</option>
            <option value="protein">Most protein</option>
            <option value="calories">Fewest calories</option>
          </select>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {recipes.length === 0 && <p className="empty">No recipes match. Try a different search or filter.</p>}
      <div className="grid">
        {recipes.map((r) => (
          <button key={r.id} className={`card meal-${r.mealType}`} onClick={() => setSelected(r)}>
            <div className="card-head">
              <span className="card-title">{r.name}</span>
              {r.isCustom && <span className="badge yours">Yours</span>}
            </div>
            <div className="badges">
              <span className="badge">{r.mealType}</span>
              {isHighProtein(r) && <span className="badge hp">High protein</span>}
            </div>
            <MacroStats recipe={r} />
            {(r.prepMinutes != null || r.cookMinutes != null) && (
              <div className="muted small">
                {r.prepMinutes != null ? `Prep ${r.prepMinutes}m` : ''}
                {r.prepMinutes != null && r.cookMinutes != null ? ' · ' : ''}
                {r.cookMinutes != null ? `Cook ${r.cookMinutes}m` : ''}
              </div>
            )}
          </button>
        ))}
      </div>
      {selected && <RecipeDetail recipe={selected} onClose={() => setSelected(null)} onDeleted={() => { setSelected(null); load(); }} />}
      {showForm && (
        <RecipeForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Calories, protein, carbs and fat as small stat tiles. */
function MacroStats({ recipe, big }: { recipe: Recipe; big?: boolean }) {
  const m = recipe.macros;
  if (m.calories == null) return <p className="muted small">Macros not listed</p>;
  const stats: [string, string][] = [
    [String(m.calories), 'kcal'],
    [`${m.protein ?? '—'}g`, 'protein'],
    [`${m.carbs ?? '—'}g`, 'carbs'],
    [`${m.fat ?? '—'}g`, 'fat'],
  ];
  return (
    <div className={big ? 'stats big' : 'stats'}>
      {stats.map(([v, l]) => (
        <span key={l} className="stat">
          <strong>{v}</strong>
          <span>{l}</span>
        </span>
      ))}
    </div>
  );
}

/** Full recipe card in a pop-up. Without onDeleted (e.g. opened from Today) it has no delete button. */
export function RecipeDetail({
  recipe,
  onClose,
  onDeleted,
  note,
}: {
  recipe: Recipe;
  onClose: () => void;
  onDeleted?: () => void;
  /** A line shown under the badges, e.g. how many servings are planned. */
  note?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    try {
      await api.deleteRecipe(recipe.id);
      onDeleted?.();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{recipe.name}</h2>
          <button className="icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="badges">
          <span className="badge">{recipe.mealType}</span>
          <span className="badge subtle">{mealBadge(recipe.mealType)}</span>
          {recipe.isCustom && <span className="badge yours">Yours</span>}
          {recipe.yieldText && <span className="badge subtle">Makes {recipe.yieldText}</span>}
        </div>
        {note && <p className="detail-note">{note}</p>}
        {recipe.description && <p>{recipe.description}</p>}
        <MacroStats recipe={recipe} big />
        {recipe.macros.calories != null && <p className="muted small per-serving">Per serving</p>}
        {(recipe.prepMinutes != null || recipe.cookMinutes != null) && (
          <p className="muted small">
            {recipe.prepMinutes != null ? `Prep ${recipe.prepMinutes} min` : ''}
            {recipe.prepMinutes != null && recipe.cookMinutes != null ? ' · ' : ''}
            {recipe.cookMinutes != null ? `Cook ${recipe.cookMinutes} min` : ''}
          </p>
        )}
        <h3 className="detail-h">Ingredients{recipe.baseServings ? ` (for ${recipe.baseServings} servings)` : ''}</h3>
        <ul className="ingredients">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              {ing.amount != null ? `${ing.amount} ` : ''}
              {ing.unit ? `${ing.unit} ` : ''}
              {ing.name}
            </li>
          ))}
        </ul>
        <h3 className="detail-h">Method</h3>
        {recipe.instructions ? (
          <ol className="steps">
            {recipe.instructions.split('\n').filter((s) => s.trim()).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="muted">No written steps in the box for this one — it links out to the original video.</p>
        )}
        {recipe.sourceUrl && (
          <p className="source">
            Source:{' '}
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              {recipe.sourceName ?? recipe.sourceUrl}
            </a>
          </p>
        )}
        {!recipe.sourceUrl && recipe.sourceName && <p className="muted">Source: {recipe.sourceName}</p>}
        {error && <p className="error">{error}</p>}
        {recipe.isCustom && onDeleted && (
          <button className="danger" onClick={remove}>
            Delete this recipe
          </button>
        )}
      </div>
    </div>
  );
}

interface IngredientRow {
  name: string;
  amount: string;
  unit: string;
  section: string;
}

export function RecipeForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [baseServings, setBaseServings] = useState('2');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [cookMinutes, setCookMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([{ name: '', amount: '', unit: '', section: 'Produce' }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createRecipe({
        name,
        mealType,
        baseServings: num(baseServings),
        prepMinutes: num(prepMinutes),
        cookMinutes: num(cookMinutes),
        description: description || null,
        instructions: instructions || null,
        macros: { calories: num(calories), protein: num(protein), carbs: num(carbs), fat: num(fat) },
        ingredients: rows
          .filter((r) => r.name.trim())
          .map((r) => ({ name: r.name.trim(), amount: num(r.amount), unit: r.unit.trim() || null, section: r.section })),
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Add your own recipe</h2>
          <button className="icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={submit} className="form">
          <label>
            Name
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Grandma's chicken soup" />
          </label>
          <div className="row">
            <label>
              Meal type
              <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </label>
            <label>
              Servings it makes
              <input type="number" min="1" step="any" value={baseServings} onChange={(e) => setBaseServings(e.target.value)} />
            </label>
            <label>
              Prep (min)
              <input type="number" min="0" value={prepMinutes} onChange={(e) => setPrepMinutes(e.target.value)} />
            </label>
            <label>
              Cook (min)
              <input type="number" min="0" value={cookMinutes} onChange={(e) => setCookMinutes(e.target.value)} />
            </label>
          </div>
          <label>
            Description (optional)
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <fieldset>
            <legend>Per-serving macros (optional)</legend>
            <div className="row">
              <label>
                Calories
                <input type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
              </label>
              <label>
                Protein (g)
                <input type="number" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
              </label>
              <label>
                Carbs (g)
                <input type="number" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
              </label>
              <label>
                Fat (g)
                <input type="number" min="0" value={fat} onChange={(e) => setFat(e.target.value)} />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Ingredients</legend>
            {rows.map((row, i) => (
              <div className="row ing" key={i}>
                <input placeholder="Amount" type="number" step="any" min="0" value={row.amount} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))} />
                <input placeholder="Unit" value={row.unit} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, unit: e.target.value } : r)))} />
                <input placeholder="Ingredient" value={row.name} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
                <select value={row.section} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, section: e.target.value } : r)))}>
                  {STORE_SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" className="icon" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove ingredient">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => setRows([...rows, { name: '', amount: '', unit: '', section: 'Other' }])}>
              + Ingredient
            </button>
          </fieldset>
          <label>
            Steps (one per line)
            <textarea rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={'Chop the onion.\nBrown the meat…'} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </form>
      </div>
    </div>
  );
}
