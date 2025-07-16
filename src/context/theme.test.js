import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider, useTheme } from "./ThemeContext";

// Mock the auth module BEFORE importing ThemeContext
jest.mock("../utils/auth", () => ({
  getCurrentUserId: jest.fn().mockReturnValue("test-user-123"),
  getCurrentUser: jest.fn().mockReturnValue({
    id: "test-user-123",
    name: "Test User",
  }),
  isLoggedIn: jest.fn().mockReturnValue(true),
}));

// Test component with all 6 themes
const ThemeSwitcher = () => {
  const { theme, setTheme, isThemeLoaded } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="theme-loaded">
        {isThemeLoaded ? "loaded" : "loading"}
      </span>
      <button data-testid="dark-btn" onClick={() => setTheme("dark")}>
        Dark 🌙
      </button>
      <button data-testid="light-btn" onClick={() => setTheme("light")}>
        Light ☀️
      </button>
      <button data-testid="yandere-btn" onClick={() => setTheme("yandere")}>
        Yandere 🌸
      </button>
      <button data-testid="kuudere-btn" onClick={() => setTheme("kuudere")}>
        Kuudere ❄️
      </button>
      <button data-testid="tsundere-btn" onClick={() => setTheme("tsundere")}>
        Tsundere 🧡
      </button>
      <button data-testid="dandere-btn" onClick={() => setTheme("dandere")}>
        Dandere 💜
      </button>
    </div>
  );
};

// Component to test useTheme hook outside provider (edge case)
const ThemeConsumerWithoutProvider = () => {
  try {
    const { theme } = useTheme();
    return <div data-testid="theme-value">{theme}</div>;
  } catch (error) {
    return <div data-testid="theme-error">{error.message}</div>;
  }
};

// Import the mocked auth functions
const mockAuth = require("../utils/auth");

