import { useCallback, useState } from "react";

const PARAM = "q";

/**
 * The board's search text, kept in the URL (?q=) so it survives opening a
 * trip and coming back, a reload, or a shared link. Replaces rather than
 * pushes history: each keystroke isn't a page to go back to.
 */
export function useSearchQuery(): [string, (query: string) => void] {
  const [query, setQueryState] = useState(
    () => new URLSearchParams(window.location.search).get(PARAM) ?? "",
  );

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    const params = new URLSearchParams(window.location.search);
    if (next.trim()) params.set(PARAM, next);
    else params.delete(PARAM);
    const search = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`,
    );
  }, []);

  return [query, setQuery];
}
