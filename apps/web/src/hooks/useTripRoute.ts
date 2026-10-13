import { useCallback, useEffect, useState } from "react";
import { formatTripHash, parseTripHash, type TripRoute } from "../lib/tripRoute.js";

// Whether the open trip was opened from the board in this page load, so
// closing it can go back (keeping browser history tidy) rather than replace.
let openedHere = false;

/** The trip whose detail page is open, kept in the URL hash so back and links work. */
export function useTripRoute(): {
  route: TripRoute | null;
  open: (route: TripRoute) => void;
  close: () => void;
} {
  const [route, setRoute] = useState(() => parseTripHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      const next = parseTripHash(window.location.hash);
      if (!next) openedHere = false;
      setRoute(next);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const open = useCallback((next: TripRoute) => {
    openedHere = true;
    window.location.hash = formatTripHash(next);
  }, []);

  const close = useCallback(() => {
    if (openedHere) {
      openedHere = false;
      window.history.back();
      return;
    }
    // Arrived on a trip link: drop the hash without leaving the site.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setRoute(null);
  }, []);

  return { route, open, close };
}
