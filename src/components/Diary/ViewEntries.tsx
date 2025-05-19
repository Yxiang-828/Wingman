import React from "react";
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

const ViewEntries: React.FC = () => (
  <div className="diary-card">
    <h2>View Entries</h2>
    <ul>
      {dummyEntries.map(entry => (
        <li key={entry.id} className="diary-entry">
          <h3>{entry.title} <span>{entry.mood === "happy" ? "😊" : entry.mood === "excited" ? "🤩" : ""}</span></h3>
          <p className="diary-date">{entry.date}</p>
          <p>{entry.content}</p>
        </li>
      ))}
    </ul>
  </div>
);

export default ViewEntries;