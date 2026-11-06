import * as SecureStore from 'expo-secure-store';
import type {
  CustomRecipeInput,
  PlanItem,
  PublicUser,
  Recipe,
  Settings,
  ShoppingGroup,
  TodayResponse,
  WeekLogDay,
} from '@fuellab/shared';
import { API_URL } from './config';

const TOKEN_KEY = 'fuellab.token';
let cachedToken: string | null = null;

export async function loadToken(): Promise<string | null> {
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

export async function saveToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cachedToken ? { Authorization: `Bearer ${cachedToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: PublicUser }>('/api/me'),

  listRecipes: (params: { search?: string; mealType?: string; highProtein?: boolean; sort?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.mealType) qs.set('mealType', params.mealType);
    if (params.highProtein) qs.set('highProtein', '1');
    if (params.sort) qs.set('sort', params.sort);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ recipes: Recipe[]; total: number }>(`/api/recipes${suffix}`);
  },
  createRecipe: (input: CustomRecipeInput) =>
    request<{ recipe: Recipe }>('/api/recipes', { method: 'POST', body: JSON.stringify(input) }),
  deleteRecipe: (id: string) => request<{ ok: true }>(`/api/recipes/${id}`, { method: 'DELETE' }),

  getPlan: (weekStart: string) => request<{ weekStart: string; items: PlanItem[] }>(`/api/plan?weekStart=${weekStart}`),
  addPlanItem: (weekStart: string, dayIndex: number, recipeId: string, servings: number) =>
    request<{ item: PlanItem }>('/api/plan', { method: 'POST', body: JSON.stringify({ weekStart, dayIndex, recipeId, servings }) }),
  removePlanItem: (id: string) => request<{ ok: true }>(`/api/plan/${id}`, { method: 'DELETE' }),

  getShopping: (weekStart: string) =>
    request<{ weekStart: string; groups: ShoppingGroup[] }>(`/api/shopping?weekStart=${weekStart}`),
  setShoppingCheck: (weekStart: string, key: string, checked: boolean) =>
    request<{ ok: true }>('/api/shopping/check', { method: 'POST', body: JSON.stringify({ weekStart, key, checked }) }),

  getToday: (date: string) => request<TodayResponse>(`/api/log/today?date=${date}`),
  getWeekLog: (weekStart: string) =>
    request<{ weekStart: string; targets: TodayResponse['targets']; days: WeekLogDay[] }>(`/api/log/week?weekStart=${weekStart}`),
  confirmPlanItem: (date: string, planItemId: string, servingsEaten?: number) =>
    request<{ entry: unknown; today: TodayResponse }>('/api/log/from-plan', {
      method: 'POST',
      body: JSON.stringify({ date, planItemId, servingsEaten }),
    }),
  quickAdd: (date: string, name: string, calories: number, protein: number, carbs?: number | null, fat?: number | null) =>
    request<{ entry: unknown; today: TodayResponse }>('/api/log/quick', {
      method: 'POST',
      body: JSON.stringify({ date, name, calories, protein, carbs, fat }),
    }),
  setEntryServings: (id: string, servingsEaten: number) =>
    request<{ entry: unknown; today: TodayResponse }>(`/api/log/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ servingsEaten }),
    }),
  deleteEntry: (id: string) => request<{ ok: true }>(`/api/log/${id}`, { method: 'DELETE' }),

  getSettings: () => request<{ settings: Settings }>('/api/settings'),
  saveSettings: (settings: Settings) =>
    request<{ settings: Settings }>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

/** Today as YYYY-MM-DD in local time. */
export function todayLocal(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
