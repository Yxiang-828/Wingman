import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import "../main.css";

interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  date: string;
  mood?: "happy" | "neutral" | "sad" | "excited" | "tired";
  tags: string[];
}

const Diary: React.FC = () => {
  const location = useLocation();
  const [entries, setEntries] = useState<DiaryEntry[]>([
    {
      id: 1,
      title: "Productive Day",
      content:
        "Today was incredibly productive. I finished the frontend implementation for the Wingman app and started integrating the calendar API. The team seems to like the direction we're heading in, and I feel good about our progress. Need to make sure we maintain this momentum going forward.",
      date: "2025-05-15",
      mood: "excited",
      tags: ["work", "coding", "progress"],
    },
    {
      id: 2,
      title: "Weekend Plans",
      content:
        "Thinking about visiting the new art exhibition downtown this weekend. I've heard great things about it, and it would be nice to take a break from coding for a while. Maybe I'll invite Alex to join me there after our lunch.",
      date: "2025-05-14",
      mood: "happy",
      tags: ["weekend", "art", "plans"],
    },
    {
      id: 3,
      title: "Project Thoughts",
      content:
        "Had some interesting ideas for the Wingman app today. What if we incorporated a mood tracker into the diary component? It could provide insights into how users are feeling over time and maybe even suggest activities based on their mood patterns.",
      date: "2025-05-10",
      mood: "neutral",
      tags: ["ideas", "features", "project"],
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [newEntry, setNewEntry] = useState<{
    title: string;
    content: string;
    mood: "happy" | "neutral" | "sad" | "excited" | "tired";
    tags: string;
  }>({
    title: "",
    content: "",
    mood: "neutral",
    tags: "",
  });

  // Get the current view based on URL
  const getDiaryView = () => {
    if (location.pathname.includes("/diary/write")) {
      return "write";
    } else if (location.pathname.includes("/diary/search")) {
      return "search";
    } else {
      return "view";
    }
  };

  const currentView = getDiaryView();

  // Filter entries based on search term
  const filteredEntries = entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get mood emoji
  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case "happy":
        return "😊";
      case "neutral":
        return "😐";
      case "sad":
        return "😔";
      case "excited":
        return "🤩";
      case "tired":
        return "😴";
      default:
        return "📝";
    }
  };

  // Handle creating a new entry
  const handleCreateEntry = () => {
    const newEntryObject: DiaryEntry = {
      id: entries.length + 1,
      title: newEntry.title,
      content: newEntry.content,
      date: new Date().toISOString().split("T")[0],
      mood: newEntry.mood,
      tags: newEntry.tags.split(",").map((tag) => tag.trim()),
    };

    setEntries([newEntryObject, ...entries]);
    setNewEntry({
      title: "",
      content: "",
      mood: "neutral",
      tags: "",
    });
    setIsWriting(false);
  };

  return (
    <div className="diary">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Diary</h1>

        <div className="flex items-center gap-4">
          {/* View toggle buttons */}
          <div className="flex bg-card rounded-lg">
            <Link
              to="/diary/view"
              className={`px-4 py-2 ${
                currentView === "view" ? "bg-accent-primary text-white" : ""
              }`}
            >
              View
            </Link>
            <Link
              to="/diary/write"
              className={`px-4 py-2 ${
                currentView === "write" ? "bg-accent-primary text-white" : ""
              }`}
            >
              Write
            </Link>
            <Link
              to="/diary/search"
              className={`px-4 py-2 ${
                currentView === "search" ? "bg-accent-primary text-white" : ""
              }`}
            >
              Search
            </Link>
          </div>

          <button
            className="action-btn"
            onClick={() => {
              setIsWriting(true);
              setSelectedEntry(null);
            }}
          >
            <span>✏️</span>
            New Entry
          </button>
        </div>
      </div>

      {/* Entry writing mode */}
      {(isWriting || currentView === "write") && (
        <div className="dashboard-card bg-card mb-6">
          <h2 className="text-2xl font-bold mb-4">Write New Entry</h2>

          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="mb-1">Title</label>
              <input
                type="text"
                className="p-3 bg-dark rounded-lg border border-transparent focus:outline-none focus:border-accent-primary"
                placeholder="Enter a title for your entry"
                value={newEntry.title}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, title: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1">How are you feeling?</label>
              <div className="flex gap-4">
                {(["happy", "neutral", "sad", "excited", "tired"] as const).map(
                  (mood) => (
                    <button
                      key={mood}
                      className={`p-3 rounded-full text-2xl ${
                        newEntry.mood === mood ? "bg-accent-primary" : "bg-dark"
                      }`}
                      onClick={() => setNewEntry({ ...newEntry, mood })}
                    >
                      {getMoodEmoji(mood)}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="mb-1">Content</label>
              <textarea
                className="p-3 bg-dark rounded-lg border border-transparent focus:outline-none focus:border-accent-primary min-h-32"
                placeholder="Write your thoughts here..."
                value={newEntry.content}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, content: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col">
              <label className="mb-1">Tags (comma separated)</label>
              <input
                type="text"
                className="p-3 bg-dark rounded-lg border border-transparent focus:outline-none focus:border-accent-primary"
                placeholder="work, personal, ideas, etc."
                value={newEntry.tags}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, tags: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="bg-dark px-4 py-2 rounded-lg"
                onClick={() => setIsWriting(false)}
              >
                Cancel
              </button>
              <button
                className="action-btn"
                onClick={handleCreateEntry}
                disabled={!newEntry.title || !newEntry.content}
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar for search view */}
      {(currentView === "search" || (!isWriting && !selectedEntry)) && (
        <div className="mb-6 flex">
          <input
            type="text"
            className="flex-1 p-3 bg-dark rounded-l-lg border border-r-0 border-transparent focus:outline-none focus:border-accent-primary"
            placeholder="Search entries by title, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="bg-accent-primary p-3 rounded-r-lg hover:bg-accent-secondary">
            <span>🔍</span>
          </button>
        </div>
      )}

      {/* Entries list view */}
      {!isWriting && !selectedEntry && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="dashboard-card bg-card cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xl font-bold">{entry.title}</h3>
                  <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                </div>
                <p className="text-sm opacity-70 mb-2">
                  {formatDate(entry.date)}
                </p>
                <p className="mb-3 line-clamp-3">{entry.content}</p>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-dark px-2 py-1 rounded-full text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center p-6 bg-card rounded-lg">
              <p className="mb-3">No entries found.</p>
              <button className="action-btn" onClick={() => setIsWriting(true)}>
                <span>✏️</span>
                Write Your First Entry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Single entry view */}
      {selectedEntry && (
        <div className="dashboard-card bg-card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">{selectedEntry.title}</h2>
              <p className="text-sm opacity-70">
                {formatDate(selectedEntry.date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {getMoodEmoji(selectedEntry.mood)}
              </span>
              <button
                className="bg-dark p-2 rounded-lg"
                onClick={() => setSelectedEntry(null)}
              >
                Back
              </button>
            </div>
          </div>

          <div className="mb-6 whitespace-pre-wrap">
            {selectedEntry.content}
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedEntry.tags.map((tag) => (
              <span
                key={tag}
                className="bg-dark px-2 py-1 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-opacity-10 flex justify-between">
            <button className="bg-dark px-4 py-2 rounded-lg flex items-center gap-2">
              <span>🖋️</span> Edit
            </button>
            <button className="bg-dark px-4 py-2 rounded-lg flex items-center gap-2 text-red-400">
              <span>🗑️</span> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diary;
