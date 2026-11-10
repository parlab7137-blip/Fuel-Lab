import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthProvider, useAuth } from './auth';
import RecipesView from './views/RecipesView';
import PlannerView from './views/PlannerView';
import ShoppingView from './views/ShoppingView';
import TodayView from './views/TodayView';
import Logo, { FullLogo } from './components/Logo';
import UpdateBanner from './components/UpdateBanner';
import SettingsView from './views/SettingsView';

type Tab = 'today' | 'recipes' | 'planner' | 'shopping' | 'settings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'planner', label: 'Planner' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'settings', label: 'Settings' },
];

function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-logo">
          <FullLogo size={180} />
        </h1>
        <p className="muted">Plan the week, shop once, and let the plan drive your calorie counter.</p>
        <form onSubmit={submit} className="form">
          {mode === 'register' && (
            <label>
              Name
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
          )}
          <label>
            Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Log in' : 'Create household account'}
          </button>
        </form>
        <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'No account yet? Create one' : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('today');

  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <AuthScreen />;

  return (
    <div className="shell">
      <header>
        <span className="logo"><Logo size={28} /> FuelLab</span>
        <nav>
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'nav active' : 'nav'} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        <span className="muted small">{user.name}</span>
      </header>
      <main>
        {tab === 'today' && <TodayView />}
        {tab === 'recipes' && <RecipesView />}
        {tab === 'planner' && <PlannerView />}
        {tab === 'shopping' && <ShoppingView />}
        {tab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
      <UpdateBanner />
    </AuthProvider>
  );
}
