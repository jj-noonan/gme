const EASTERN = "America/New_York";

function easternParts(instant: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: EASTERN,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
}

/** An instant's Eastern wall-clock time as "YYYY-MM-DDTHH:MM" — the form legs are given in. */
export function easternLocal(instant: Date): string {
  const p = easternParts(instant);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * The instant an Eastern wall-clock "YYYY-MM-DDTHH:MM" refers to. Reads the
 * local time as if it were UTC, then corrects by however far Eastern is from
 * UTC at that moment (re-checked once, for times near a DST switch).
 */
export function easternLocalToInstant(local: string): Date {
  const asUtc = Date.parse(`${local}:00Z`);
  const offsetAt = (instant: number) => Date.parse(`${easternLocal(new Date(instant))}:00Z`) - instant;
  const first = asUtc - offsetAt(asUtc);
  return new Date(asUtc - offsetAt(first));
}
