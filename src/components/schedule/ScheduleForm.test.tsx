import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScheduleForm } from "./ScheduleForm";

vi.mock("@/components/ocr/BorderOcrButton", () => ({
  BorderOcrButton: () => <div data-testid="border-ocr-button" />,
}));

const baseProps = {
  calendarId: "cal-1",
  defaultDate: "2024-01-01",
  action: vi.fn(),
};

describe("ScheduleForm", () => {
  it("基本フィールドがレンダリングされる", () => {
    render(<ScheduleForm {...baseProps} />);

    expect(screen.getByLabelText("日付")).toBeInTheDocument();
    expect(screen.getByLabelText("今日の +目標")).toBeInTheDocument();
    expect(screen.getByLabelText("今日の +実績")).toBeInTheDocument();
    expect(screen.getByLabelText("参加イベント")).toBeInTheDocument();
    expect(screen.getByLabelText("メモ")).toBeInTheDocument();
    expect(screen.getByText("保存する")).toBeInTheDocument();
  });

  it("action がバリデーションエラーを返したとき、エラー一覧とフィールド単位のエラーが表示される", async () => {
    const action = vi.fn(async () => ({
      ok: false as const,
      errors: {
        date: ["日付を入力してください"],
        target_plus: ["目標+を選択してください"],
      },
    }));

    render(<ScheduleForm {...baseProps} action={action} />);

    fireEvent.click(screen.getByText("保存する"));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText("入力内容を確認してください"),
    ).toBeInTheDocument();
    const dateErrors = screen.getAllByText("日付を入力してください");
    const targetErrors = screen.getAllByText("目標+を選択してください");
    expect(dateErrors.length).toBeGreaterThanOrEqual(1);
    expect(targetErrors.length).toBeGreaterThanOrEqual(1);
  });

  it("スキップパス使用時は目標・実績のセレクトがdisabledになり、hiddenフィールドで0が送信される", async () => {
    const action = vi.fn(async (fd: FormData) => {
      const target = fd.get("target_plus");
      const actual = fd.get("actual_plus");
      expect(target).toBe("0");
      expect(actual).toBe("0");
      return { ok: true as const };
    });

    render(
      <ScheduleForm
        {...baseProps}
        action={action}
        defaultTargetPlus={6}
        defaultActualPlus={4}
        defaultSkipPassUsed={true}
      />,
    );

    const targetSelect = screen.getByLabelText("今日の +目標") as HTMLSelectElement;
    const actualSelect = screen.getByLabelText("今日の +実績") as HTMLSelectElement;

    expect(targetSelect.disabled).toBe(true);
    expect(actualSelect.disabled).toBe(true);

    fireEvent.click(screen.getByText("保存する"));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
  });
});