describe("UNIT TESTS - Theme Context Functionality", () => {
  let mockElectronAPI;

  beforeEach(() => {
    // Mock ElectronAPI
    mockElectronAPI = {
      db: {
        getUserSettings: jest.fn(),
        saveUserSettings: jest.fn(),
      },
    };
    global.window.electronAPI = mockElectronAPI;

    // Setup auth mocks
    mockAuth.getCurrentUserId.mockReturnValue("test-user-123");
    mockAuth.getCurrentUser.mockReturnValue({
      id: "test-user-123",
      name: "Test User",
    });
    mockAuth.isLoggedIn.mockReturnValue(true);

    // Clear all mocks and storage
    localStorage.clear();
    document.body.className = "";
    jest.clearAllMocks();

    // Reset auth mocks after clearing all mocks
    mockAuth.getCurrentUserId.mockReturnValue("test-user-123");
    mockAuth.getCurrentUser.mockReturnValue({
      id: "test-user-123",
      name: "Test User",
    });
    mockAuth.isLoggedIn.mockReturnValue(true);

    // Suppress console output in tests
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console functions
    console.warn.mockRestore?.();
    console.log.mockRestore?.();
    console.error.mockRestore?.();
    jest.clearAllMocks();
  });

  // TESTS FOR setTheme() FUNCTION

  describe("setTheme() Function", () => {
    test("Should set valid theme correctly (normal case)", async () => {
      mockElectronAPI.db.saveUserSettings.mockResolvedValue(true);
      mockElectronAPI.db.getUserSettings.mockResolvedValue({});

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("yandere-btn"));

      await waitFor(() => {
        expect(getByTestId("current-theme")).toHaveTextContent("yandere");
        expect(document.body).toHaveClass("yandere-theme");
      });

      // Verify database call was made with correct user ID and theme
      expect(mockElectronAPI.db.saveUserSettings).toHaveBeenCalledWith(
        "test-user-123",
        expect.objectContaining({ theme: "yandere" }),
      );
    });

    test("Should handle database save failure gracefully (edge case)", async () => {
      // Mock database failure
      mockElectronAPI.db.saveUserSettings.mockRejectedValue(
        new Error("Database error"),
      );
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("light-btn"));

      await waitFor(() => {
        // Theme should still change in UI even if database fails
        expect(getByTestId("current-theme")).toHaveTextContent("light");
        expect(document.body).toHaveClass("light-theme");
      });

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save theme to database (localStorage fallback active):",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  // TESTS FOR THEME LOADING FUNCTION

  describe("Theme Loading Function", () => {
    test("Should load theme from database on initialization (normal case)", async () => {
      mockElectronAPI.db.getUserSettings.mockResolvedValue({
        theme: "kuudere",
      });

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      await waitFor(() => {
        expect(getByTestId("current-theme")).toHaveTextContent("kuudere");
        expect(getByTestId("theme-loaded")).toHaveTextContent("loaded");
        expect(document.body).toHaveClass("kuudere-theme");
      });

      expect(mockElectronAPI.db.getUserSettings).toHaveBeenCalledWith(
        "test-user-123",
      );
    });

    test("Should fallback to default theme when database fails (edge case)", async () => {
      mockElectronAPI.db.getUserSettings.mockRejectedValue(
        new Error("DB unavailable"),
      );
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      await waitFor(() => {
        // Should default to dark theme
        expect(getByTestId("current-theme")).toHaveTextContent("dark");
        expect(getByTestId("theme-loaded")).toHaveTextContent("loaded");
        expect(document.body.className).toBe(""); // Dark theme has no body class
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // TESTS FOR useTheme() HOOK

  describe("useTheme() Hook", () => {
    test("Should provide theme context when used within provider (normal case)", () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      expect(getByTestId("current-theme")).toBeInTheDocument();
      expect(getByTestId("theme-loaded")).toBeInTheDocument();
      // Default theme should be dark
      expect(getByTestId("current-theme")).toHaveTextContent("dark");
    });

    test("Should throw error when used outside provider (edge case)", () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { getByTestId } = render(<ThemeConsumerWithoutProvider />);

      expect(getByTestId("theme-error")).toHaveTextContent(
        "useTheme must be used within a ThemeProvider",
      );

      consoleSpy.mockRestore();
    });
  });

  // TESTS FOR BODY CLASS MANAGEMENT

  describe("Body Class Management Function", () => {
    test("Should apply correct body classes for themed modes (normal case)", async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      const themedModes = [
        "light",
        "yandere",
        "kuudere",
        "tsundere",
        "dandere",
      ];

      for (const theme of themedModes) {
        fireEvent.click(getByTestId(`${theme}-btn`));

        await waitFor(() => {
          expect(document.body).toHaveClass(`${theme}-theme`);
          expect(getByTestId("current-theme")).toHaveTextContent(theme);
        });
      }
    });

    test("Should remove body class for dark theme (edge case)", async () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      // First set a themed mode
      fireEvent.click(getByTestId("light-btn"));
      await waitFor(() => expect(document.body).toHaveClass("light-theme"));

      // Then switch to dark
      fireEvent.click(getByTestId("dark-btn"));
      await waitFor(() => {
        expect(document.body.className).toBe(""); // No theme class
        expect(getByTestId("current-theme")).toHaveTextContent("dark");
      });
    });
  });

  // TESTS FOR THEME PERSISTENCE

  describe("Theme Persistence Function", () => {
    test("Should save theme to localStorage and database (normal case)", async () => {
      mockElectronAPI.db.saveUserSettings.mockResolvedValue(true);

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("tsundere-btn"));

      await waitFor(() => {
        // Check localStorage
        const settings = JSON.parse(
          localStorage.getItem("userSettings") || "{}",
        );
        expect(settings.theme).toBe("tsundere");

        // Check database call
        expect(mockElectronAPI.db.saveUserSettings).toHaveBeenCalledWith(
          "test-user-123",
          expect.objectContaining({ theme: "tsundere" }),
        );
      });
    });

    test("Should handle missing electronAPI gracefully (edge case)", async () => {
      // Remove electronAPI
      delete global.window.electronAPI;

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("dandere-btn"));

      await waitFor(() => {
        // Theme should still change in UI
        expect(getByTestId("current-theme")).toHaveTextContent("dandere");
        expect(document.body).toHaveClass("dandere-theme");

        // Should save to localStorage even without electronAPI
        const settings = JSON.parse(
          localStorage.getItem("userSettings") || "{}",
        );
        expect(settings.theme).toBe("dandere");
      });
    });
  });

  // TESTS FOR DATABASE READINESS

  describe("Database Readiness Function", () => {
    test("Should handle database availability check (normal case)", async () => {
      mockElectronAPI.db.saveUserSettings.mockResolvedValue(true);

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("light-btn"));

      await waitFor(() => {
        expect(mockElectronAPI.db.saveUserSettings).toHaveBeenCalled();
        expect(getByTestId("current-theme")).toHaveTextContent("light");
      });
    });

    test("Should fallback when database is unavailable (edge case)", async () => {
      // Mock database as unavailable
      delete global.window.electronAPI.db;

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("yandere-btn"));

      await waitFor(() => {
        // Should still save to localStorage
        const settings = JSON.parse(
          localStorage.getItem("userSettings") || "{}",
        );
        expect(settings.theme).toBe("yandere");
        expect(getByTestId("current-theme")).toHaveTextContent("yandere");
      });

      // Restore for other tests
      global.window.electronAPI.db = mockElectronAPI.db;
    });
  });

  // TESTS FOR ERROR HANDLING IN SETTHEME

  describe("SetTheme Error Handling", () => {
    test("Should handle localStorage parse errors gracefully (edge case)", async () => {
      // Corrupt localStorage data
      localStorage.setItem("userSettings", "invalid-json{");

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("kuudere-btn"));

      await waitFor(() => {
        // Should still work despite corrupted localStorage
        expect(getByTestId("current-theme")).toHaveTextContent("kuudere");

        // Should create fresh settings
        const settings = JSON.parse(
          localStorage.getItem("userSettings") || "{}",
        );
        expect(settings.theme).toBe("kuudere");
      });
    });

    test("Should handle database save failures gracefully (edge case)", async () => {
      mockElectronAPI.db.saveUserSettings.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      fireEvent.click(getByTestId("tsundere-btn"));

      await waitFor(() => {
        expect(getByTestId("current-theme")).toHaveTextContent("tsundere");
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to save theme to database (localStorage fallback active):",
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  // INTEGRATION TESTS

  describe("Theme Integration Tests", () => {
    test("Should handle complete theme switching workflow", async () => {
      mockElectronAPI.db.getUserSettings.mockResolvedValue({ theme: "light" });
      mockElectronAPI.db.saveUserSettings.mockResolvedValue(true);

      const { getByTestId } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByTestId("current-theme")).toHaveTextContent("light");
        expect(getByTestId("theme-loaded")).toHaveTextContent("loaded");
      });

      // Switch themes multiple times
      const switchSequence = ["yandere", "dark", "kuudere", "tsundere"];

      for (const theme of switchSequence) {
        fireEvent.click(getByTestId(`${theme}-btn`));

        await waitFor(() => {
          expect(getByTestId("current-theme")).toHaveTextContent(theme);

          if (theme === "dark") {
            expect(document.body.className).toBe("");
          } else {
            expect(document.body).toHaveClass(`${theme}-theme`);
          }
        });
      }

      // Verify all database calls were made
      expect(mockElectronAPI.db.saveUserSettings).toHaveBeenCalledTimes(
        switchSequence.length,
      );
    });

    test("Should maintain theme state across re-renders", async () => {
      mockElectronAPI.db.saveUserSettings.mockResolvedValue(true);

      const { getByTestId, rerender } = render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      // Set theme
      fireEvent.click(getByTestId("kuudere-btn"));
      await waitFor(() => {
        expect(getByTestId("current-theme")).toHaveTextContent("kuudere");
      });

      // Re-render component
      rerender(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>,
      );

      // Theme should persist
      expect(getByTestId("current-theme")).toHaveTextContent("kuudere");
      expect(document.body).toHaveClass("kuudere-theme");
    });
  });
});
