// Base URL for the FuelLab API. Set EXPO_PUBLIC_API_URL at build/run time,
// e.g. EXPO_PUBLIC_API_URL=https://fuellab.vercel.app npx expo start
const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
export const API_URL: string = proc?.env?.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
