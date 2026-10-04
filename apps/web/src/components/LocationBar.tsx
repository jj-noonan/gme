import type { Direction } from "@gme/shared";
import { useEffect, useState } from "react";
import type { PlaceState, PlaceStatus } from "../hooks/usePlace.js";
import type { IconName } from "../lib/icons.js";
import { DEFAULT_PLACES, settingFromText, type PlaceArea } from "../lib/places.js";
import { Icon } from "./Icon.js";

const AREA_ICONS: Record<PlaceArea, IconName> = { vt: "vermont", nyc: "new-york" };
const AREA_NAMES: Record<PlaceArea, string> = { vt: "VT location", nyc: "NYC location" };
const AREA_REGIONS: Record<PlaceArea, string> = { vt: "VT or eastern NY", nyc: "NYC" };

/** The text a box shows for its current setting. */
function displayText(area: PlaceArea, place: PlaceState): string {
  switch (place.setting.kind) {
    case "default":
      return DEFAULT_PLACES[area].label;
    case "current":
      return "Current location";
    case "address":
      return place.setting.text;
  }
}

/** A short note under the box, or null when there's nothing worth saying. */
function statusNote(area: PlaceArea, status: PlaceStatus, matchedLabel: string | null): string | null {
  const fallback = DEFAULT_PLACES[area].label;
  switch (status) {
    case "ready":
      return matchedLabel;
    case "locating":
      return "Finding your location…";
    case "looking-up":
      return "Looking up that address…";
    case "not-found":
      return `No address found in ${AREA_REGIONS[area]} — using ${fallback}.`;
    case "outside-area":
      return `You're not in ${AREA_REGIONS[area]} — using ${fallback}.`;
    case "unavailable":
      return `Couldn't look that up right now — using ${fallback}.`;
  }
}

function PlaceField({
  area,
  place,
  allowCurrent,
}: {
  area: PlaceArea;
  place: PlaceState;
  allowCurrent?: boolean;
}) {
  const shown = displayText(area, place);
  const [draft, setDraft] = useState(shown);
  const [editing, setEditing] = useState(false);

  // Keep the box in step with the setting whenever the rider isn't typing in it.
  useEffect(() => {
    if (!editing) setDraft(shown);
  }, [shown, editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() === shown) return;
    place.setSetting(settingFromText(area, draft));
  };

  const usingCurrent = place.setting.kind === "current";
  const note = statusNote(area, place.status, place.matchedLabel);
  const noteId = `${area}-location-note`;

  return (
    <div className="place-field">
      <form
        className="place-field__row"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <label className="place-field__label" htmlFor={`${area}-location`}>
          <Icon name={AREA_ICONS[area]} size={20} title={AREA_NAMES[area]} />
        </label>
        <input
          id={`${area}-location`}
          className="place-field__input"
          type="text"
          inputMode="search"
          enterKeyHint="done"
          autoComplete="street-address"
          placeholder={`${AREA_NAMES[area]}: street address`}
          aria-describedby={note ? noteId : undefined}
          value={draft}
          onFocus={(e) => {
            setEditing(true);
            // Typing over a default or "Current location" is the common case.
            if (place.setting.kind !== "address") e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
        {allowCurrent && (
          <button
            type="button"
            className={`place-field__locate${usingCurrent ? " place-field__locate--active" : ""}`}
            aria-pressed={usingCurrent}
            aria-label="Use current location"
            title="Use current location"
            onClick={() => place.setSetting(usingCurrent ? { kind: "default" } : { kind: "current" })}
          >
            <Icon name="map-pin" size={20} />
          </button>
        )}
      </form>
      {note && (
        <p id={noteId} className="place-field__note" aria-live="polite">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * The two ends of every trip, along the bottom of the board, in the order
 * you travel them: NYC then VT northbound, VT then NYC southbound. The
 * starting box is the one that can use your current location — that's where
 * you'd be standing.
 */
export function LocationBar({
  vt,
  nyc,
  direction,
}: {
  vt: PlaceState;
  nyc: PlaceState;
  direction: Direction;
}) {
  const northbound = direction === "N";
  const vtField = <PlaceField key="vt" area="vt" place={vt} allowCurrent={!northbound} />;
  const nycField = <PlaceField key="nyc" area="nyc" place={nyc} allowCurrent={northbound} />;
  return (
    <footer className="place-bar">{northbound ? [nycField, vtField] : [vtField, nycField]}</footer>
  );
}
