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
  isThemeLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Utility function to check if database API is ready
const isDatabaseReady = (): boolean => {
  return !!(window.electronAPI?.db?.getUserSettings);
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  // Load theme with improved initialization order and error handling
  useEffect(() => {
    loadThemeFromDatabase();
    
    // Retry mechanism: check again after 2 seconds if database wasn't ready
    const retryTimer = setTimeout(() => {
      if (!isThemeLoaded) {
        console.log("Retrying theme load from database...");
        loadThemeFromDatabase();
      }
    }, 2000);

    return () => clearTimeout(retryTimer);
  }, [isThemeLoaded]);

  const loadThemeFromDatabase = async () => {
    try {
      // 1. FIRST: Try localStorage immediately (always available)
      const savedSettings = localStorage.getItem("userSettings");
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          if (settings.theme) {
            console.log(`Theme loaded from localStorage: ${settings.theme}`);
            setThemeState(settings.theme);
            setIsThemeLoaded(true);
          }
        } catch (e) {
          console.error("Failed to parse localStorage theme settings:", e);
        }
      }

      // 2. SECOND: Try database (may fail during initialization)
      const userId = getCurrentUserId();
      if (!userId) {
        console.log("No user ID available yet, using localStorage theme");
        setIsThemeLoaded(true);
        return;
      }

      // Wait a bit for database to be ready during app startup
      if (!window.electronAPI?.db?.getUserSettings) {
        console.log("Database API not ready yet, using localStorage theme");
        setIsThemeLoaded(true);
        return;
      }      const settings = await window.electronAPI.db.getUserSettings(userId);
      if (settings?.theme) {
        console.log(`Theme loaded from database: ${settings.theme}`);
        
        // Ensure theme is valid before setting
        const validThemes: Theme[] = ["dark", "light", "yandere", "kuudere", "tsundere", "dandere"];
        const themeValue = validThemes.includes(settings.theme as Theme) ? settings.theme as Theme : "dark";
        setThemeState(themeValue);
        
        // Sync localStorage with database
        const localSettings = savedSettings ? JSON.parse(savedSettings) : {};
        const updatedSettings = { ...localSettings, theme: settings.theme };
        localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
      }
      
      setIsThemeLoaded(true);
    } catch (error) {
      console.error("Failed to load theme from database:", error);
      // Ensure we always mark as loaded even on error
      setIsThemeLoaded(true);
    }
  };

  // Listen for authentication events to reload theme from database
  useEffect(() => {    const handleAuthChange = () => {
      const userId = getCurrentUserId();
      if (userId && isDatabaseReady()) {
        console.log("User authenticated, syncing theme from database...");
        loadThemeFromDatabase();
      }
    };

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userSettings' && e.newValue) {
        try {
          const settings = JSON.parse(e.newValue);
          if (settings.theme && settings.theme !== theme) {
            console.log(`Theme synced from other window: ${settings.theme}`);
            setThemeState(settings.theme);
          }
        } catch (error) {
          console.error("Error syncing theme from storage:", error);
        }
      }
    };

    // Listen for user login events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-authenticated', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-authenticated', handleAuthChange);
    };
  }, [theme]);
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

    // Always save to localStorage first (immediate, never fails)
    const savedSettings = localStorage.getItem("userSettings");
    let localSettings = {};
    if (savedSettings) {
      try {
        localSettings = JSON.parse(savedSettings);
      } catch (e) {
        console.error("Failed to parse saved settings:", e);
      }
    }

    const updatedSettings = {
      ...localSettings,
      theme: newTheme,
    };
    localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
    console.log(`Theme saved to localStorage: ${newTheme}`);    // Then try to save to database (may fail, but localStorage ensures persistence)
    try {
      const userId = getCurrentUserId();
      if (userId && isDatabaseReady()) {
        const currentSettings = await window.electronAPI.db.getUserSettings(userId);
        const updatedDbSettings = {
          ...currentSettings,
          theme: newTheme,
        };
        await window.electronAPI.db.saveUserSettings(userId, updatedDbSettings);
        console.log(`Theme saved to database: ${newTheme}`);
      } else {
        console.log("Database not available, theme saved to localStorage only");
      }
    } catch (error) {
      console.error("Failed to save theme to database (localStorage fallback active):", error);
    }
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme, isThemeLoaded }}>
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
