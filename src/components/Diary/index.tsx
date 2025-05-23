import React from "react";
import { Routes, Route } from "react-router-dom";
import DiaryEntry from "./DiaryEntry";
import ViewEntries from "./ViewEntries";
import SearchDiary from "./DiarySearch";
import EditEntry from "./EditEntry";
import "./DiaryEntry.css";

const Diary: React.FC = () => {
  return (
    <div className="diary-container">
      <Routes>
        <Route path="/" element={<ViewEntries />} />
        {/* Use DiaryEntry for WriteEntry functionality with isNewEntry prop */}
        <Route path="/write" element={<DiaryEntry isNewEntry={true} />} />
        <Route path="/view" element={<ViewEntries />} />
        <Route path="/search" element={<SearchDiary />} />
        <Route path="/edit" element={<EditEntry />} />
      </Routes>
    </div>
  );
};

export default Diary;
