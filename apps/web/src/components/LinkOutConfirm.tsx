import { useEffect, useRef, useState } from "react";

interface PendingLink {
  href: string;
  /** What's on the other end, e.g. "Driving directions in Google Maps". */
  label: string;
}

/**
 * Asks before any link takes you off the board. Links out can be slow to
 * load, and they're small targets on a busy row, so a stray tap shouldn't
 * cost a trip to Google Maps and back.
 *
 * Listens at the document, so every off-site link is covered; a link names
 * its destination with `data-link-out`. Modifier clicks (open in new tab)
 * go straight through — that's already a deliberate choice.
 */
export function LinkOutConfirm() {
  const [pending, setPending] = useState<PendingLink | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.origin === window.location.origin) return;

      e.preventDefault();
      setPending({ href: link.href, label: link.dataset.linkOut ?? link.hostname });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!pending) return;
    openButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPending(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending]);

  if (!pending) return null;

  const open = () => {
    window.open(pending.href, "_blank", "noopener,noreferrer");
    setPending(null);
  };

  return (
    <div className="sheet-backdrop" onClick={() => setPending(null)}>
      <div
        className="link-out__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-out-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="link-out-title" className="link-out__title">
          Open {pending.label}?
        </p>
        <div className="link-out__actions">
          <button type="button" className="link-out__button" onClick={() => setPending(null)}>
            Cancel
          </button>
          <button
            ref={openButton}
            type="button"
            className="link-out__button link-out__button--primary"
            onClick={open}
          >
            Open ↗
          </button>
        </div>
      </div>
    </div>
  );
}
