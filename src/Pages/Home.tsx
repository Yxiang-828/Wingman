import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import WingmanAvatar from "../components/Common/WingmanAvatar";
import { getCurrentUserId } from "../utils/auth";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEntries: 0,
    tasksCompleted: 0,
    eventsToday: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    loadQuickStats();
  }, []);

  const loadQuickStats = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const storageStats = await window.electronAPI.db.getStorageStats(userId);
      setStats({
        totalEntries: storageStats.diary_entries || 0,
        tasksCompleted: storageStats.completed_tasks || 0,
        eventsToday: storageStats.events_today || 0,
        currentStreak: storageStats.diary_streak || 0,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const features = [
    {
      icon: "🎨",
      title: "6 Beautiful Themes",
      description:
        "Dark, Light, Yandere, Kuudere, Tsundere, Dandere - Express yourself!",
      action: () => navigate("/profile/settings"),
      color: "rgba(100, 108, 255, 0.1)",
    },
    {
      icon: "🤖",
      title: "AI Wingman Assistant",
      description: "Local Ollama integration with context-aware responses",
      action: () => navigate("/chatbot"),
      color: "rgba(34, 197, 94, 0.1)",
    },
    {
      icon: "📱",
      title: "Model Manager",
      description: "Download and manage AI models directly in the app",
      action: () => navigate("/profile/settings"),
      color: "rgba(251, 191, 36, 0.1)",
    },
    {
      icon: "🔐",
      title: "Hybrid Architecture",
      description: "Supabase auth + Local SQLite for offline-first experience",
      action: null,
      color: "rgba(139, 92, 246, 0.1)",
    },
    {
      icon: "🎯",
      title: "Mission Notifications",
      description: "Smart notification system to keep you on track",
      action: () => navigate("/notifications"),
      color: "rgba(239, 68, 68, 0.1)",
    },
    {
      icon: "📦",
      title: "Electron Package",
      description: "Complete desktop app with Python backend bundling",
      action: null,
      color: "rgba(6, 182, 212, 0.1)",
    },
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="home-hero">
        <div className="home-avatar-section">
          <WingmanAvatar
            size="large"
            mood="excited"
            context="dashboard"
            showMessage={true}
            message="Ready to make today amazing? Let's explore all the features! 🚀"
            className="home-avatar"
          />
        </div>

        <div className="home-welcome">
          <h1 className="home-title">Welcome to Wingman 2025</h1>
          <p className="home-subtitle">
            Your advanced digital companion with AI integration, beautiful
            themes, and offline-first architecture. Let's make productivity
            beautiful.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="home-quick-stats">
        <div className="home-stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-number">{stats.totalEntries}</div>
          <div className="stat-label">Diary Entries</div>
        </div>
        <div className="home-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-number">{stats.tasksCompleted}</div>
          <div className="stat-label">Tasks Done</div>
        </div>
        <div className="home-stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-number">{stats.eventsToday}</div>
          <div className="stat-label">Events Today</div>
        </div>
        <div className="home-stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-number">{stats.currentStreak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>

      {/* Feature Showcase */}
      <div className="home-features">
        <h2 className="features-title">✨ New Features in 2025</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${feature.action ? "clickable" : ""}`}
              style={
                { "--feature-color": feature.color } as React.CSSProperties
              }
              onClick={feature.action || undefined}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              {feature.action && (
                <div className="feature-action">
                  <span className="action-text">Explore →</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="home-actions">
        <button
          className="action-btn primary"
          onClick={() => navigate("/diary/write")}
        >
          📝 Write Today's Entry
        </button>
        <button
          className="action-btn secondary"
          onClick={() => navigate("/calendar")}
        >
          📅 View Calendar
        </button>
        <button
          className="action-btn tertiary"
          onClick={() => navigate("/chatbot")}
        >
          🤖 Chat with Wingman
        </button>
      </div>

      {/* Architecture Guide */}
      <div className="home-guide">
        <h3 className="guide-title">🏗️ Architecture Highlights</h3>
        <div className="guide-content">
          <div className="architecture-item">
            <span className="arch-label">Frontend:</span>
            <span className="arch-value">React + TypeScript + Vite</span>
          </div>
          <div className="architecture-item">
            <span className="arch-label">Desktop:</span>
            <span className="arch-value">Electron with IPC Bridge</span>
          </div>
          <div className="architecture-item">
            <span className="arch-label">Data:</span>
            <span className="arch-value">SQLite (Local) + Supabase (Auth)</span>
          </div>
          <div className="architecture-item">
            <span className="arch-label">AI:</span>
            <span className="arch-value">Ollama Integration Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
