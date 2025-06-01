import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../main.css";
import { Auth } from "../../utils/AuthStateManager";
import WingmanAvatar from "../Common/WingmanAvatar";
import "./Header.css";

const Header: React.FC = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const navigate = useNavigate();

  // Update the date time every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Format date for display
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  };

  const handleLogout = () => {
    Auth.handleLogout();
  };

  // Format time for display
  const formatTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleTimeString(undefined, options);
  };

  return (
    <header className="header">
      <div className="header-left">
        <WingmanAvatar
          size="small"
          mood="happy"
          context="dashboard"
          onClick={() => navigate("/profile")}
          className="header-avatar"
        />
        <div className="welcome-section">
          <h1 className="welcome-title">
            <span className="welcome-text">Welcome back,</span>
            <span className="leader-text">Leader!</span>
          </h1>
        </div>
      </div>

      <div className="header-center">
        <div className="datetime-display">
          <div className="date-text">{formatDate(currentDateTime)}</div>
          <div className="time-text">{formatTime(currentDateTime)}</div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-actions">
          <button
            className="header-btn notifications-btn"
            onClick={() => navigate("/notifications")}
            title="Notifications"
          >
            <span className="btn-icon">🔔</span>
            <span className="btn-label">Alerts</span>
          </button>

          <button
            className="header-btn settings-btn"
            onClick={() => navigate("/profile/settings")}
            title="Settings"
          >
            <span className="btn-icon">⚙️</span>
            <span className="btn-label">Settings</span>
          </button>

          <button
            className="logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <div className="logout-content">
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
