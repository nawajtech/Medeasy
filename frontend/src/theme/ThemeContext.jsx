import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTheme, updateTheme } from "../api/theme";
import {
  DEFAULT_THEME,
  applyTheme,
  cacheTheme,
  readCachedTheme,
} from "./theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readCachedTheme() || DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  // Load the persisted theme from the backend once on mount.
  useEffect(() => {
    let active = true;
    getTheme()
      .then(({ data }) => {
        if (!active || !data?.colors) return;
        const colors = { ...DEFAULT_THEME, ...data.colors };
        setTheme(colors);
        applyTheme(colors);
        cacheTheme(colors);
      })
      .catch(() => {
        // Fall back to cached/default theme already applied at boot.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Live preview — apply to the whole app without persisting.
  const previewTheme = useCallback((colors) => {
    const merged = { ...DEFAULT_THEME, ...colors };
    setTheme(merged);
    applyTheme(merged);
  }, []);

  // Persist to the database (Platform Admin only) and apply globally.
  const saveTheme = useCallback(async (colors) => {
    const { data } = await updateTheme(colors);
    const merged = { ...DEFAULT_THEME, ...(data?.colors || colors) };
    setTheme(merged);
    applyTheme(merged);
    cacheTheme(merged);
    return merged;
  }, []);

  const value = useMemo(
    () => ({ theme, loading, previewTheme, saveTheme }),
    [theme, loading, previewTheme, saveTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
