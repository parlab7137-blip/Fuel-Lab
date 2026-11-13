// Small stroke icons for the tab bar; they take the text colour.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function TodayIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5H12z" fill="currentColor" stroke="none" opacity="0.35" />
    </svg>
  );
}

export function RecipesIcon() {
  return (
    <svg {...base}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
      <path d="M9 8h7M9 12h5" />
    </svg>
  );
}

export function PlannerIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function ShoppingIcon() {
  return (
    <svg {...base}>
      <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg {...base}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}
