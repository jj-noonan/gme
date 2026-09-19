# Green Mountain Express

A personal split-flap status board for Amtrak trains between NYP and the
Rutland, VT area. Not a public product — built for one rider.

## Layout

```
apps/web/          site (Vite + React + TS) — deploys to GitHub Pages
apps/status-api/   Fly.io proxy/cache for live Amtrak status
packages/shared/   day-code parser, station/geo data, recommendation logic (tested)
data/
  schedule-source.json   hand-maintained, edit this when Amtrak's timetable changes
  schedule.json           generated — do not edit directly
```

## Dev

```
npm install
npm run dev:web           # http://localhost:5173
npm run dev:status-api    # http://localhost:8080 (optional — live status only)
```

`apps/web` works fully without the status API running; it just shows
"SCHEDULED" instead of live delay info.

## Test

```
npm test
```

Covers the three places a silent bug would actually hurt: the Amtrak
day-of-operation parser (wrong day code = a train silently doesn't show up),
the drive-time/recommendation math, and the live-status reshaping (Lake
Shore's Boston-section trains never leaking into NYP-facing data).

## Updating the schedule

1. Re-check the timetable PDFs, edit `data/schedule-source.json`.
2. `npm run build:schedule` — regenerates `data/schedule.json` and
   `apps/web/public/schedule.json`.
3. Commit and push, or re-run the "Deploy web" GitHub Action manually
   (Actions tab → Deploy web → Run workflow) if nothing else changed.

## Deploy

- **Web**: GitHub Actions builds and publishes `apps/web` to GitHub Pages
  automatically on push to `main` (workflow also runs `npm test` first).
- **Status API**: `fly deploy --config apps/status-api/fly.toml --dockerfile apps/status-api/Dockerfile`
  from the repo root. After the first deploy, set `ALLOWED_ORIGINS` in
  `apps/status-api/fly.toml` (or `fly secrets`) to your actual GitHub Pages
  URL, and set `VITE_STATUS_API_URL` when building `apps/web` to point at
  the deployed Fly URL.
- Custom domain (`greenmountain.express`): not wired up yet.

## Known shortcuts

Deliberate, for a low-traffic personal site — revisit if that ever changes:

- Schedule is a manually maintained snapshot, not live-scraped from PDFs.
- Drive-time estimates use straight-line distance × a flat average speed,
  not a real routing API.
- NYC-side transit time is a flat 50-minute assumption.
- "Today" filtering uses the viewer's local clock, assumed to be Eastern time.
- No automated schedule-drift alerting yet — `fly logs` on status-api shows
  actual-vs-scheduled deltas if you want to eyeball it.
