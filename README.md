# Student Productivity Dashboard (StudyFlow)

Full-stack student productivity dashboard: React 19 + Vite + TypeScript frontend, Express 5 API running as a Cloudflare Worker, Cloudflare D1 database, Clerk authentication.

## What's in this folder
- `client/` - frontend source (Vite + React). Planner, calendar, pomodoro, attendance, analytics and subjects run in the browser; tasks sync per account.
- `server/` - backend API (Clerk session verification + per-user task CRUD on D1).
- `migrations/` - D1 database schema.
- `SETUP.md` - how the current demo is deployed, its honest limitations, and how to redeploy.
- `wrangler.jsonc` - Cloudflare Worker configuration for the live demo.

## Not included (regenerate locally)
- `node_modules/` and `dist/` - run `npm install` then `npm run build` in each folder.
- `server/.env` - local development values only, kept out on purpose. Copy `server/.env.example` to `server/.env` and fill in your own values. Never commit it.

## Run locally
See SETUP.md. In short: `wrangler dev` runs the Worker with a local D1, and the client dev server (`cd client && npm run dev`) expects `VITE_API_URL` to point at it.
