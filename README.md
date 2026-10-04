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
- Custom domain: `greenmountain.express` (DNS + GitHub Pages custom domain
  are both set, HTTPS is enforced with a valid cert).

## Known shortcuts

Deliberate, for a low-traffic personal site — revisit if that ever changes:

- Schedule is a manually maintained snapshot, not live-scraped from PDFs.
- VT-side drives run between the station and the vt-location — Jones Donuts
  by default, or a street address / current location set in the box at the
  bottom of the board (saved per device; only the typed text is stored, and
  it's re-geocoded on each load). They're routed and traffic-aware
  via Mapbox, through status-api's `/drive` (needs the `MAPBOX_TOKEN` Fly
  secret) — timetable rows priced for the next day that train runs. When
  status-api can't answer, they fall back to straight-line distance × a flat
  average speed.
- NYC-side transit time is a flat 50-minute assumption; the nyc-location box
  (Bishop Loughlin HS by default) is saved but not used in any timing yet.
- "Today" filtering uses the viewer's local clock, assumed to be Eastern time.
- No automated schedule-drift alerting yet — `fly logs` on status-api shows
  actual-vs-scheduled deltas if you want to eyeball it.
