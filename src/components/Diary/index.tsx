import React from "react";
import { Routes, Route } from "react-router-dom";
import DiaryEntry from "./DiaryEntry";
import ViewEntries from "./ViewEntries";
import SearchDiary from "./DiarySearch";
import EditEntry from "./EditEntry";
import "./DiaryEntry.css";

/**
 * Diary Component - Your Wingman's Memory Management Hub
 * Central router for all diary functionality with unified styling
 * Where thoughts flow seamlessly between writing, viewing, and searching
 */
const Diary: React.FC = () => {
  return (
    <div className="diary-container">
      <Routes>
        <Route path="/" element={<ViewEntries />} />
        <Route path="/write" element={<DiaryEntry isNewEntry={true} />} />
        <Route path="/view" element={<ViewEntries />} />
        <Route path="/search" element={<SearchDiary />} />
        <Route path="/edit" element={<EditEntry />} />
      </Routes>
    </div>
  );
};

export default Diary;
