import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

import Dashboard from "./components/Dashboard";
import Calendar from "./components/Calendar";
import Diary from "./components/Diary";
import ChatBot from "./components/ChatBot";

import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
// Import only one CSS file
import "./main.css";

const App = () => {
  return (
    <Router>
      <div className="app flex h-screen bg-dark text-light">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <Header />

          {/* Content */}
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/chatbot" element={<ChatBot />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              {/* Add more routes as needed */}
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;