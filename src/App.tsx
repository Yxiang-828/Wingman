import React, { useState, useEffect } from "react";
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
import WriteEntry from "./components/Diary/WriteEntry";
import ViewEntries from "./components/Diary/ViewEntries";
import SearchDiary from "./components/Diary/SearchDiary";
import EditEntry from "./components/Diary/EditEntry";
import ChatBot from "./components/ChatBot/index";
import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
import Notifications from "./Pages/Notifications";
import Login from "./components/Profile/Login";
import ScrollToTop from "./components/ScrollToTop";
import ProfileSettings from "./components/Profile/ProfileSettings";
import ProfileAvatar from "./components/Profile/ProfileAvatar";
import { startNotificationCleanupService } from "./services/NotificationCleanupService";
import "./main.css";
import "./styles/scrollbars.css";
import ErrorBoundary from "./components/ErrorBoundary"; // Import the ErrorBoundary component
import CompletedTasks from "./components/Tasks/CompletedTasks";

// Create an AppContent component that will be inside the Router
const AppContent = () => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const location = useLocation();

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
                path="/diary/*"
                element={
                  <ErrorBoundary>
                    <Diary />
                  </ErrorBoundary>
                }
              >
                <Route path="write" element={<WriteEntry />} />
                <Route path="view" element={<ViewEntries />} />
                <Route path="search" element={<SearchDiary />} />
                <Route path="edit" element={<EditEntry />} />
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
            <ScrollToTop />
            <ErrorBoundary>
              {" "}
              {/* Wrap the AppContent with ErrorBoundary */}
              <AppContent />
            </ErrorBoundary>
          </NotificationsProvider>
        </DataProvider>
      </DiaryProvider>
    </Router>
  );
};

export default App;
