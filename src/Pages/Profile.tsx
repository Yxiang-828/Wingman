import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import WelcomePopup from "../components/Profile/WelcomePopup";
import "../main.css";

const Profile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (location.state?.showSetup) {
      setShowPopup(true);
      // Remove state after showing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  return (
    <main className="profile p-6 bg-dark rounded-lg shadow-md hover-glow-tile">
      <h1>Your Profile</h1>
      <Outlet />
      {showPopup && (
        <WelcomePopup
          message="Welcome aboard! Let's set up your profile."
          onClose={() => setShowPopup(false)}
          icon="🛠️"
        />
      )}
    </main>
  );
};

export default Profile;