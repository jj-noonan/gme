import type { Coordinate, StationCode } from "@gme/shared";
import type { ReactNode } from "react";
import { drivingDirectionsUrl } from "../lib/googleMaps.js";
import { Icon } from "./Icon.js";

/**
 * The VT drive — the car icon plus whatever's passed as children, the
 * duration — as one link to the same drive in Google Maps.
 */
export function DriveLink({
  vtLocation,
  stationCode,
  toStation,
  children,
}: {
  vtLocation: Coordinate;
  stationCode: StationCode;
  toStation: boolean;
  children: ReactNode;
}) {
  return (
    <a
      className="leg-link"
      href={drivingDirectionsUrl(vtLocation, stationCode, toStation)}
      target="_blank"
      rel="noopener noreferrer"
      data-link-out="driving directions in Google Maps"
      aria-label="Open driving directions in Google Maps"
      title="Open in Google Maps"
    >
      <Icon name="drive" size={16} />
      {children}
    </a>
  );
}
