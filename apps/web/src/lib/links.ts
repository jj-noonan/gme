import { boardingStationCode, changeStationCode, type ScheduleRow } from "@gme/shared";

// Amtrak's booking form lives on its home page; there's no documented (or,
// in testing, working) way to pre-fill it from a link.
const AMTRAK_BOOKING_URL = "https://www.amtrak.com/home.html";
// Cape Air sells the Penn Station shuttle and flight together as ZYP ↔ LEB.
const CAPE_AIR_BOOKING_URL = "https://www.capeair.com/";

/** A link off the board, and what the confirm sheet calls it (see LinkOutConfirm). */
export interface LinkOut {
  href: string;
  linkOut: string;
}

/**
 * Where to buy this row's tickets. Neither site takes a pre-filled search, so
 * the confirm sheet says what to search for instead.
 */
export function ticketsLink(row: ScheduleRow): LinkOut {
  if (row.mode === "flight") {
    const route =
      row.direction === "N" ? "Penn Sta (ZYP) to Lebanon (LEB)" : "Lebanon (LEB) to Penn Sta (ZYP)";
    return { href: CAPE_AIR_BOOKING_URL, linkOut: `Cape Air to buy tickets (search ${route})` };
  }
  return {
    href: AMTRAK_BOOKING_URL,
    linkOut: `Amtrak to buy tickets (search ${boardingStationCode(row)} to ${changeStationCode(row)})`,
  };
}

/** The train's live status page on Amtraker. */
export function statusLink(row: ScheduleRow): LinkOut {
  return {
    href: `https://amtraker.com/trains/${row.trainNumber}`,
    linkOut: `live status for train ${row.trainNumber} on Amtraker`,
  };
}
