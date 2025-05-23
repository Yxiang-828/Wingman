import { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
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
const AppContent = () => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const location = useLocation();

  // Check if user exists in localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error reading user from localStorage:", error);
    }
  }, []);

  // Listen for sidebar visibility changes
  useEffect(() => {
    const handleSidebarChange = (e: any) =>
      setSidebarVisible(e.detail.isVisible);

    window.addEventListener("sidebar-visibility-change", handleSidebarChange);
    return () => {
      window.removeEventListener(
        "sidebar-visibility-change",
        handleSidebarChange
      );
    };
  }, []);

  // Add /login route to the excluded paths
  const isLoginPage = location.pathname === "/login";

  // Always show login unless user is authenticated
  if (!user && !isLoginPage) {
    return <Login onLogin={setUser} />;
  }

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
              <Route path="/login" element={<Login onLogin={setUser} />} />
              <Route
                path="/notifications"
                element={
                  <ErrorBoundary>
                    <Notifications />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/"
                element={
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/calendar/*"
                element={
                  <ErrorBoundary>
                    <Calendar />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/diary/*"
                element={
                  <ErrorBoundary>
                    <Diary />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/chatbot"
                element={
                  <ErrorBoundary>
                    <ChatBot />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/profile/*"
                element={
                  <ErrorBoundary>
                    <Profile />
                  </ErrorBoundary>
                }
              >
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="avatar" element={<ProfileAvatar />} />
              </Route>
              <Route
                path="/home"
                element={
                  <ErrorBoundary>
                    <Home />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/completed-tasks"
                element={
                  <ErrorBoundary>
                    <CompletedTasks />
                  </ErrorBoundary>
                }
              />
              {/* Redirect all unknown routes to login or dashboard */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

// Main App component now only sets up providers and router
const App = () => {
  useEffect(() => {
    // Start the notification cleanup service
    const stopCleanupService = startNotificationCleanupService();

    // Clean up when component unmounts
    return () => {
      stopCleanupService();
    };
  }, []);

  return (
    <Router>
      <DiaryProvider>
        <DataProvider>
          <NotificationsProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </NotificationsProvider>
        </DataProvider>
      </DiaryProvider>
    </Router>
  );
};

export default App;
