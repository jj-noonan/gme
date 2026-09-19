import type { ScheduleRow } from "@gme/shared";

/**
 * Alternates true/false each time the train number changes, so consecutive
 * stops of the same train share a band — matching the original sheet's row
 * banding (helps tell "one train, several stops" from "the next train").
 */
export function computeRowBands(rows: ScheduleRow[]): boolean[] {
  let band = false;
  let prevTrain: number | null = null;
  return rows.map((r) => {
    if (r.trainNumber !== prevTrain) {
      band = !band;
      prevTrain = r.trainNumber;
    }
    return band;
  });
}
