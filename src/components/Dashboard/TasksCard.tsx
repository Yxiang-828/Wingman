import React from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import { useData } from "../../context/DataContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";

interface TasksCardProps {
  tasks: Task[]; // Should be pending tasks only
  onToggleTask: (task: Task) => void;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  const { toggleTask } = useData();

  // ✅ ADD: Debug logging to see what we receive
  React.useEffect(() => {
    console.log(`🔧 TasksCard DEBUG: Received ${tasks?.length || 0} tasks`);
    console.log(`🔧 TasksCard DEBUG: Tasks data:`, tasks);
    if (tasks && tasks.length > 0) {
      console.log(`🔧 TasksCard DEBUG: First task:`, tasks[0]);
      const pending = tasks.filter((t) => !t.completed);
      console.log(`🔧 TasksCard DEBUG: Pending tasks: ${pending.length}`);
    }
  }, [tasks]);

  // ✅ ADD: Show what we're rendering
  const pendingTasks = React.useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) {
      console.log(`🔧 TasksCard DEBUG: Invalid tasks data:`, tasks);
      return [];
    }
    const pending = tasks.filter((task) => !task.completed);
    console.log(
      `🔧 TasksCard DEBUG: Filtered ${pending.length} pending from ${tasks.length} total`
    );
    return pending;
  }, [tasks]);

  // Handle clicking on a task item - show popup
  const handleTaskClick = (task: Task) => {
    showPopupFor(task);
  };

  // Handle clicking on the task status circle specifically - toggle completion
  const handleStatusClick = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    e.preventDefault();

    // Prevent multiple simultaneous toggle operations
    if (task.isProcessing) return;

    // Create a local copy with processing state
    const processingTask = { ...task, isProcessing: true };
    onToggleTask(processingTask);

    try {
      // Pass the entire task object instead of just id and completed status
      const updatedTask = await toggleTask(task);

      // Update UI with the result
      onToggleTask(updatedTask);

      // Close popup if open for this task
      if (
        currentPopupItem &&
        "id" in currentPopupItem &&
        currentPopupItem.id === task.id
      ) {
        closePopup();
      }
    } catch (error) {
      console.error("Error toggling task status:", error);
      onToggleTask(task); // Revert on error
    }
  };

  // Function to handle task completion from popup - delegate to handleStatusClick
  const completeTask = async (taskId: number): Promise<void> => {
    console.log("TaskCard: completeTask called for ID:", taskId);

    // Find the task with better error handling
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      console.error(`Task with ID ${taskId} not found in current tasks list`);

      // Try to find the task in the global cache as fallback
      try {
        // Example implementation: search in tasks array (or replace with actual cache lookup)
        const taskFromCache = tasks.find((t) => t.id === taskId);
        if (taskFromCache) {
          console.log("Found task in cache instead:", taskFromCache);
          // Continue with the found task
          await toggleTask(taskFromCache);
          onToggleTask(taskFromCache);
          closePopup();
          return;
        }
      } catch (err) {
        console.error("Error looking up task in cache:", err);
      }

      closePopup(); // Close the popup even if we couldn't find the task
      return;
    }

    try {
      // Use the DataProvider to toggle the task
      const updatedTask = await toggleTask(task);
      console.log("TaskCard: Task toggled successfully:", updatedTask);

      // Propagate the change up to parent component
      onToggleTask(updatedTask);

      // Close the popup if it's open
      closePopup();
    } catch (error) {
      console.error("Error toggling task status:", error);
    }
  };

  return (
    <div className="dashboard-card tasks-card">
      <div className="dashboard-card-header">
        <h2>Today's Tasks</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day")}
        >
          View All
        </button>
      </div>

      {/* ✅ ADD: Debug display */}
      <div
        style={{
          fontSize: "0.8rem",
          color: "#666",
          padding: "0.5rem",
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      >
        DEBUG: Received {tasks?.length || 0} tasks, {pendingTasks.length} pending
        {tasks && tasks.length > 0 && (
          <div>
            Sample: {tasks[0]?.title} (completed:{" "}
            {tasks[0]?.completed ? "true" : "false"})
          </div>
        )}
      </div>

      {pendingTasks.length > 0 ? (
        <ul className="tasks-list">
          {pendingTasks.map((task) => (
            <li
              key={`task-${task.id}`}
              className={`task-item ${task.completed ? "completed" : ""}`}
              onClick={() => handleTaskClick(task)}
            >
              <div
                className="task-status"
                onClick={(e) => handleStatusClick(e, task)}
              >
                {task.completed ? "✓" : "○"}
              </div>
              <div className="task-title">{task.title}</div>
              {task.task_time && (
                <div className="task-meta">
                  <span className="task-time">{task.task_time}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-list-message">
          <p>No pending tasks for today</p>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>
            Total received: {tasks?.length || 0} | Pending: {pendingTasks.length}
          </div>
          {/* Change this button to navigate to tasks tab specifically */}
          <button
            className="action-btn small"
            onClick={() => navigate("/calendar/day?tab=tasks")}
          >
            Add Task
          </button>
        </div>
      )}

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          onComplete={completeTask}
          container={document.body}
        />
      )}
    </div>
  );
};

export default TasksCard;
