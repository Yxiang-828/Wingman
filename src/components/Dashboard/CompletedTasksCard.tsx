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

const CompletedTasksCard: React.FC<CompletedTasksCardProps> = ({ tasks }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  
  // Get completed tasks only, sorted by latest first, limited to 12
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

  // ✅ FIXED: Handle uncomplete task and trigger dashboard refresh
  const handleStatusClick = useCallback(
    async (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      
      try {
        console.log(`🔄 CompletedTasksCard: Uncompleting task ${task.id}`);
        
        // Update in database
        await window.electronAPI.db.updateTask(task.id, {
          completed: false,
        });
        
        // ✅ TRIGGER: Dashboard refresh
        const refreshEvent = new CustomEvent("dashboard-refresh");
        window.dispatchEvent(refreshEvent);
        
        console.log(`✅ CompletedTasksCard: Task ${task.id} uncompleted and dashboard refreshed`);
        
      } catch (error) {
        console.error("Error uncompleting task:", error);
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
    } catch (error) {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-card completed-tasks-card">
      <div className="dashboard-card-header">
        <h2>Completed Today ({totalCompletedTasks})</h2>
        <button
          className="card-action-btn"
          onClick={() => {
            const today = formatDateToString(new Date());
            navigate(`/completed-tasks?date=${today}`);
          }}
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
                onClick={() => {
                  const today = formatDateToString(new Date());
                  navigate(`/completed-tasks?date=${today}`);
                }}
              >
                View All {totalCompletedTasks} Completed &rarr;
              </button>
            )}
          </>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">✅</div>
            <p>No completed tasks today</p>
            <button
              className="action-btn"
              onClick={() => navigate("/calendar/day?tab=tasks")}
            >
              Add Task
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
