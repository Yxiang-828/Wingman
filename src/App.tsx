import React, { useState, useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { DiaryProvider } from "./context/DiaryContext";
import Sidebar from "./components/Sidebar/index";
import Header from "./components/Header/index";
import Dashboard from "./components/Dashboard/index";
import Calendar from "./components/Calendar/index";
import Diary from "./components/Diary/index";
import WriteEntry from "./components/Diary/WriteEntry";
import ViewEntries from "./components/Diary/ViewEntries";
import SearchDiary from "./components/Diary/SearchDiary";
import ChatBot from "./components/ChatBot/index";
import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
import Notifications from "./Pages/Notifications";
import Login from "./components/Profile/Login";
import ScrollToTop from "./components/ScrollToTop";
import ProfileSettings from "./components/Profile/ProfileSettings";
import ProfileAvatar from "./components/Profile/ProfileAvatar";
import "./main.css";

// Create an AppContent component that will be inside the Router
const AppContent = () => {
  const [user, setUser] = useState<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

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

  if (!user) {
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
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar/*" element={<Calendar />} />
              <Route path="/chatbot" element={<ChatBot />} />
              <Route path="/profile/*" element={<Profile />}>
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="avatar" element={<ProfileAvatar />} />
              </Route>
              <Route path="/diary/*" element={<Diary />}>
                <Route path="write" element={<WriteEntry />} />
                <Route path="view" element={<ViewEntries />} />
                <Route path="search" element={<SearchDiary />} />
              </Route>
              <Route path="/home" element={<Home />} />
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
  return (
    <DataProvider>
      <DiaryProvider>
        <Router>
          <ScrollToTop />
          <AppContent />
        </Router>
      </DiaryProvider>
    </DataProvider>
  );
};

export default App;
