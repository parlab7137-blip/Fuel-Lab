# Deploying FuelLab (Vercel + Turso)

The web app is served by Vercel as static files. The API runs as one Vercel function
(`api/index.js` → the Express app in `fuellab-server`). Data lives in a Turso database.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable             | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| `TURSO_DATABASE_URL` | `libsql://<db-name>-<org>.turso.io` (from Turso)         |
| `TURSO_AUTH_TOKEN`   | database token from Turso                                |
| `JWT_SECRET`         | long random string (keep it secret; changing it logs everyone out) |
| `NODE_ENV`           | `production`                                             |

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Build settings

All in `vercel.json`, except two dashboard settings: Root Directory empty (repo root) and
Framework Preset **Other**.
`npm run build` builds shared → web → server, and the output is `fuellab-web/dist`.

## Local development

```bash
npm install
npm run build
npm start            # http://localhost:4000, uses fuellab-server/data/fuellab.db
```

`npm run dev:web` runs Vite on :5173 and forwards `/api` to the server on :4000.
Point the local server at Turso instead by setting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

## Installing on a phone

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.
- **Android (Chrome):** open the site → ⋮ menu → **Add to Home screen** / **Install app**.

It opens full-screen with the FuelLab leaf icon. Updates deploy automatically; closing and
reopening the app picks them up.

## Regenerating icons

```bash
node fuellab-web/scripts/make-icons.mjs
```

## Commit author (Vercel Hobby plan)

Vercel's Hobby plan only builds commits whose author is the GitHub account that owns the
repo, and it blocks commits that list co-authors. This repo commits as:

```bash
git config user.name "parlab7137-blip"
git config user.email "335737892+parlab7137-blip@users.noreply.github.com"
```

Empty commits are skipped ("didn't affect this project"); a deploy needs a real file change,
or use **Redeploy** in the Vercel dashboard.

## First deploy checklist

1. Create an empty GitHub repo (e.g. `parlab7137-blip/FuelLab`) and push `main`.
2. Turso: create a database (e.g. `fuellab`), then copy its URL and create a token.
3. Vercel: **Add New → Project**, import the repo. Leave **Root Directory** empty and set
   **Framework Preset** to **Other** (Vercel may guess Express; that skips the shared build).
4. Add the environment variables above, then **Deploy**. The first request creates the
   tables and loads the 100 starter recipes.
