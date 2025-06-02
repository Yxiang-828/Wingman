import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Task } from "../../api/Task";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import "./Dashboard.css";
import "./TasksCard.css";

interface TasksCardProps {
  tasks: Task[];
  onToggleTask: (task: Task) => Promise<Task>;
}

const TasksCard: React.FC<TasksCardProps> = ({ tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  
  // Get pending tasks only, sorted by latest first, limited to 12
  const displayTasks = useMemo(() => {
    return tasks
      .filter(task => !task.completed)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 12);
  }, [tasks]);

  const totalPendingTasks = tasks.filter(task => !task.completed).length;
  const hasMore = totalPendingTasks > 12;
  
  // Handle clicking on a task item - show popup
  const handleTaskClick = useCallback((task: Task) => {
    showPopupFor(task);
  }, [showPopupFor]);
  
  // ✅ FIXED: Task completion that triggers dashboard refresh
  const handleTaskCompletion = useCallback(async (e: React.MouseEvent, task: Task): Promise<void> => {
    e.stopPropagation(); // Prevent item click
    
    if (task.isProcessing) return;
    
    try {
      console.log(`🎯 TasksCard: Completing task ${task.id}`);
      
      // Use the parent's toggle handler
      await onToggleTask(task);
      
      // ✅ IMMEDIATE: Scroll to completed tasks card after a brief delay
      setTimeout(() => {
        const completedCard = document.querySelector('.completed-tasks-card');
        if (completedCard) {
          completedCard.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          });
          
          // Add highlight effect
          completedCard.classList.add('highlight-flash');
          setTimeout(() => {
            completedCard.classList.remove('highlight-flash');
          }, 2000);
        }
      }, 100);
      
      console.log(`✅ TasksCard: Task ${task.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Error toggling task ${task.id}:`, error);
    }
  }, [onToggleTask]);

  return (
    <div className="dashboard-card tasks-card">
      <div className="dashboard-card-header">
        <h2>Today's Tasks ({totalPendingTasks})</h2>
        <button
          className="card-action-btn"
          onClick={() => navigate("/calendar/day?tab=tasks")}
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
                  className="dashboard-item task"
                  onClick={() => handleTaskClick(task)}
                >
                  <div
                    className="item-status"
                    onClick={(e) => handleTaskCompletion(e, task)}
                    title="Mark as completed"
                  >
                    ○
                  </div>
                  
                  <div className="item-content">
                    <div className="item-title">{task.title}</div>
                    <div className="item-meta">
                      {task.task_time && (
                        <span className="item-time">{task.task_time}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {hasMore && (
              <button
                className="view-more-btn"
                onClick={() => navigate("/calendar/day?tab=tasks")}
              >
                View All {totalPendingTasks} Tasks →
              </button>
            )}
          </>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">📝</div>
            <p>No pending tasks for today</p>
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

export default TasksCard;