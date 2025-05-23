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
import Sidebar from "./components/Sidebar/index";
import Header from "./components/Header/index";
import Dashboard from "./components/Dashboard/index";
import Calendar from "./components/Calendar/index";
import Diary from "./components/Diary/index";
import Login from "./components/Profile/login";
import Profile from "./components/Profile/index";
import ProfileSettings from "./components/Profile/ProfileSettings";
import ProfileAvatar from "./components/Profile/ProfileAvatar";
import CompletedTasks from "./components/Tasks/CompletedTasks";
import Notifications from "./Pages/Notifications";
import ChatBot from "./components/ChatBot/index";
import Home from "./Pages/Home";
import ErrorBoundary from "./components/ErrorBoundary";
import { startNotificationCleanupService } from "./services/NotificationService";
import "./main.css";
import "./styles/scrollbars.css";

// Create an AppContent component that will be inside the Router
const AppContent = ({
  onAuthChange,
}: {
  onAuthChange: (authenticated: boolean) => void;
}) => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Modified useEffect to properly update auth state
  useEffect(() => {
    // REMOVE all localStorage user restoration
    // Just set initialized to true immediately
    setAuthInitialized(true);

    // Optional: Clear any existing user data to force login
    localStorage.removeItem("user");

    // Notify parent that user is not authenticated
    onAuthChange(false);
  }, [onAuthChange]);

  // Update login handler to notify when user logs in
  const handleLogin = (user: any) => {
    setUser(user);
    onAuthChange(true); // Notify parent that user is now authenticated
  };

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

  // Ensure we only render content that needs authentication after auth is initialized
  if (!authInitialized) {
    return <div className="loading">Initializing...</div>;
  }

  // CRITICAL PART: If not logged in, always show login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Return the app content with FIXED routing structure
  return (
    <div className="app flex h-screen bg-dark text-light">
      <Sidebar />
      <div
        className={`main-content-wrapper ${
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
              <Route path="/completed-tasks" element={<CompletedTasks />} />
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
  // Only start services after user authentication
  const [userAuthenticated, setUserAuthenticated] = useState(false);

  // Fix memory leak warning by increasing max listeners
  useEffect(() => {
    if (window.electronAPI?.setMaxMoodListeners) {
      window.electronAPI.setMaxMoodListeners(20);
    }
  }, []);

  useEffect(() => {
    // Only start notification cleanup service if user is authenticated
    if (userAuthenticated) {
      const stopCleanupService = startNotificationCleanupService();
      return () => {
        stopCleanupService();
      };
    }
  }, [userAuthenticated]);

  return (
    <Router>
      <ErrorBoundary>
        <DiaryProvider>
          <DataProvider>
            <NotificationsProvider>
              <AppContent onAuthChange={setUserAuthenticated} />
            </NotificationsProvider>
          </DataProvider>
        </DiaryProvider>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
