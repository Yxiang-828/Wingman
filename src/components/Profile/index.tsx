import React from "react";
import { Outlet } from "react-router-dom";
import "./Profile.css";

const Profile: React.FC = () => {
  return (
    <div className="profile-container">
      <h1>Profile</h1>
      <div className="profile-content">
        {/* This Outlet will render child routes (settings/avatar) */}
        <Outlet />
      </div>
    </div>
  );
};

export default Profile;