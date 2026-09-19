import type { ScheduleRow } from "@gme/shared";

interface ScheduleFile {
  asOf: string;
  source: string;
  rows: ScheduleRow[];
}

export async function loadSchedule(): Promise<ScheduleFile> {
  const response = await fetch(`${import.meta.env.BASE_URL}schedule.json`);
  if (!response.ok) throw new Error(`Failed to load schedule.json: ${response.status}`);
  return response.json();
}
