import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

function readSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

function writeSavedTheme(theme: Theme): void {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Ignore: blocked/private storage just means the preference is not persisted.
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const getInitialTheme = (): Theme => {
    const saved = readSavedTheme();
    if (saved) return saved;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes if user hasn't explicitly set a preference
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!readSavedTheme()) {
        setThemeState(e.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      writeSavedTheme(next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    writeSavedTheme(newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
