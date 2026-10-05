/** MTA route bullet colors (5a). Text is black on N Q R W, white elsewhere. */
export const SUBWAY_LINES = {
  "1": { bg: "#EE352E", fg: "#FFFFFF" },
  "2": { bg: "#EE352E", fg: "#FFFFFF" },
  "3": { bg: "#EE352E", fg: "#FFFFFF" },
  "4": { bg: "#00933C", fg: "#FFFFFF" },
  "5": { bg: "#00933C", fg: "#FFFFFF" },
  "6": { bg: "#00933C", fg: "#FFFFFF" },
  "7": { bg: "#B933AD", fg: "#FFFFFF" },
  "A": { bg: "#0039A6", fg: "#FFFFFF" },
  "C": { bg: "#0039A6", fg: "#FFFFFF" },
  "E": { bg: "#0039A6", fg: "#FFFFFF" },
  "B": { bg: "#FF6319", fg: "#FFFFFF" },
  "D": { bg: "#FF6319", fg: "#FFFFFF" },
  "F": { bg: "#FF6319", fg: "#FFFFFF" },
  "M": { bg: "#FF6319", fg: "#FFFFFF" },
  "G": { bg: "#6CBE45", fg: "#FFFFFF" },
  "J": { bg: "#996633", fg: "#FFFFFF" },
  "Z": { bg: "#996633", fg: "#FFFFFF" },
  "L": { bg: "#A7A9AC", fg: "#FFFFFF" },
  "N": { bg: "#FCCC0A", fg: "#000000" },
  "Q": { bg: "#FCCC0A", fg: "#000000" },
  "R": { bg: "#FCCC0A", fg: "#000000" },
  "W": { bg: "#FCCC0A", fg: "#000000" },
  "S": { bg: "#808183", fg: "#FFFFFF" },
} as const;

export type SubwayLine = keyof typeof SUBWAY_LINES;

/** "A Line" / "A" / "a" -> "A"; null for anything that isn't a subway route (buses, PATH...). */
export function subwayLine(name: string): SubwayLine | null {
  const k = name.replace(/\s*line$/i, "").trim().toUpperCase();
  return k in SUBWAY_LINES ? (k as SubwayLine) : null;
}
