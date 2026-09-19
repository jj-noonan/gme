export type TabId = "N_TODAY" | "S_TODAY" | "N_TIMETABLE" | "S_TIMETABLE";

// Fixed order, always — see README.
const TABS: { id: TabId; label: string }[] = [
  { id: "N_TODAY", label: "Northbound · Today" },
  { id: "S_TODAY", label: "Southbound · Today" },
  { id: "N_TIMETABLE", label: "Northbound · Timetable" },
  { id: "S_TIMETABLE", label: "Southbound · Timetable" },
];

export function TabBar({ active, onSelect }: { active: TabId; onSelect: (id: TabId) => void }) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="Board view">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === active}
          className={`tab${tab.id === active ? " tab--active" : ""}`}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
