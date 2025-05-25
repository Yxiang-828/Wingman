import React from "react";
import "./Home.css";
import WingmanAvatar from "../components/Common/WingmanAvatar";

const Home: React.FC = () => (
  <div className="home-hero">
    <div className="flex items-center justify-center gap-4 mb-6">
      <WingmanAvatar
        size="large"
        mood="excited"
        context="dashboard"
        showMessage={true}
        message="Ready to make today amazing? Let's go! 🚀"
        className="animate-pulse"
      />
    </div>
    <h1>👋 Hey, welcome back!</h1>
    <p>
      Your digital wingman is here to help you stay organized, track your mood,
      and crush your goals.
    </p>
    <ul className="home-list">
      <li>
        ✨ Need to vent or reflect? <b>Write a new diary entry</b> anytime.
      </li>
      <li>
        📅 Want to see your schedule? <b>Check the calendar</b> for your
        upcoming plans.
      </li>
      <li>
        🤖 Feeling stuck? <b>Ask Wingman</b> for advice or a pep talk!
      </li>
      <li>
        🔍 Looking for something? <b>Search your entries</b> or{" "}
        <b>track your mood</b> with ease.
      </li>
    </ul>
    <div className="home-footer">
      <span>Let’s make today awesome. I’ve got your back! 🚀</span>
    </div>
  </div>
);

export default Home;
