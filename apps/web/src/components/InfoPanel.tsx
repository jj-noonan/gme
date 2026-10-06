import {
  ASSUMED_NYC_TRANSIT_MINUTES,
  DEFAULT_AVG_DRIVE_MPH,
  NYC_STATION_BUFFER_MINUTES,
  TRIP_BUFFER_MINUTES,
  VT_RANGE_MILES,
} from "@gme/shared";
import { useEffect, useRef } from "react";

/**
 * How the board works, in a few lines each. The numbers come from the same
 * constants the timing code uses, so this can't drift from what it does.
 */
export function InfoPanel({ onClose }: { onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="info-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="info-panel__header">
          <h2 id="info-title">How this works</h2>
          <button ref={closeButton} type="button" className="info-panel__close" onClick={onClose}>
            Close
          </button>
        </header>

        <p>
          Each row is a door-to-door trip: from your start location, to the train, and on to your
          end location. The locations are the boxes at the bottom.
        </p>

        <h3>Leave by</h3>
        <p>
          Train departure, minus getting to the station, minus a buffer: {TRIP_BUFFER_MINUTES} min
          at VT/NY stations (parking), {NYC_STATION_BUFFER_MINUTES} min at Penn Station. The time
          under it is the whole gap, buffer included.
        </p>

        <h3>VT side: driving</h3>
        <p>
          Between your VT location and the station, by Mapbox, with traffic for when you'd be
          driving: typical traffic ahead of time, live traffic close in. If that's unavailable, a
          straight-line estimate at {DEFAULT_AVG_DRIVE_MPH} mph.
        </p>

        <h3>NYC side: subway</h3>
        <p>
          Between your NYC location and Penn Station, planned by Google for that train: arriving at
          Penn {NYC_STATION_BUFFER_MINUTES} min before it leaves, or leaving Penn when it gets in.
          Subway and bus only, waits included. If that's unavailable, a flat{" "}
          {ASSUMED_NYC_TRANSIT_MINUTES} min.
        </p>

        <h3>Arrive</h3>
        <p>
          When the train gets in (plus any live delay), plus the last leg. The time under it is
          the whole trip, door to door.
        </p>

        <h3>Live status</h3>
        <p>
          On the Today tabs, from Amtraker: "+12 MIN (ETD 11:18A)" is the delay where you board.
          A delay pushes back your arrival but not your leave-by time — the train may make time
          up, so plan on the schedule.
        </p>

        <h3>Today and Timetable</h3>
        <p>
          Today lists only trains you can still catch today. The highlighted row is the next one;
          southbound, it's the stop that gets you there soonest, door to door. Timetable lists
          every train, planned for the next day it runs.
        </p>

        <h3>Locations</h3>
        <p>
          Type a place or address, or use your current location for where you're starting. Saved
          on this device only. Away from both ends (outside the NYC area and over{" "}
          {VT_RANGE_MILES} miles from Rutland), the board opens on a timetable and current location
          is off.
        </p>

        <h3>Caveats</h3>
        <p>
          Drive and subway links open Google Maps planned for now, not for the train's time.
          Schedules are a snapshot of Amtrak's timetable. "Today" uses this device's clock,
          assumed to be Eastern time.
        </p>
      </section>
    </div>
  );
}
