import { describe, expect, it } from "vitest";
import { eventOverlapsDate, eventOverlapsRange, type EventRow } from "./events";

describe("events overlap predicates", () => {
  const base: Pick<EventRow, "id" | "name" | "color" | "event_type"> = {
    id: "e1",
    name: "Event",
    color: null,
    event_type: null,
  };

  it("treats start_date-only as single-day", () => {
    const ev: Pick<EventRow, "start_date" | "end_date"> = { start_date: "2024-01-10", end_date: null };
    expect(eventOverlapsDate(ev, "2024-01-10")).toBe(true);
    expect(eventOverlapsDate(ev, "2024-01-09")).toBe(false);
    expect(eventOverlapsDate(ev, "2024-01-11")).toBe(false);
    expect(eventOverlapsRange(ev as EventRow, "2024-01-10", "2024-01-20")).toBe(true);
    expect(eventOverlapsRange(ev as EventRow, "2024-01-01", "2024-01-09")).toBe(false);
  });

  it("treats end_date-only as single-day", () => {
    const ev: Pick<EventRow, "start_date" | "end_date"> = { start_date: null, end_date: "2024-01-10" };
    expect(eventOverlapsDate(ev, "2024-01-10")).toBe(true);
    expect(eventOverlapsDate(ev, "2024-01-09")).toBe(false);
    expect(eventOverlapsDate(ev, "2024-01-11")).toBe(false);
  });

  it("treats both dates as inclusive range", () => {
    const ev: Pick<EventRow, "start_date" | "end_date"> = { start_date: "2024-01-10", end_date: "2024-01-15" };
    expect(eventOverlapsDate(ev, "2024-01-10")).toBe(true);
    expect(eventOverlapsDate(ev, "2024-01-12")).toBe(true);
    expect(eventOverlapsDate(ev, "2024-01-15")).toBe(true);
    expect(eventOverlapsDate(ev, "2024-01-09")).toBe(false);
    expect(eventOverlapsDate(ev, "2024-01-16")).toBe(false);

    expect(eventOverlapsRange(ev as EventRow, "2024-01-12", "2024-01-20")).toBe(true);
    expect(eventOverlapsRange(ev as EventRow, "2024-01-01", "2024-01-09")).toBe(false);
  });

  it("returns false when both start_date and end_date are null", () => {
    const ev: Pick<EventRow, "start_date" | "end_date"> = { start_date: null, end_date: null };
    expect(eventOverlapsDate(ev, "2024-01-10")).toBe(false);
    expect(eventOverlapsRange(ev as EventRow, "2024-01-01", "2024-01-20")).toBe(false);
  });
});

