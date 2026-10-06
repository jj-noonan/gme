# Green Mountain Express

A personal split-flap status board for Amtrak trains between NYP and the
Rutland, VT area. Not a public product — built for one rider.

## Layout

```
apps/web/          site (Vite + React + TS) — deploys to GitHub Pages
apps/status-api/   Fly.io proxy/cache for live Amtrak status
packages/shared/   day-code parser, station/geo data, recommendation logic (tested)
data/
  schedule-import.json   which routes/stations to pull from Amtrak's GTFS feed
  schedule-source.json   imported from GTFS (can be hand-edited between imports)
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

1. `npm run import:schedule` — downloads Amtrak's GTFS feed and rewrites
   `data/schedule-source.json` with the trains `data/schedule-import.json`
   asks for, as they run in the week starting today, then regenerates
   `data/schedule.json` and `apps/web/public/schedule.json`.
   - `-- --from 2026-11-16` imports a different week. The feed holds a year
     of overlapping timetables (track work, holidays, timetable changes), so
     pick a week that represents what riders will see; re-import when a
     temporary change ends.
   - `-- --feed ./GTFS.zip` uses a feed you already downloaded.
2. Review the diff of `data/schedule-source.json`. If a train number is new,
   add it to `TRACKED_TRAIN_NUMBERS` in `packages/shared/src/stations.ts`
   (a test fails until you do).
3. Commit and push, or re-run the "Deploy web" GitHub Action manually
   (Actions tab → Deploy web → Run workflow) if nothing else changed.

To hand-edit instead, change `data/schedule-source.json` and run
`npm run build:schedule`; the next import will overwrite it.

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

- The schedule is one imported week of Amtrak's GTFS feed, not live: re-run
  the import when timetables change.
- VT-side drives run between the station and the vt-location — Jones Donuts
  by default, or a place, address or current location set in the box at the
  bottom of the board (saved per device; only the typed text is stored, and
  it's looked up again on each load, via Google Places, falling back to
  Mapbox's address-only geocoding). They're routed and traffic-aware
  via Mapbox, through status-api's `/drive` (needs the `MAPBOX_TOKEN` Fly
  secret) — timetable rows priced for the next day that train runs. When
  status-api can't answer, they fall back to straight-line distance × a flat
  average speed.
- NYC-side trips run between Penn Station and the nyc-location (Bishop
  Loughlin HS by default), planned by Google's Routes API (subway and bus)
  through status-api's `/transit` (needs the `GOOGLE_MAPS_API_KEY` Fly
  secret). They're planned on the schedule — fetched once per board, never
  cached, per Google's terms — and fall back to a flat 50 minutes when
  status-api can't answer.
- "Today" filtering uses the viewer's local clock, assumed to be Eastern time.
- No automated schedule-drift alerting yet — `fly logs` on status-api shows
  actual-vs-scheduled deltas if you want to eyeball it.
- Google Maps links (the drive and subway legs on each row) can't carry a
  departure or arrival time, so Maps plans the trip for *now*, not for the
  train's time. The board's own times are planned for the train.

## Later

Considered and deliberately parked. Each is a self-contained change:

- **Re-import the schedule after 2026-11-16.** The current import (week of
  2026-10-05) reflects autumn track work: Vermonter 54 leaves NYP at 9:00A on
  weekends, and most Sunday New Haven trains don't run. From the week of
  2026-11-16 the normal timetable returns (`npm run import:schedule`).

- **Google for driving too, one provider.** Driving stays on Mapbox: its free
  tier is far larger (~100k vs ~5k traffic-aware routes a month) and it
  allows short caching, which Google's terms don't. Swapping is contained to
  `apps/status-api/src/drive.ts`.
- **Delay-aware lookups.** Drive and subway legs are looked up for the
  train's *scheduled* arrival, not the delayed one, so a very late train gets
  traffic/subway timing for the wrong hour. Re-keying on live delay would mean
  a fresh lookup whenever the delay changes.
- **Keep status-api warm.** It scales to zero, so the first requests after
  idle hit a cold start (the web app retries through it). Setting
  `min_machines_running = 1` in `fly.toml` removes the wait for a small
  monthly cost.
- **Live schedule.** The schedule is one imported week (see above). Running
  the import on a schedule, per day of the week, would keep it current and
  could also alert on drift.
- **Real timezone handling.** "Today" uses the viewer's clock and assumes
  Eastern time; travellers in other timezones would see the wrong day's
  trains near midnight.
