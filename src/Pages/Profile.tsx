// Profile command center - your personal domain configuration hub
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import WelcomePopup from "../components/Profile/WelcomePopup";
import "../main.css";

const Profile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);

  // Handle welcome setup flow for new commanders
  useEffect(() => {
    if (location.state?.showSetup) {
      setShowPopup(true);
      // Clear navigation state after showing popup
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  return (
    <main className="profile p-6 bg-dark rounded-lg shadow-md hover-glow-tile">
      <h1>Your Command Center</h1>
      <Outlet />
      {showPopup && (
        <WelcomePopup
          message="Welcome aboard, Commander! Your Wingman is ready to help you configure your digital realm."
          onClose={() => setShowPopup(false)}
          icon="⚙️"
          type="setup"
        />
      )}
    </main>
  );
};

export default Profile;
