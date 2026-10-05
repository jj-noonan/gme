/**
 * Google's terms require crediting Google Maps wherever its routes are shown
 * without a Google map — here, the subway badges and times.
 */
export function GoogleCredit({ show }: { show: boolean }) {
  return show ? <p className="board-credit">Subway routes: Google Maps</p> : null;
}
