import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CalendarPermissionFlags } from "@/lib/auth/permission";
import { DataTable } from "./DataTable";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/toast-context", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/lib/view-mode-context", () => ({
  useViewMode: () => ({ viewMode: "detailed" as const }),
}));

vi.mock("@/components/dashboard/DashboardProvider", () => ({
  useDashboardCalendar: () => ({
    refreshRange: vi.fn(),
  }),
}));

const baseRow = {
  date: "2024-01-01",
  weekday: "月",
  id: "row-1",
  ansuko_baseline: 10,
  border_plus2: 2,
  border_plus4: 4,
  border_plus6: 6,
  target_plus: 4,
  actual_plus: 2,
  skip_pass_used: false,
  current_rank: "C1",
  rank_score_cumulative: 5,
  skip_pass_remaining_as_of: 3,
  memo: "メモ",
  event_id: null,
} as const;

const noopUpdateField = vi.fn(
  async () => {
    // no-op
  },
);

describe("DataTable permissions", () => {
  const ownerPermissions: CalendarPermissionFlags = {
    isOwner: true,
    canEditSchedule: true,
    canViewCalendar: true,
    canViewTable: true,
    canViewBorders: true,
    canViewMemo: true,
    canViewTargetActual: true,
    canViewRank: true,
    canViewEvents: true,
  };

  const listenerPermissions: CalendarPermissionFlags = {
    isOwner: false,
    canEditSchedule: false,
    canViewCalendar: true,
    canViewTable: true,
    canViewBorders: false,
    canViewMemo: false,
    canViewTargetActual: false,
    canViewRank: false,
    canViewEvents: true,
  };

  it("オーナー権限ではランク・ボーダー・メモ列が表示される", () => {
    render(
      <DataTable
        data={[baseRow]}
        permissions={ownerPermissions}
        calendarId="cal-1"
        onUpdateField={noopUpdateField}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "ランク" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ランクスコア" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "目標+" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "実績+" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "+2ボーダー" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "+4ボーダー" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "+6ボーダー" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "メモ" })).toBeInTheDocument();
  });

  it("リスナー権限ではランク・ボーダー・メモ列が非表示になる", () => {
    render(
      <DataTable
        data={[baseRow]}
        permissions={listenerPermissions}
        calendarId="cal-1"
        onUpdateField={noopUpdateField}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "日付" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "曜" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "スキップ" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "スキパ枚数" })).toBeInTheDocument();

    expect(
      screen.queryByRole("columnheader", { name: "ランク" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "ランクスコア" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "目標+" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "実績+" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "+2ボーダー" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "+4ボーダー" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "+6ボーダー" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "メモ" }),
    ).not.toBeInTheDocument();
  });
});

