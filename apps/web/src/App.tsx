import { useEffect, useState } from "react";
import { TabBar, type TabId } from "./components/TabBar.js";
import { TimetableBoard } from "./components/TimetableBoard.js";
import { TodayBoard } from "./components/TodayBoard.js";
import { useSchedule } from "./hooks/useSchedule.js";
import { useTrainStatuses } from "./hooks/useTrainStatuses.js";
import { useUserLocation } from "./hooks/useUserLocation.js";

export function App() {
  const { rows, error: scheduleError } = useSchedule();
  const { location, region, resolved } = useUserLocation();
  const [activeTab, setActiveTab] = useState<TabId>("N_TODAY");
  const [userPickedTab, setUserPickedTab] = useState(false);

  // Once we know the region, default to the appropriate "Today" tab —
  // unless the rider has already picked a tab themselves.
  useEffect(() => {
    if (userPickedTab || !resolved) return;
    setActiveTab(region === "NYC" ? "N_TODAY" : "S_TODAY");
  }, [region, resolved, userPickedTab]);

  const isTodayTab = activeTab === "N_TODAY" || activeTab === "S_TODAY";
  const { statuses } = useTrainStatuses(isTodayTab);

  return (
    <div className="board">
      <TabBar
        active={activeTab}
        onSelect={(id) => {
          setUserPickedTab(true);
          setActiveTab(id);
        }}
      />
      <main className="board-main">
        {scheduleError && <p className="board-error">Couldn't load the schedule: {scheduleError}</p>}
        {!rows && !scheduleError && <p className="board-empty">Loading schedule…</p>}
        {rows && activeTab === "N_TODAY" && (
          <TodayBoard rows={rows} direction="N" statuses={statuses} userLocation={location} />
        )}
        {rows && activeTab === "S_TODAY" && (
          <TodayBoard rows={rows} direction="S" statuses={statuses} userLocation={location} />
        )}
        {rows && activeTab === "N_TIMETABLE" && (
          <TimetableBoard rows={rows} direction="N" userLocation={location} />
        )}
        {rows && activeTab === "S_TIMETABLE" && (
          <TimetableBoard rows={rows} direction="S" userLocation={location} />
        )}
      </main>
    </div>
  );
}
