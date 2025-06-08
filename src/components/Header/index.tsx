// Header component that displays the main navigation bar with user greeting and quick actions
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../main.css";
import { Auth } from "../../utils/AuthStateManager";
import WingmanAvatar from "../Common/WingmanAvatar";
import "./Header.css";

const Header: React.FC = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const navigate = useNavigate();

  // Keep the clock updated every minute to show current time accurately
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    // Clean up the timer when component unmounts to prevent memory leaks
    return () => {
      clearInterval(timer);
    };
  }, []);

  // Convert date object to user-friendly display format
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  };

  // Handle user logout by delegating to authentication manager
  const handleLogout = () => {
    Auth.handleLogout();
  };

  // Convert time object to readable format for display
  const formatTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleTimeString(undefined, options);
  };

  return (
    <header className="header">
      {/* Left section contains avatar and welcome message */}
      <div className="header-left">
        <WingmanAvatar
          size="small"
          mood="happy"
          context="dashboard"
          onClick={() => navigate("/profile")}
          className="header-avatar"
        />
        <div className="welcome-section">
          {/* Personalized greeting that establishes the loyal assistant relationship */}
          <h1 className="welcome-title">
            <span className="welcome-text">Welcome back,</span>
            <span className="leader-text">Leader!</span>
          </h1>
        </div>
      </div>

      {/* Center section displays current date and time */}
      <div className="header-center">
        <div className="datetime-display">
          <div className="date-text">{formatDate(currentDateTime)}</div>
          <div className="time-text">{formatTime(currentDateTime)}</div>
        </div>
      </div>

      {/* Right section contains action buttons and logout */}
      <div className="header-right">
        <div className="header-actions">
          {/* Quick access to notifications with Wingman personality */}
          <button
            className="header-btn notifications-btn"
            onClick={() => navigate("/notifications")}
            title="View your alerts and updates, boss"
          >
            <span className="btn-icon">🔔</span>
            <span className="btn-label">Alerts</span>
          </button>

          {/* Access to user preferences and configuration */}
          <button
            className="header-btn settings-btn"
            onClick={() => navigate("/profile/settings")}
            title="Adjust your preferences, leader"
          >
            <span className="btn-icon">⚙️</span>
            <span className="btn-label">Settings</span>
          </button>

          {/* Logout button with animated door effect */}
          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Sign out when you're ready, boss"
          >
            <div className="logout-content">
              {/* Animated door graphic that opens on hover */}
              <div className="door-frame">
                <div className="door-left"></div>
                <div className="door-right"></div>
                <div className="door-handle"></div>
              </div>
              <span className="logout-text">Exit</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
