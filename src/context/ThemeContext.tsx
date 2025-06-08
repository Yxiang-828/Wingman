// Theme command center - handles your digital realm's visual personality
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getCurrentUserId } from "../utils/auth";

type Theme = "dark" | "light" | "yandere" | "kuudere" | "tsundere" | "dandere";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>("dark");

  // Load theme from database on mount
  useEffect(() => {
    loadThemeFromDatabase();
  }, []);

  const loadThemeFromDatabase = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const settings = await window.electronAPI.db.getUserSettings(userId);
      if (settings?.theme) {
        setThemeState(settings.theme as Theme);
      }
    } catch (error) {
      console.error("Failed to load theme from database:", error);
      // Fallback to localStorage for offline resilience
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
    }
  };

  // Apply theme to document when theme changes - your digital throne room adapts
  useEffect(() => {
    const body = document.body;

    // Remove all existing theme classes
    body.classList.remove(
      "dark-theme",
      "light-theme",
      "yandere-theme",
      "kuudere-theme",
      "tsundere-theme",
      "dandere-theme"
    );

    // Add new theme class (dark is default, no class needed)
    if (theme !== "dark") {
      body.classList.add(`${theme}-theme`);
    }

    console.log(`Theme applied: ${theme}`);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);

    // Save to database for persistence across sessions
    try {
      const userId = getCurrentUserId();
      if (userId) {
        const currentSettings = await window.electronAPI.db.getUserSettings(
          userId
        );
        const updatedSettings = {
          ...currentSettings,
          theme: newTheme,
        };
        await window.electronAPI.db.saveUserSettings(userId, updatedSettings);
        console.log(`Theme saved to database: ${newTheme}`);
      }
    } catch (error) {
      console.error("Failed to save theme to database:", error);
    }

    // Fallback: Save to localStorage
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
