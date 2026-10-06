import { nearerEnd } from "@gme/shared";
import { useCallback, useEffect, useState } from "react";
import { InfoPanel } from "./components/InfoPanel.js";
import { LinkOutConfirm } from "./components/LinkOutConfirm.js";
import { LocationBar } from "./components/LocationBar.js";
import { TabBar, type TabId } from "./components/TabBar.js";
import { TimetableBoard } from "./components/TimetableBoard.js";
import { TodayBoard } from "./components/TodayBoard.js";
import { usePlace } from "./hooks/usePlace.js";
import { useSchedule } from "./hooks/useSchedule.js";
import { useTrainStatuses } from "./hooks/useTrainStatuses.js";
import { useUserLocation } from "./hooks/useUserLocation.js";

export function App() {
  const { rows, error: scheduleError } = useSchedule();
  const user = useUserLocation();
  const { region, resolved } = user;
  const vt = usePlace("vt", user);
  const nyc = usePlace("nyc", user);
  const vtLocation = vt.coordinate;
  const nycLocation = nyc.coordinate;
  const [activeTab, setActiveTab] = useState<TabId>("N_TODAY");
  const [userPickedTab, setUserPickedTab] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const closeInfo = useCallback(() => setShowInfo(false), []);

  // Once we know the region, default to the appropriate tab — unless the
  // rider has already picked one themselves. Today when you're at one end
  // of the trip; away from both, today's leave-by times mean nothing, so
  // the timetable for whichever end is nearer.
  useEffect(() => {
    if (userPickedTab || !resolved) return;
    if (region === "NYC") setActiveTab("N_TODAY");
    else if (region === "RUTLAND") setActiveTab("S_TODAY");
    else setActiveTab(nearerEnd(user.location) === "NYC" ? "N_TIMETABLE" : "S_TIMETABLE");
  }, [region, resolved, userPickedTab, user.location]);

  const isTodayTab = activeTab === "N_TODAY" || activeTab === "S_TODAY";
  const { statuses } = useTrainStatuses(isTodayTab);

  return (
    <div className="board">
      <header className="top-bar">
        <TabBar
          active={activeTab}
          onSelect={(id) => {
            setUserPickedTab(true);
            setActiveTab(id);
          }}
        />
        <button
          type="button"
          className="info-button"
          aria-label="How this works"
          title="How this works"
          onClick={() => setShowInfo(true)}
        >
          ?
        </button>
      </header>
      <main className="board-main">
        {scheduleError && <p className="board-error">Couldn't load the schedule: {scheduleError}</p>}
        {!rows && !scheduleError && <p className="board-empty">Loading schedule…</p>}
        {rows && activeTab === "N_TODAY" && (
          <TodayBoard
            rows={rows}
            direction="N"
            statuses={statuses}
            vtLocation={vtLocation}
            nycLocation={nycLocation}
          />
        )}
        {rows && activeTab === "S_TODAY" && (
          <TodayBoard
            rows={rows}
            direction="S"
            statuses={statuses}
            vtLocation={vtLocation}
            nycLocation={nycLocation}
          />
        )}
        {rows && activeTab === "N_TIMETABLE" && (
          <TimetableBoard
            rows={rows}
            direction="N"
            vtLocation={vtLocation}
            nycLocation={nycLocation}
          />
        )}
        {rows && activeTab === "S_TIMETABLE" && (
          <TimetableBoard
            rows={rows}
            direction="S"
            vtLocation={vtLocation}
            nycLocation={nycLocation}
          />
        )}
      </main>
      <LinkOutConfirm />
      {showInfo && <InfoPanel onClose={closeInfo} />}
      <LocationBar
        vt={vt}
        nyc={nyc}
        direction={activeTab.startsWith("N") ? "N" : "S"}
        away={resolved && region === "AWAY"}
      />
    </div>
  );
}
