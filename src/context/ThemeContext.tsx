import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "rozliczenia:theme";

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // localStorage unavailable — fall through to the system default.
  }
  return "system";
}

/** Keeps the browser chrome colour in step with the rendered theme. */
function syncMetaThemeColor(isDark: boolean) {
  const color = isDark ? "#0a0b0f" : "#f4f5f7";
  for (const el of document.querySelectorAll('meta[name="theme-color"]')) {
    el.setAttribute("content", color);
    el.removeAttribute("media");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);

    root.style.colorScheme = theme === "system" ? "light dark" : theme;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => syncMetaThemeColor(theme === "dark" || (theme === "system" && media.matches));
    apply();

    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't persist; the session still honours it.
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme musi być użyte wewnątrz ThemeProvider");
  return ctx;
}
