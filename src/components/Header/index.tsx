import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../main.css";
import { logout } from "../../utils/logout";

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
    logout();
    navigate("/login", { replace: true });
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
    <header className="header p-4 flex items-center justify-between bg-card text-light">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">Welcome back, Leader! </span>
      </div>

      <div className="ml-auto flex items-center gap-6 px-4">
        <div className="text-right">
          <div className="text-md font-medium">
            {formatDate(currentDateTime)}
          </div>
          <div className="text-sm opacity-70">
            {formatTime(currentDateTime)}
          </div>
        </div>
        <button
          className="rounded-full bg-card p-2 hover-glow-tile"
          onClick={() => navigate("/notifications")}
        >
          <span className="icon-rotate">🔔</span>
        </button>
        <button
          className="rounded-full bg-card p-2 hover-glow-tile"
          onClick={() => navigate("/profile/settings")}
        >
          <span className="icon-rotate">⚙️</span>
        </button>
        <button
          className="rounded-full bg-card p-2 hover-glow-tile logout-btn-red"
          onClick={handleLogout}
          title="Logout"
        >
          <span className="icon-rotate">🚪 Logout </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
