import { hasBucket, toggleBucket, type TimeBucket } from "../lib/search.js";
import { Icon } from "./Icon.js";

const BUCKETS: { bucket: TimeBucket; label: string }[] = [
  { bucket: "morning", label: "Morning" },
  { bucket: "afternoon", label: "Afternoon" },
  { bucket: "evening", label: "Evening" },
];

const PLACEHOLDER = "Search: ethan, 284, alb, morning, arrive by 6pm, sat";

/**
 * The board's search box. Self-contained — its own markup and styles — so
 * where it sits is one line in App.
 */
export function SearchBar({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  return (
    <div className="search-bar" role="search">
      <label className="search-bar__label" htmlFor="board-search">
        <Icon name="search" size={16} title="Search trips" />
      </label>
      <input
        id="board-search"
        className="search-bar__input"
        type="search"
        value={query}
        placeholder={PLACEHOLDER}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter just closes the phone keyboard; the list already updated.
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {query && (
        <button type="button" className="search-bar__clear" aria-label="Clear search" onClick={() => onChange("")}>
          ×
        </button>
      )}
      {/* One tap instead of typing, for the question asked most on the day. */}
      <div className="search-bar__chips" role="group" aria-label="Time of day">
        {BUCKETS.map(({ bucket, label }) => {
          const on = hasBucket(query, bucket);
          return (
            <button
              key={bucket}
              type="button"
              className={`search-chip${on ? " search-chip--on" : ""}`}
              aria-pressed={on}
              onClick={() => onChange(toggleBucket(query, bucket))}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
