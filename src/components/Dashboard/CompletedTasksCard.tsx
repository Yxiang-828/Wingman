import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import { formatDateToString } from "../../utils/timeUtils";
import "./Dashboard.css";

interface CompletedTasksCardProps {
  tasks: Task[];
}

/**
 * CompletedTasksCard Component - Your Wingman's Achievement Gallery
 * Displays completed missions with uncomplete functionality and detail popups
 * Your victories organized and ready for review, boss
 */
const CompletedTasksCard: React.FC<CompletedTasksCardProps> = ({ tasks }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();

  /**
   * Filters and sorts completed tasks by completion recency
   * Your most recent victories displayed prominently
   */
  const displayTasks = useMemo(() => {
    return tasks
      .filter((task) => task.completed)
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || "").getTime() -
          new Date(a.updated_at || a.created_at || "").getTime()
      )
      .slice(0, 12);
  }, [tasks]);

  const totalCompletedTasks = tasks.filter((task) => task.completed).length;
  const hasMore = totalCompletedTasks > 12;

  const handleTaskClick = useCallback(
    (task: Task) => {
      showPopupFor(task);
    },
    [showPopupFor]
  );

  /**
   * Handles task uncomplete with dashboard refresh
   * Your Wingman restores missions to active status
   */
  const handleStatusClick = useCallback(
    async (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();

      try {
        console.log("Wingman: Restoring task to active status:", task.id);

        await window.electronAPI.db.updateTask(task.id, {
          completed: false,
        });

        const refreshEvent = new CustomEvent("dashboard-refresh");
        window.dispatchEvent(refreshEvent);

        console.log("Wingman: Task restored and dashboard refreshed");
      } catch (error) {
        console.error("Wingman: Error restoring task:", error);
      }
    },
    []
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-card completed-tasks-card">
      <div className="dashboard-card-header">
        <h2>Completed Today ({totalCompletedTasks})</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/notifications?tab=completed")}
        >
          View All
        </button>
      </div>

      <div className="dashboard-card-content">
        {displayTasks.length > 0 ? (
          <>
            <div className="dashboard-list">
              {displayTasks.map((task) => (
                <div
                  key={task.id}
                  className="dashboard-item task completed"
                  onClick={() => handleTaskClick(task)}
                >
                  <div
                    className="item-status completed"
                    onClick={(e) => handleStatusClick(e, task)}
                    title="Mark as incomplete"
                  >
                    ✓
                  </div>

                  <div className="item-content">
                    <div className="item-title completed">{task.title}</div>
                    <div className="item-meta">
                      {task.task_time && (
                        <span className="item-time">{task.task_time}</span>
                      )}
                      <span className="item-time">
                        {formatDate(task.task_date)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                className="view-more-btn"
                onClick={() => navigate("/notifications?tab=completed")}
              >
                View All {totalCompletedTasks} Completed →
              </button>
            )}
          </>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">✅</div>
            <p>No victories yet today, boss</p>
            <button
              className="action-btn"
              onClick={() => navigate("/calendar/day?tab=tasks")}
            >
              Add Mission
            </button>
          </div>
        )}
      </div>

      {currentPopupItem && (
        <DetailPopup
          item={currentPopupItem}
          onClose={closePopup}
          container={document.body}
        />
      )}
    </div>
  );
};

export default CompletedTasksCard;
