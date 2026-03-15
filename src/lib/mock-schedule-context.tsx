"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** 開発用モックでデータタブ・カレンダー間で共有するスケジュールの型（日付単位の部分） */
export type MockEntry = {
  date: string;
  border_plus2?: number | null;
  border_plus4?: number | null;
  border_plus6?: number | null;
  target_plus?: number | null;
  actual_plus?: number | null;
  skip_pass_used?: boolean;
  memo?: string | null;
};

type MockScheduleContextValue = {
  entriesByDate: Record<string, MockEntry>;
  updateField: (
    date: string,
    field: string,
    value: string | number | boolean
  ) => void;
};

const MockScheduleContext = createContext<MockScheduleContextValue | null>(
  null
);

export function useMockSchedule(): MockScheduleContextValue | null {
  return useContext(MockScheduleContext);
}

type MockScheduleProviderProps = {
  children: ReactNode;
  /** 開発用: 初回マウント時に使うシード（A1→A2狙い・キープ・スキップ入り1ヶ月分など） */
  initialEntries?: Record<string, MockEntry>;
};

export function MockScheduleProvider({
  children,
  initialEntries,
}: MockScheduleProviderProps) {
  const [entriesByDate, setEntriesByDate] = useState<Record<string, MockEntry>>(
    () => initialEntries ?? {}
  );

  const updateField = useCallback(
    (date: string, field: string, value: string | number | boolean) => {
      setEntriesByDate((prev) => {
        const current = prev[date] ?? { date };
        if (field === "skip_pass_used") {
          return {
            ...prev,
            [date]: { ...current, skip_pass_used: value === true || value === "on" },
          };
        }
        if (field === "memo") {
          return {
            ...prev,
            [date]: { ...current, memo: typeof value === "string" ? value : null },
          };
        }
        if (
          field === "target_plus" ||
          field === "actual_plus" ||
          field === "border_plus2" ||
          field === "border_plus4" ||
          field === "border_plus6"
        ) {
          const numVal =
            value === "" || value === null || value === undefined
              ? null
              : Number(value);
          return {
            ...prev,
            [date]: {
              ...current,
              [field]: numVal === null || Number.isNaN(numVal) ? null : numVal,
            },
          };
        }
        return prev;
      });
    },
    []
  );

  const value = useMemo(
    () => ({ entriesByDate, updateField }),
    [entriesByDate, updateField]
  );

  return (
    <MockScheduleContext.Provider value={value}>
      {children}
    </MockScheduleContext.Provider>
  );
}
