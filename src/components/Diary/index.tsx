import React from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import WriteEntry from "./WriteEntry";
import ViewEntries from "./ViewEntries";
import SearchDiary from "./SearchDiary";
import EditEntry from "./EditEntry"; // Import the new component
import "./Diary.css";

const Diary: React.FC = () => {
  return (
    <div className="diary-container">
      <Routes>
        <Route path="/" element={<Outlet />} />
        <Route path="/write" element={<WriteEntry />} />
        <Route path="/view" element={<ViewEntries />} />
        <Route path="/search" element={<SearchDiary />} />
        <Route path="/edit" element={<EditEntry />} /> {/* Add this route */}
      </Routes>
    </div>
  );
};

export default Diary;