import React, { useState } from "react";
import "./Diary.css";
import { fetchDiaryEntries } from "../../api/Diary";
import type { DiaryEntry } from "../../api/Diary";

const SearchDiary: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiaryEntry[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    // For demo: fetch today's entries and filter client-side
    const today = new Date().toISOString().slice(0, 10);
    const allEntries = await fetchDiaryEntries(today);
    setResults(
      allEntries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query.toLowerCase()) ||
          entry.content.toLowerCase().includes(query.toLowerCase())
      )
    );
    setSearching(false);
  };

  return (
    <div className="diary-card">
      <h2>Search Diary</h2>
      <input
        type="text"
        placeholder="Search entries..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="diary-search"
      />
      <button
        onClick={handleSearch}
        className="action-btn"
        disabled={searching}
      >
        {searching ? "Searching..." : "Search"}
      </button>
      <ul>
        {results.map((entry) => (
          <li key={entry.id} className="diary-entry">
            <h3>{entry.title}</h3>
            <p className="diary-date">{entry.date}</p>
            <p>{entry.content}</p>
          </li>
        ))}
        {results.length === 0 && <li>No entries found.</li>}
      </ul>
    </div>
  );
};

export default SearchDiary;
