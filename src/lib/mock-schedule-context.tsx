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

type MockScheduleProviderProps = { children: ReactNode };

export function MockScheduleProvider({ children }: MockScheduleProviderProps) {
  const [entriesByDate, setEntriesByDate] = useState<Record<string, MockEntry>>(
    {}
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
