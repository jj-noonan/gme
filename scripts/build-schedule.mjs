#!/usr/bin/env node
// Regenerates data/schedule.json from data/schedule-source.json.
//
// Run this by hand (`npm run build:schedule`) whenever you've re-checked the
// Amtrak timetable PDFs and updated schedule-source.json. This is the manual
// "rebuild" trigger for now — there's no PDF scraper yet, see README.

import { readFileSync, writeFileSync } from "node:fs";

const dataDir = new URL("../data/", import.meta.url);
const source = JSON.parse(readFileSync(new URL("schedule-source.json", dataDir), "utf8"));

const KNOWN_STATIONS = new Set(["RUD", "CNV", "WHL", "FED", "ALB", "BLF", "BRA"]);

function splitTrainRoute(route) {
  const lastSpace = route.lastIndexOf(" ");
  const service = route.slice(0, lastSpace);
  const trainNumber = Number(route.slice(lastSpace + 1));
  if (!service || Number.isNaN(trainNumber)) {
    throw new Error(`Could not parse train route "${route}"`);
  }
  return { service, trainNumber };
}

function parseStationTime(field) {
  const [time, station] = field.split(" ");
  if (!time || !station) throw new Error(`Could not parse "${field}"`);
  return { time, station };
}

function to24Hour(clock) {
  const match = clock.match(/^(\d{1,2}):(\d{2})([AP])$/);
  if (!match) throw new Error(`Bad time "${clock}"`);
  const [, hh, mm, ampm] = match;
  let hour = Number(hh) % 12;
  if (ampm === "P") hour += 12;
  return `${String(hour).padStart(2, "0")}:${mm}`;
}

const rows = source.rows.map((row) => {
  const { service, trainNumber } = splitTrainRoute(row.trainRoute);
  const dep = parseStationTime(row.trainDeparture);
  const arr = parseStationTime(row.trainArrival);
  const stationCode = dep.station === "NYP" ? arr.station : dep.station;

  if (!KNOWN_STATIONS.has(stationCode)) {
    throw new Error(`Unknown station "${stationCode}" in row: ${JSON.stringify(row)}`);
  }
  if (dep.station !== "NYP" && arr.station !== "NYP") {
    throw new Error(`Row doesn't touch NYP at all: ${JSON.stringify(row)}`);
  }

  return {
    trainNumber,
    service,
    direction: row.direction,
    daysRaw: row.day,
    stationCode,
    scheduledDeparture: to24Hour(dep.time),
    scheduledArrival: to24Hour(arr.time),
  };
});

const seen = new Set();
for (const row of rows) {
  const key = JSON.stringify(row);
  if (seen.has(key)) throw new Error(`Duplicate row: ${key}`);
  seen.add(key);
}

const output = JSON.stringify({ asOf: source.asOf, source: source.source, rows }, null, 2) + "\n";

writeFileSync(new URL("schedule.json", dataDir), output);
// The web app fetches this at runtime; regenerated here so it never drifts
// from data/schedule.json (see apps/web/public/.gitignore).
writeFileSync(new URL("../apps/web/public/schedule.json", dataDir), output);

console.log(`Wrote ${rows.length} schedule rows to data/schedule.json and apps/web/public/schedule.json`);
