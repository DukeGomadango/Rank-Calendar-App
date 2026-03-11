"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "iriam_view_mode";

export type ViewMode = "simple" | "detailed";

function readStored(): ViewMode {
  if (typeof window === "undefined") return "simple";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "simple" || v === "detailed") return v;
  return "simple";
}

type ViewModeContextValue = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
};

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setState] = useState<ViewMode>("simple");

  useEffect(() => {
    setState(readStored());
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, []);

  const value = useMemo(() => ({ viewMode, setViewMode }), [viewMode, setViewMode]);

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    return {
      viewMode: "simple",
      setViewMode: () => {},
    };
  }
  return ctx;
}
