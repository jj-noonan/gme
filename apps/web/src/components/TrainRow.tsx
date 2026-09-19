import type { ScheduleRow, TrainStatus } from "@gme/shared";
import { formatClock, stationName } from "../lib/format.js";
import { FlapText } from "./FlapText.js";

function statusLabel(status: TrainStatus | undefined, stationCode: string): string {
  if (!status) return "SCHEDULED";
  if (status.stale) return "STATUS UNAVAILABLE";
  if (!status.isTracked) return "SCHEDULED";
  const stop = status.perStation.find((s) => s.stationCode === stationCode);
  if (!stop) return "SCHEDULED";
  if (stop.comment) return stop.comment.toUpperCase();
  if (stop.actual) return "ARRIVED";
  return "ON TIME";
}

export function TrainRow({
  row,
  status,
  highlighted,
  showDays,
}: {
  row: ScheduleRow;
  status?: TrainStatus;
  highlighted?: boolean;
  showDays?: boolean;
}) {
  return (
    <div className={`board-row${highlighted ? " board-row--recommended" : ""}`}>
      <div className="board-row__time">
        <FlapText text={formatClock(row.scheduledDeparture)} width={6} />
      </div>
      <div className="board-row__main">
        <div className="board-row__train">
          <FlapText text={`${row.service} ${row.trainNumber}`} width={22} />
        </div>
        <div className="board-row__meta">
          <span className="board-row__station">{stationName(row.stationCode)}</span>
          {showDays && <span className="board-row__days">{row.daysRaw}</span>}
        </div>
      </div>
      <div className="board-row__status">
        <FlapText text={statusLabel(status, row.stationCode)} width={18} />
      </div>
    </div>
  );
}
