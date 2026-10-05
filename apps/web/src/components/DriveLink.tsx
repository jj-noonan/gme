import type { Coordinate, StationCode } from "@gme/shared";
import { drivingDirectionsUrl } from "../lib/googleMaps.js";
import { Icon } from "./Icon.js";

/** The car icon for the VT drive, linking to the same drive in Google Maps. */
export function DriveLink({
  vtLocation,
  stationCode,
  toStation,
}: {
  vtLocation: Coordinate;
  stationCode: StationCode;
  toStation: boolean;
}) {
  return (
    <a
      className="leg-link"
      href={drivingDirectionsUrl(vtLocation, stationCode, toStation)}
      target="_blank"
      rel="noopener noreferrer"
      data-link-out="driving directions in Google Maps"
      aria-label="Driving directions. Open in Google Maps"
      title="Open in Google Maps"
    >
      <Icon name="drive" size={16} />
    </a>
  );
}
