import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ViewModeProvider } from "@/lib/view-mode-context";
import { ViewModeToggle } from "./ViewModeToggle";

function renderWithProvider() {
  return render(
    <ViewModeProvider>
      <ViewModeToggle />
    </ViewModeProvider>
  );
}

describe("ViewModeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders 簡易 and 詳細 buttons", () => {
    renderWithProvider();
    expect(screen.getByRole("button", { name: "簡易" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "詳細" })).toBeInTheDocument();
  });

  it("updates view mode and localStorage when 詳細 is clicked", () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "詳細" }));
    expect(localStorage.getItem("iriam_view_mode")).toBe("detailed");
  });

  it("updates view mode and localStorage when 簡易 is clicked", () => {
    localStorage.setItem("iriam_view_mode", "detailed");
    renderWithProvider();
    fireEvent.click(screen.getByRole("button", { name: "簡易" }));
    expect(localStorage.getItem("iriam_view_mode")).toBe("simple");
  });
});
