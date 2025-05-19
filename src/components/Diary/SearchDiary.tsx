import React, { useState } from "react";
import "./Diary.css";

const dummyEntries = [
  {
    id: 1,
    title: "Productive Day",
    content: "Finished the frontend implementation...",
    date: "2025-05-15",
    mood: "excited",
  },
  {
    id: 2,
    title: "Weekend Plans",
    content: "Thinking about visiting the new art exhibition...",
    date: "2025-05-14",
    mood: "happy",
  },
];

const SearchDiary: React.FC = () => {
  const [query, setQuery] = useState("");
  const results = dummyEntries.filter(
    entry =>
      entry.title.toLowerCase().includes(query.toLowerCase()) ||
      entry.content.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="diary-card">
      <h2>Search Diary</h2>
      <input
        type="text"
        placeholder="Search entries..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="diary-search"
      />
      <ul>
        {results.map(entry => (
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