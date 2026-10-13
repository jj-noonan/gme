import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSearchQuery } from "../hooks/useSearchQuery.js";
import { SearchBar } from "./SearchBar.js";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("SearchBar", () => {
  it("reports what's typed, and clears", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchBar query="" onChange={onChange} />);
    expect(screen.queryByLabelText("Clear search")).toBeNull();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ethan" } });
    expect(onChange).toHaveBeenLastCalledWith("ethan");

    rerender(<SearchBar query="ethan" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});

describe("useSearchQuery", () => {
  it("keeps the query in the URL, alongside an open trip", () => {
    window.history.replaceState(null, "", "/?q=alb#/trip/S_TODAY/284-ALB");
    const { result } = renderHook(() => useSearchQuery());
    expect(result.current[0]).toBe("alb");

    act(() => result.current[1]("after 2pm"));
    expect(result.current[0]).toBe("after 2pm");
    expect(window.location.search).toBe("?q=after+2pm");
    expect(window.location.hash).toBe("#/trip/S_TODAY/284-ALB");

    act(() => result.current[1](""));
    expect(window.location.search).toBe("");
  });
});
