import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Theme = "dark" | "light" | "auto";

interface ThemeContextType {
  theme: Theme;
  actualTheme: "dark" | "light"; // The resolved theme (auto becomes dark/light)
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [actualTheme, setActualTheme] = useState<"dark" | "light">("dark");

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.theme) {
          setThemeState(settings.theme);
        }
      } catch (e) {
        console.error("Failed to parse saved theme settings:", e);
      }
    }
  }, []);

  // Resolve actual theme (handle 'auto' theme)
  useEffect(() => {
    let resolvedTheme: "dark" | "light" = "dark";

    if (theme === "auto") {
      // Check system preference
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      resolvedTheme = systemPrefersDark ? "dark" : "light";
    } else {
      resolvedTheme = theme;
    }

    setActualTheme(resolvedTheme);

    // Apply theme to document
    const root = document.documentElement;
    root.className = resolvedTheme === "light" ? "light-theme" : "";
  }, [theme]);

  // Listen for system theme changes when using 'auto'
  useEffect(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? "dark" : "light");
        const root = document.documentElement;
        root.className = e.matches ? "" : "light-theme";
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    // Update localStorage
    const savedSettings = localStorage.getItem("userSettings");
    let settings = {};

    if (savedSettings) {
      try {
        settings = JSON.parse(savedSettings);
      } catch (e) {
        console.error("Failed to parse saved settings:", e);
      }
    }

    const updatedSettings = {
      ...settings,
      theme: newTheme,
    };

    localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
  };

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
