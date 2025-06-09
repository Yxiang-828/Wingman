import { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { DiaryProvider } from "./context/DiaryContext";
import { ThemeProvider } from "./context/ThemeContext";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/index";
import Dashboard from "./components/Dashboard/index";
import Calendar from "./components/Calendar/index";
import Diary from "./components/Diary/index";
import Login from "./components/Profile/login";
import Profile from "./components/Profile/index";
import ProfileSettings from "./components/Profile/ProfileSettings";
import ProfileAvatar from "./components/Profile/ProfileAvatar";
import Notifications from "./Pages/Notifications";
import ChatBot from "./components/ChatBot/index";
import Home from "./Pages/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { Auth } from "./utils/AuthStateManager";
import { osNotificationManager } from "./services/OSNotificationManager";
import "./main.css";
import "./styles/scrollbars.css";

// Create an AppContent component that will be inside the Router
const AppContent = ({
  onAuthChange,
}: {
  onAuthChange: (authenticated: boolean) => void;
}) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Modified useEffect to properly update auth state and call onAuthChange
  useEffect(() => {
    setAuthInitialized(true);

    // Check if user is already stored in localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        JSON.parse(storedUser); // Just verify JSON is valid
        onAuthChange(true);
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        onAuthChange(false);
      }
    } else {
      onAuthChange(false); // Call with false if no stored user
    }
  }, [onAuthChange]); // Add to dependency array

  // Same sidebar visibility effect
  useEffect(() => {
    const handleSidebarVisibility = (event: CustomEvent) => {
      setSidebarVisible(event.detail.isVisible);
    };

    window.addEventListener(
      "sidebar-visibility-change",
      handleSidebarVisibility as EventListener
    );

    return () => {
      window.removeEventListener(
        "sidebar-visibility-change",
        handleSidebarVisibility as EventListener
      );
    };
  }, []);

  // **NEW: OSNotificationManager Integration**
  // **REASON: Need to start/stop notification manager based on authentication state**
  // **DECISION: Placed after auth initialization to ensure user state is ready**
  useEffect(() => {
    // **REASON: Only start notifications when user is authenticated**
    // **DECISION: Check both authInitialized and stored user to ensure proper state**
    const storedUser = localStorage.getItem("user");
    const isAuthenticated = authInitialized && !!storedUser;

    if (isAuthenticated) {
      console.log("🚀 AppContent: User authenticated, starting OSNotificationManager");

      // **NEW: Store user ID for background notifications**
      try {
        const userData = JSON.parse(storedUser);
        if (userData.id && window.electronAPI?.user?.storeActiveUser) {
          window.electronAPI.user.storeActiveUser(userData.id).then(result => {
            if (result.success) {
              console.log("✅ AppContent: User ID stored for background notifications");
            } else {
              console.error("❌ AppContent: Failed to store user ID:", result.error);
            }
          });
        }
      } catch (error) {
        console.error("❌ AppContent: Error parsing user data for storage:", error);
      }

      // **REASON: Async start to avoid blocking UI initialization**
      // **DECISION: Use setTimeout to defer notification setup until after render**
      setTimeout(() => {
        osNotificationManager.start().catch(error => {
          console.error("❌ AppContent: Failed to start OSNotificationManager:", error);
        });
      }, 1000); // 1 second delay to ensure app is fully loaded
    }

    // **REASON: Cleanup function to stop manager when user logs out**
    // **DECISION: Return cleanup function that runs when dependencies change**
    return () => {
      if (isAuthenticated) {
        console.log("⏹️ AppContent: Stopping OSNotificationManager due to auth change");
        osNotificationManager.stop();
      }
    };
  }, [authInitialized]); // **REASON: Only depend on authInitialized to avoid unnecessary re-runs**

  // Ensure we only render content that needs authentication after auth is initialized
  if (!authInitialized) {
    return <div className="loading">Initializing...</div>;
  }

  function setUser(_user: any): void {
    throw new Error("Function not implemented.");
  }

  // Return the app content with FIXED routing structure
  return (
    <div className="app flex h-screen">
      {" "}
      {/* Removed bg-dark and text-light */}
      <Sidebar />
      <div
        className={`main-content-wrapper flex-1 flex flex-col overflow-hidden ${
          // Added flex-1, flex, flex-col, overflow-hidden
          sidebarVisible ? "sidebar-visible" : ""
        }`}
      >
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/calendar/*" element={<Calendar />} />
              <Route path="/diary/*" element={<Diary />} />
              <Route path="/chatbot" element={<ChatBot />} />
              <Route path="/profile/*" element={<Profile />}>
                <Route index element={<ProfileSettings />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="avatar" element={<ProfileAvatar />} />
              </Route>
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login onLogin={setUser} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

// Main App component with providers
const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(Auth.isAuthenticated);
  const [backendChecked, setBackendChecked] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [_backendStatus, setBackendStatus] = useState("Checking...");

  // Initialize and listen for auth changes
  useEffect(() => {
    const removeListener = Auth.addListener((isAuth) => {
      setIsAuthenticated(isAuth);
    });

    // Check for stored credentials on mount
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser);
        // Verify token if needed here
        Auth.setAuthenticated(true, userData.id);
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        Auth.handleLogout();
      }
    }

    setIsInitializing(false);

    return removeListener;
  }, []);

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("http://localhost:8080/health");
        if (response.ok) {
          setBackendStatus("Connected");
          setBackendReady(true);
          setBackendError(null);
        } else {
          setBackendStatus("Error");
          setBackendReady(false);
        }
      } catch (error) {
        console.error("Backend not ready:", error);
        setBackendStatus("Disconnected");
        setBackendError(
          `Cannot connect to backend server: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        setBackendReady(false);
      } finally {
        setBackendChecked(true);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  // Show loading screen during initialization
  if (isInitializing) {
    return <div className="loading">Starting up...</div>;
  }

  // Show loading spinner while checking backend
  if (!backendChecked) {
    return <div>Checking system status...</div>;
  }

  // Show error if backend is not ready
  if (!backendReady) {
    return (
      <div className="startup-error">
        <h2>Unable to connect to database</h2>
        <p>
          {backendError ||
            "Please check your internet connection and Supabase settings."}
        </p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Replace the non-implemented function with a working one
  function setUser(user: any) {
    console.log("User authenticated:", user);
    // Store the user if needed
    localStorage.setItem("user", JSON.stringify(user));
    // Update Auth state manager
    Auth.setAuthenticated(true, user.id);
  }

  return (
    <Router>
      {" "}
      {isAuthenticated ? (
        <ErrorBoundary>
          <ThemeProvider>
              <DiaryProvider>
                <DataProvider>
                  <NotificationsProvider>
                    <AppContent onAuthChange={setIsAuthenticated} />
                  </NotificationsProvider>
                </DataProvider>
              </DiaryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      ) : (
        <Login
          onLogin={(user) => {
            setUser(user);
            setIsAuthenticated(true);
          }}
        />
      )}
    </Router>
  );
};

export default App;
