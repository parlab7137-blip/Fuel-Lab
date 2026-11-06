/**
 * FuelLab mark: a green leaf on the diagonal with a white midrib and a short stem.
 * Same geometry as the home-screen icon (scripts/make-icons.mjs).
 */
export default function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="FuelLab logo">
      <rect width="100" height="100" rx="22" fill="#ffffff" stroke="var(--line)" />
      <line x1="32.3" y1="67.7" x2="24" y2="76" stroke="var(--green)" strokeWidth="5" strokeLinecap="round" />
      <path d="M32.3 67.7 A32 32 0 0 1 67.7 32.3 A32 32 0 0 1 32.3 67.7 Z" fill="var(--green)" />
      <line x1="36" y1="64" x2="64" y2="36" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
