# fuellab-mobile

Expo / React Native phone app for FuelLab — the same API and features as the
web app: Today counter (ring, macro bars, week strip), Recipes with detail
and an Add-your-own form, weekly Planner, Shopping list with check-off, and
Settings. Auth tokens are stored in SecureStore.

```bash
npm install
npx expo start        # Expo Go / dev client; set EXPO_PUBLIC_API_URL to your server
npm run tsc           # typecheck
```

For a store build: `eas build --platform ios` then `eas submit` — needs Apple
Developer enrollment ($99/yr). The bundle id is `com.fuellab.app`
(`app.json`); "FuelLab" is a working name.
