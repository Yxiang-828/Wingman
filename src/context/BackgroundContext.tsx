import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type BackgroundType = "default" | "mountain" | "city" | "space";

interface BackgroundContextType {
  background: BackgroundType;
  setBackground: (background: BackgroundType) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(
  undefined
);

export const BackgroundProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [background, setBackgroundState] = useState<BackgroundType>("default");

  // Load background from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.background) {
          setBackgroundState(settings.background);
        }
      } catch (e) {
        console.error("Failed to parse saved background settings:", e);
      }
    }
  }, []);

  // Apply background to body when background changes
  useEffect(() => {
    const body = document.body;

    // Remove existing background classes
    body.classList.remove("bg-default", "bg-mountain", "bg-city", "bg-space");

    // Add new background class
    body.classList.add(`bg-${background}`);

    // Also save to localStorage when changed
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
      background,
    };

    localStorage.setItem("userSettings", JSON.stringify(updatedSettings));
  }, [background]);

  const setBackground = (newBackground: BackgroundType) => {
    setBackgroundState(newBackground);
  };

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = (): BackgroundContextType => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error("useBackground must be used within a BackgroundProvider");
  }
  return context;
};
