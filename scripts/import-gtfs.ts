// Regenerates data/schedule-source.json from Amtrak's GTFS feed, using the
// selection rules in data/schedule-import.json, then runs
// scripts/build-schedule.mjs to turn it into data/schedule.json as before.
//
//   npm run import:schedule                        # current feed, week from today
//   npm run import:schedule -- --from 2026-11-16   # a different week
//   npm run import:schedule -- --feed ./GTFS.zip   # a feed you already have
//
// The feed holds a year of overlapping schedules (timetable changes, track
// work, holidays), so the board shows one week of it: the seven days from
// --from. Pick a representative week, run this when schedules change, and
// review the diff before committing.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { parseCsv, scheduleRows, type ImportConfig } from "./gtfsSchedule.js";

const { values: args } = parseArgs({
  options: { from: { type: "string" }, feed: { type: "string" } },
});
const today = new Date();
const from = args.from
  ? new Date(`${args.from}T00:00:00Z`)
  : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
if (Number.isNaN(from.getTime())) throw new Error(`Bad --from date "${args.from}"`);

const dataDir = new URL("../data/", import.meta.url);
const config = JSON.parse(
  readFileSync(new URL("schedule-import.json", dataDir), "utf8"),
) as ImportConfig;

async function feedZip(): Promise<string> {
  if (args.feed) return args.feed;
  console.log(`Downloading ${config.feed}…`);
  const response = await fetch(config.feed);
  if (!response.ok) throw new Error(`${config.feed} responded ${response.status}`);
  const path = join(mkdtempSync(join(tmpdir(), "gtfs-")), "GTFS.zip");
  writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

const zip = await feedZip();
const files = execFileSync("unzip", ["-Z1", zip]).toString("utf8").split("\n");
const read = (name: string) =>
  files.includes(name)
    ? parseCsv(execFileSync("unzip", ["-p", zip, name], { maxBuffer: 512 * 1024 * 1024 }).toString("utf8"))
    : [];

const feedInfo = read("feed_info.txt")[0] ?? {};
const rows = scheduleRows(
  {
    routes: read("routes.txt"),
    trips: read("trips.txt"),
    calendar: read("calendar.txt"),
    calendarDates: read("calendar_dates.txt"),
    stopTimes: read("stop_times.txt"),
  },
  config,
  from,
);

const asOf = from.toISOString().slice(0, 10);
const source = {
  asOf,
  source: `${config.feed} (Amtrak GTFS, feed version ${feedInfo.feed_version ?? "unknown"}, week of ${asOf}), via scripts/import-gtfs.ts and data/schedule-import.json`,
  rows,
};
writeFileSync(new URL("schedule-source.json", dataDir), JSON.stringify(source, null, 2) + "\n");
console.log(`Wrote ${rows.length} rows to data/schedule-source.json (week of ${asOf})`);

execFileSync("node", [new URL("build-schedule.mjs", import.meta.url).pathname], { stdio: "inherit" });
