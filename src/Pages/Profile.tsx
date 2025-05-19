import { Outlet } from "react-router-dom";
import "../main.css";

const Profile = () => {
  return (
    <main className="profile p-6 bg-dark rounded-lg shadow-md hover-glow-tile">
      <h1>Your Profile</h1>
      <Outlet /> {/* This renders the nested route */}
    </main>
  );
};

export default Profile;