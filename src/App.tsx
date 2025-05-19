import { HashRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar/index";
import Header from "./components/Header/index";
import Dashboard from "./components/Dashboard/index";
import Calendar from "./components/Calendar/index";
import Diary from "./components/Diary/index";
import WriteEntry from "./components/Diary/WriteEntry";
import ViewEntries from "./components/Diary/ViewEntries";
import SearchDiary from "./components/Diary/SearchDiary";
import ChatBot from "./components/ChatBot/index";
import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
import "./main.css";

const App = () => {
  return (
    <HashRouter>
      <div className="app flex h-screen bg-dark text-light">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar/*" element={<Calendar />} />
              <Route path="/chatbot" element={<ChatBot />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/diary/*" element={<Diary />}>
                <Route path="write" element={<WriteEntry />} />
                <Route path="view" element={<ViewEntries />} />
                <Route path="search" element={<SearchDiary />} />
                {/* Add more Diary subroutes here if needed */}
              </Route>
              <Route path="/home" element={<Home />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
