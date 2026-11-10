/** FuelLab mark: the bowl-and-chopsticks circle on red (public/icons, made by scripts/make-icons.cjs). */
export default function Logo({ size = 64 }: { size?: number }) {
  return <img className="logo-mark" src="/icons/logo-mark-96.png" width={size} height={size} alt="FuelLab logo" />;
}

/** The full logo with the "Fuel Lab" lettering, for the sign-in screen. */
export function FullLogo({ size = 200 }: { size?: number }) {
  return <img className="logo-full" src="/brand/logo-full.webp" width={size} height={size} alt="Fuel Lab" />;
}
