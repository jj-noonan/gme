import type { ScheduleRow } from "@gme/shared";
import { useEffect, useState } from "react";
import { loadSchedule } from "../lib/schedule.js";

export function useSchedule() {
  const [rows, setRows] = useState<ScheduleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSchedule()
      .then((file) => {
        if (!cancelled) setRows(file.rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, error };
}
