import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import { useTheme } from "../../context/ThemeContext";
import { useDataContext } from "../../context/DataContext";
import { getCurrentUserId, logoutUser } from "../../utils/auth";
import { deleteUserAccount } from "../../api/user";
import { RecurringTask } from "../../api/Task";
import ModelManager from "./ModelManager";
import "./Settings.css";
import { themePersonalityMap } from "../../constants/themePersonalitymap";

type Theme = "dark" | "light" | "yandere" | "kuudere" | "tsundere" | "dandere";

// Form state reducer for better performance
interface FormState {
  task_title: string;
  task_time: string;
  weekdays: number[];
  is_active: boolean;
}

type FormAction =
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_TIME"; payload: string }
  | { type: "TOGGLE_WEEKDAY"; payload: number }
  | { type: "SET_ACTIVE"; payload: boolean }
  | { type: "RESET" };

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, task_title: action.payload };
    case "SET_TIME":
      return { ...state, task_time: action.payload };
    case "TOGGLE_WEEKDAY":
      const weekday = action.payload;
      return {
        ...state,
        weekdays: state.weekdays.includes(weekday)
          ? state.weekdays.filter((d) => d !== weekday)
          : [...state.weekdays, weekday],
      };
    case "SET_ACTIVE":
      return { ...state, is_active: action.payload };
    case "RESET":
      return {
        task_title: "",
        task_time: "09:00",
        weekdays: [],
        is_active: true,
      };
    default:
      return state;
  }
};

const ProfileSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { getRecurringTasks, createRecurringTask, deleteRecurringTask } =
    useDataContext();
  const [message, setMessage] = useState("");
  // Simple message handling
  const showMessage = useCallback((msg: string, duration: number = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), duration);
  }, []);

  // Recurring task management state
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [loadingRecurringTasks, setLoadingRecurringTasks] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Use reducer for form state to reduce re-renders
  const [newTask, dispatch] = useReducer(formReducer, {
    task_title: "",
    task_time: "09:00",
    weekdays: [],
    is_active: true,
  });

  // Delete account state
  const [deleteOperations, setDeleteOperations] = useState({
    deletingTasks: false,
    deletingEvents: false,
    deletingDiaryEntries: false,
    deletingRecurringTasks: false,
    clearingChatHistory: false,
    deletingAccount: false,
  });

  // Danger zone expansion state
  const [dangerZoneExpanded, setDangerZoneExpanded] = useState(false);
  // Memoize expensive calculations
  const isAnyDeleteOperationActive = useMemo(
    () => Object.values(deleteOperations).some(Boolean),
    [deleteOperations],
  );

  const themes: Theme[] = useMemo(
    () => ["dark", "light", "yandere", "kuudere", "tsundere", "dandere"],
    [],
  );
  useEffect(() => {
    loadUserSettings();
    loadRecurringTasks();
  }, []);

  const loadUserSettings = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        console.warn("User settings: User not authenticated");
        return;
      }

      const settings = await window.electronAPI.db.getUserSettings(userId);

      if (settings) {
        // Theme is already managed by ThemeContext
        // AI model settings are now handled by ModelManager component
      }
    } catch (error) {
      console.error("Failed to load user settings:", error);
    }
  };

  const loadRecurringTasks = useCallback(async () => {
    try {
      setLoadingRecurringTasks(true);
      const tasks = await getRecurringTasks();
      setRecurringTasks(tasks);
    } catch (error) {
      console.error("Failed to load recurring tasks:", error);
    } finally {
      setLoadingRecurringTasks(false);
    }
  }, [getRecurringTasks]);

  const handleCreateRecurringTask = useCallback(async () => {
    try {
      if (!newTask.task_title.trim() || newTask.weekdays.length === 0) {
        setMessage("Please fill in all required fields");
        return;
      }

      await createRecurringTask({
        task_title: newTask.task_title,
        task_time: newTask.task_time,
        weekdays: newTask.weekdays,
        is_active: newTask.is_active,
        user_id: getCurrentUserId()!,
      });
      dispatch({ type: "RESET" });
      setShowCreateForm(false);
      await loadRecurringTasks();
      showMessage(
        "Recurring task template created! Tasks will be automatically generated on the specified days.",
        5000,
      );
    } catch (error) {
      console.error("Failed to create recurring task:", error);
      showMessage("Error: Failed to create recurring task");
    }
  }, [
    createRecurringTask,
    loadRecurringTasks,
    newTask.task_title,
    newTask.task_time,
    newTask.weekdays,
    newTask.is_active,
  ]);

  const handleDeleteRecurringTask = useCallback(
    async (id: number) => {
      try {
        setDeletingId(id);
        const confirmed = await window.electronAPI.dialogs.confirm(
          "Are you sure you want to delete this recurring task template? This will not affect tasks that have already been created from this template.",
        );

        if (!confirmed) {
          console.log("Recurring task deletion cancelled by user");
          return;
        }
        await deleteRecurringTask(id);
        await loadRecurringTasks();

        showMessage("Recurring task template deleted successfully");
      } catch (error) {
        console.error("Failed to delete recurring task:", error);
        showMessage("Error: Failed to delete recurring task template");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteRecurringTask, loadRecurringTasks],
  ); // Delete account functions - using useCallback to prevent re-renders that break inputs
  const handleDeleteAllTasks = useCallback(async () => {
    // Double confirmation for safety
    const confirmed = await window.electronAPI.dialogs.confirm(
      "⚠️ DELETE ALL TASKS - This will permanently delete ALL your tasks across all dates. This action cannot be undone. Are you absolutely sure?",
    );

    if (!confirmed) {
      setMessage("Task deletion cancelled");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        setMessage("Error: User not authenticated. Please log in again.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      const allTasks = await window.electronAPI.db.getAllTasks(userId);
      let deletedCount = 0;

      for (const task of allTasks) {
        try {
          await window.electronAPI.db.deleteTask(task.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete task ${task.id}:`, error);
        }
      }

      setMessage(`Successfully deleted ${deletedCount} tasks`);
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Failed to delete all tasks:", error);
      setMessage("Error: Failed to delete all tasks");
      setTimeout(() => setMessage(""), 3000);
    }
  }, []);
  const handleDeleteAllEvents = useCallback(async () => {
    // Double confirmation for safety
    const confirmed = await window.electronAPI.dialogs.confirm(
      "⚠️ DELETE ALL EVENTS - This will permanently delete ALL your events across all dates. This action cannot be undone. Are you absolutely sure?",
    );

    if (!confirmed) {
      setMessage("Event deletion cancelled");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      setDeleteOperations((prev) => ({ ...prev, deletingEvents: true }));
      const userId = getCurrentUserId();
      if (!userId) {
        setMessage("Error: User not authenticated. Please log in again.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      const allEvents = await window.electronAPI.db.getAllEvents(userId);
      let deletedCount = 0;

      for (const event of allEvents) {
        try {
          await window.electronAPI.db.deleteEvent(event.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete event ${event.id}:`, error);
        }
      }

      setMessage(`Successfully deleted ${deletedCount} events`);
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Failed to delete all events:", error);
      setMessage("Error: Failed to delete all events");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setDeleteOperations((prev) => ({ ...prev, deletingEvents: false }));
    }
  }, []);
  const handleDeleteAllDiaryEntries = useCallback(async () => {
    // Double confirmation for safety
    const confirmed = await window.electronAPI.dialogs.confirm(
      "⚠️ DELETE ALL DIARY ENTRIES - This will permanently delete ALL your diary entries across all dates. This action cannot be undone. Are you absolutely sure?",
    );

    if (!confirmed) {
      setMessage("Diary deletion cancelled");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      setDeleteOperations((prev) => ({ ...prev, deletingDiaryEntries: true }));
      const userId = getCurrentUserId();
      if (!userId) {
        setMessage("Error: User not authenticated. Please log in again.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      const allEntries = await window.electronAPI.db.getAllDiaryEntries(userId);
      let deletedCount = 0;

      for (const entry of allEntries) {
        try {
          await window.electronAPI.db.deleteDiaryEntry(entry.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete diary entry ${entry.id}:`, error);
        }
      }

      setMessage(`Successfully deleted ${deletedCount} diary entries`);
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Failed to delete all diary entries:", error);
      setMessage("Error: Failed to delete all diary entries");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setDeleteOperations((prev) => ({ ...prev, deletingDiaryEntries: false }));
    }
  }, []);
  const handleDeleteAllRecurringTasks = useCallback(async () => {
    // Double confirmation for safety
    const confirmed = await window.electronAPI.dialogs.confirm(
      "⚠️ DELETE ALL RECURRING TASK TEMPLATES - This will permanently delete ALL your recurring task templates. This action cannot be undone. Are you absolutely sure?",
    );

    if (!confirmed) {
      setMessage("Recurring task deletion cancelled");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      setDeleteOperations((prev) => ({
        ...prev,
        deletingRecurringTasks: true,
      }));
      const tasks = await getRecurringTasks();
      let deletedCount = 0;

      for (const task of tasks) {
        try {
          await deleteRecurringTask(task.id!);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete recurring task ${task.id}:`, error);
        }
      }

      await loadRecurringTasks(); // Refresh the list

      setMessage(
        `Successfully deleted ${deletedCount} recurring task templates`,
      );
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Failed to delete all recurring task templates:", error);
      setMessage("Error: Failed to delete all recurring task templates");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setDeleteOperations((prev) => ({
        ...prev,
        deletingRecurringTasks: false,
      }));
    }
  }, [getRecurringTasks, deleteRecurringTask, loadRecurringTasks]);
  const handleClearChatHistory = useCallback(async () => {
    // Double confirmation for safety
    const confirmed = await window.electronAPI.dialogs.confirm(
      "⚠️ CLEAR ALL CHAT HISTORY - This will permanently delete ALL your chat conversations. This action cannot be undone. Are you absolutely sure?",
    );

    if (!confirmed) {
      setMessage("Chat history clearing cancelled");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      setDeleteOperations((prev) => ({ ...prev, clearingChatHistory: true }));
      const userId = getCurrentUserId();
      if (!userId) {
        setMessage("Error: User not authenticated. Please log in again.");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      await window.electronAPI.db.clearChatHistory(userId);

      setMessage(
        "Chat history cleared successfully. All conversation data has been permanently deleted.",
      );
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      setMessage("Error: Failed to clear chat history");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setDeleteOperations((prev) => ({ ...prev, clearingChatHistory: false }));
    }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    // Safety confirmation using our custom dialog system
    const confirmed = await window.electronAPI.dialogs.confirm(
      "Delete Account Forever - This will permanently delete your account and ALL data: All tasks and events, All diary entries, All recurring task templates, Chat history, User account from SQLite Local. This action cannot be undone. Are you absolutely sure?",
    );

    if (!confirmed) {
      setMessage("Account deletion cancelled - safety confirmation declined");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setDeleteOperations((prev) => ({ ...prev, deletingAccount: true }));

    try {
      // Delete all local data first
      await handleDeleteAllTasks();
      await handleDeleteAllEvents();
      await handleDeleteAllDiaryEntries();
      await handleDeleteAllRecurringTasks();
      await handleClearChatHistory(); // Delete account from SQLite Local
      setMessage("🗑️ Deleting user account from SQLite Local...");
      try {
        const userId = getCurrentUserId();
        if (!userId) throw new Error("User ID not found");
        await deleteUserAccount(userId);
        setMessage("User account successfully deleted from SQLite Local!");
      } catch (sqliteLocalError) {
        console.error("Failed to delete SQLite Local account:", sqliteLocalError);
        setMessage(
          "⚠️ Local data deleted, but failed to delete SQLite Local account. You may need to contact support.",
        );
        setTimeout(() => setMessage(""), 7000);
      } // Clear local session
      localStorage.clear();
      sessionStorage.clear();

      if (typeof window !== "undefined") {
        try {
          logoutUser();
          setMessage("Account deleted. Redirecting to login page...");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } catch (logoutError) {
          console.error(
            "Failed to logout after account deletion:",
            logoutError,
          );
          window.location.href = "/login";
        }
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      setMessage(
        "Error: Failed to complete account deletion. Some data may remain.",
      );
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setDeleteOperations((prev) => ({ ...prev, deletingAccount: false }));
    }
  }, [
    handleDeleteAllTasks,
    handleDeleteAllEvents,
    handleDeleteAllDiaryEntries,
    handleDeleteAllRecurringTasks,
    handleClearChatHistory,
  ]);
  const toggleWeekday = useCallback((day: number) => {
    dispatch({ type: "TOGGLE_WEEKDAY", payload: day });
  }, []);
  const handleTaskTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: "SET_TITLE", payload: e.target.value });
    },
    [],
  );
  const handleTaskTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type: "SET_TIME", payload: e.target.value });
    },
    [],
  );

  const formatWeekdays = (weekdays: number[]) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return weekdays.map((day) => days[day]).join(", ");
  };
  const getThemeDisplayName = (themeValue: Theme) => {
    const themeNames = {
      dark: "Dark 🌙",
      light: "Light ☀️",
      yandere: "Yandere 🌸",
      kuudere: "Kuudere ❄️",
      tsundere: "Tsundere 🧡",
      dandere: "Dandere 💜",
    };
    return themeNames[themeValue];
  };

  const getThemeDescription = (themeValue: Theme) => {
    const descriptions = {
      dark: "Clean dark theme for focused work",
      light: "Bright and clean light theme",
      yandere: "Passionate pink with obsessive love vibes",
      kuudere: "Cool blue with hidden warmth",
      tsundere: "Fiery orange that's definitely not cute",
      dandere: "Gentle purple for shy personalities",
    };
    return descriptions[themeValue];
  };

  const themeQuotes: Record<string, string> = {
    light:
      "Good morning! ✨ I see you have some exciting plans today - ready to tackle them together?",
    dark: "Your schedule is analyzed. Proceed.",
    tsundere:
      "Don't think I organized this perfectly for you! It's just... logical efficiency! 😤",
    kuudere: "I've analyzed your schedule. Efficiency levels are... adequate.",
    yandere: "I've been watching over everything... you're here. 💖",
    dandere: "Um... h-hello... how can I help you today? 🌸",
  };

  const themeDescriptions: Record<string, string> = {
    light:
      "Optimistic and encouraging, aims to be a warm and supportive presence to help you stay motivated.",
    dark: "Analytical and direct, focused on efficiency and providing minimal but insightful guidance.",
    tsundere:
      "Appears distant and defensive at first but is secretly caring, offering reluctant help with underlying affection.",
    kuudere:
      " Reserved and logical with a professional demeanor, gradually revealing a more caring side through its analytical support.",
    yandere:
      "Intensely loyal and protective, it is deeply observant and provides highly personalized, caring support.",
    dandere:
      "A shy and soft-spoken helper who offers gentle suggestions and encouragement with deep, caring undertones.",
  };

  return (
    <div className="profile-settings-container">
      <h1 className="settings-main-title">Profile Settings</h1>
      {message && (
        <div
          className={`settings-message ${
            message.includes("Error") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}
      {/* User Info Section */}
      <div className="settings-card">
        {" "}
        <h2 className="settings-card-title">User Information</h2>
        <div className="user-info-grid">
          <div className="user-info-item">
            <span className="user-info-label">User ID</span>
            <span className="user-info-value">
              {getCurrentUserId() || "Not authenticated"}
            </span>
          </div>
        </div>
      </div>
      {/* Theme Selection */}
      <div className="settings-card">
        <h2 className="settings-card-title">Avatar Selection</h2>
        <div className="setting-group">
          <label className="setting-label">Choose Your Avatar</label>
          <div className="theme-grid">
            {themes.map((themeOption) => {
              const themeData = themePersonalityMap[themeOption];
              return (
                <div
                  key={themeOption}
                  className={`theme-option ${
                    theme === themeOption ? "active" : ""
                  }`}
                  onClick={() => setTheme(themeOption)}
                >
                  <div className="theme-avatar-preview">
                    <img
                      src={themeData.avatar}
                      alt={themeData.name}
                      className="theme-avatar-img"
                      style={{ width: 200, height: 200, borderRadius: "8px" }}
                    />
                  </div>
                  <div className="theme-option-header">
                    <span className="theme-name">{themeData.name}</span>
                  </div>

                  <p className="theme-description">
                    Wingman AI chat personality:{" "}
                    {themeDescriptions[themeOption]}
                  </p>
                  <div className="theme-quote">
                    <span style={{ fontStyle: "italic", color: "#8a2be2" }}>
                      "{themeQuotes[themeOption]}"
                    </span>
                  </div>
                  <div className="theme-mapped">
                    <span style={{ fontSize: "0.9em", color: "#888" }}>
                      Theme: {getThemeDisplayName(themeOption)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Recurring Tasks Management */}
      <div className="settings-card">
        <h2 className="settings-card-title">Recurring Task Templates</h2>
        <p
          style={{
            marginBottom: "1.5rem",
            color: "var(--color-text-secondary, #a0a0a0)",
          }}
        >
          Create templates that automatically generate tasks on specified days
        </p>

        <div style={{ marginBottom: "1.5rem" }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="create-task-btn"
          >
            {showCreateForm ? "Cancel" : "Create New Template"}
          </button>
        </div>

        {showCreateForm && (
          <div className="create-task-form">
            <div className="form-group">
              <label>Task Title</label>
              <input
                type="text"
                className="form-input"
                value={newTask.task_title}
                onChange={handleTaskTitleChange}
                placeholder="Enter task title"
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                className="form-input"
                value={newTask.task_time}
                onChange={handleTaskTimeChange}
              />
            </div>
            <div className="form-group">
              <label>Active Days</label>
              <div className="weekday-selector">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day, index) => (
                    <button
                      key={day}
                      type="button"
                      className={`weekday-option ${
                        newTask.weekdays.includes(index) ? "selected" : ""
                      }`}
                      onClick={() => toggleWeekday(index)}
                    >
                      {day}
                    </button>
                  ),
                )}
              </div>
            </div>{" "}
            <div className="form-group"></div>
            <div className="form-actions">
              <button onClick={handleCreateRecurringTask} className="save-btn">
                Create Template
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="recurring-tasks-list">
          {loadingRecurringTasks ? (
            <div className="loading-spinner">Loading recurring tasks...</div>
          ) : recurringTasks.length === 0 ? (
            <div className="no-tasks">No recurring task templates yet</div>
          ) : (
            recurringTasks.map((task) => (
              <div key={task.id} className="recurring-task-item">
                <div className="task-info">
                  <div className="task-title">{task.task_title}</div>
                  <div className="task-details">
                    <span className="task-time">{task.task_time}</span>
                    <span className="task-weekdays">
                      {formatWeekdays(task.weekdays)}
                    </span>
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    onClick={() => handleDeleteRecurringTask(task.id!)}
                    disabled={deletingId === task.id}
                    className="delete-btn"
                  >
                    {deletingId === task.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>{" "}
      {/* Danger Zone */}
      <div className="settings-section danger-zone">
        <div
          className="danger-zone-header"
          onClick={() => setDangerZoneExpanded(!dangerZoneExpanded)}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3>⚠️ Danger Zone</h3>
            <p>These actions are permanent and cannot be undone</p>
          </div>
          <span style={{ fontSize: "1.2em" }}>
            {dangerZoneExpanded ? "▼" : "▶"}
          </span>
        </div>

        {dangerZoneExpanded && (
          <div className="danger-actions">
            <button
              onClick={handleDeleteAllTasks}
              className="danger-btn"
              disabled={isAnyDeleteOperationActive}
            >
              🗑️ Delete All Tasks
            </button>

            <button
              onClick={handleDeleteAllEvents}
              className="danger-btn"
              disabled={isAnyDeleteOperationActive}
            >
              🗑️ Delete All Events
            </button>

            <button
              onClick={handleDeleteAllDiaryEntries}
              className="danger-btn"
              disabled={isAnyDeleteOperationActive}
            >
              🗑️ Delete All Diary Entries
            </button>

            <button
              onClick={handleDeleteAllRecurringTasks}
              className="danger-btn"
              disabled={isAnyDeleteOperationActive}
            >
              🗑️ Delete All Recurring Tasks
            </button>

            <button
              onClick={handleClearChatHistory}
              className="danger-btn"
              disabled={isAnyDeleteOperationActive}
            >
              🗑️ Clear Chat History
            </button>

            <button
              onClick={handleDeleteAccount}
              className="danger-btn delete-account-btn"
              disabled={isAnyDeleteOperationActive}
            >
              💀 Delete Account Forever
            </button>
          </div>
        )}
      </div>{" "}
      {/* Model Manager Component */}
      <ModelManager />
      {/* Loading Overlay - Prevents UI interaction during delete operations */}
      {isAnyDeleteOperationActive && (
        <div className="delete-loading-overlay">
          <div className="delete-loading-content">
            <div className="delete-loading-spinner"></div>
            <h3>Processing Delete Operation</h3>
            <p>
              {deleteOperations.deletingTasks && "Deleting all tasks..."}
              {deleteOperations.deletingEvents && "Deleting all events..."}
              {deleteOperations.deletingDiaryEntries &&
                "Deleting all diary entries..."}
              {deleteOperations.deletingRecurringTasks &&
                "Deleting all recurring task templates..."}
              {deleteOperations.clearingChatHistory &&
                "Clearing chat history..."}
              {deleteOperations.deletingAccount &&
                "Deleting account and all data..."}
            </p>
            <div className="delete-loading-warning">
              Please wait - Do not close the application
            </div>{" "}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProfileSettings);
