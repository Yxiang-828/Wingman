import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useNotifications } from "../../context/NotificationsContext";
import DetailPopup from "../Common/DetailPopup";
import ErrorBoundary from "../ErrorBoundary";
import "./CompletedTasks.css";

const CompletedTasks: React.FC = () => {
  const navigate = useNavigate();
  const { 
    taskCache, 
    refreshData, 
    toggleTask, 
    deleteExistingTask 
  } = useData();
  const { showPopupFor, currentPopupItem, closePopup } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState<string>("");
  
  // Group tasks by date for organization
  const [groupedTasks, setGroupedTasks] = useState<Record<string, any>>({});
  
  // Fetch and filter completed tasks
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        await refreshData();
        setError(null);
      } catch (err) {
        console.error("Error loading tasks:", err);
        setError("Failed to load tasks. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, []);
  
  // Filter and group tasks when tasks or filter changes
  useEffect(() => {
    // Filter completed tasks from the cache
    const allTasks = Object.values(taskCache).flat();
    const completed = allTasks.filter(task => 
      task.completed && 
      (filterDate ? task.date === filterDate : true)
    );
    
    setCompletedTasks(completed);
    
    // Group by date for display
    const grouped: Record<string, any[]> = {};
    completed.forEach(task => {
      if (!grouped[task.date]) {
        grouped[task.date] = [];
      }
      grouped[task.date].push(task);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedGrouped: Record<string, any[]> = {};
    Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach(date => {
        sortedGrouped[date] = grouped[date];
      });
    
    setGroupedTasks(sortedGrouped);
  }, [taskCache, filterDate]);
  
  // Handle toggling a task back to incomplete
  const handleToggleTask = async (task: any) => {
    try {
      await toggleTask(task);
    } catch (err) {
      console.error("Error toggling task:", err);
      setError("Failed to update task status. Please try again.");
    }
  };
  
  // Handle deleting a task
  const handleDeleteTask = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteExistingTask(id);
      } catch (err) {
        console.error("Error deleting task:", err);
        setError("Failed to delete task. Please try again.");
      }
    }
  };
  
  // View task details in popup
  const handleViewTaskDetails = (task: any) => {
    showPopupFor(task);
  };
  
  // Format date for display
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Complete task from popup
  const completeTaskFromPopup = async (taskId: number) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await toggleTask(task);
      }
    } catch (err) {
      console.error("Error completing task from popup:", err);
      setError("Failed to update task. Please try again.");
    }
  };
  
  return (
    <ErrorBoundary>
      <div className="completed-tasks-container">
        <div className="completed-tasks-header">
          <h1>Completed Tasks</h1>
          <div className="completed-tasks-actions">
            <button 
              className="back-button"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <div className="date-filter">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="date-input"
              />
              {filterDate && (
                <button 
                  className="clear-filter"
                  onClick={() => setFilterDate("")}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => refreshData()}>Try Again</button>
          </div>
        )}
        
        {loading ? (
          <div className="loading-container">
            <p>Loading completed tasks...</p>
          </div>
        ) : completedTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h2>No completed tasks found</h2>
            {filterDate ? (
              <p>No tasks completed on this date. Try selecting a different date or clearing the filter.</p>
            ) : (
              <p>You haven't completed any tasks yet. Tasks you complete will appear here.</p>
            )}
            <button 
              className="action-button"
              onClick={() => navigate("/calendar/day")}
            >
              Go to Today's Tasks
            </button>
          </div>
        ) : (
          <div className="completed-tasks-list">
            <div className="task-count">
              {completedTasks.length} {completedTasks.length === 1 ? 'task' : 'tasks'} completed
            </div>
            
            {Object.entries(groupedTasks).map(([date, tasks]) => (
              <div key={date} className="date-group">
                <h2 className="date-header">{formatDateHeader(date)}</h2>
                <ul className="task-group">
                  {tasks.map(task => (
                    <li 
                      key={task.id} 
                      className="completed-task-item"
                    >
                      <div className="task-status completed" onClick={() => handleToggleTask(task)}>
                        ✓
                      </div>
                      <div 
                        className="task-content" 
                        onClick={() => handleViewTaskDetails(task)}
                      >
                        <div className="task-text">{task.text}</div>
                        <div className="task-meta">
                          <span className="task-time">{task.time}</span>
                          <span className="task-completion-date">Completed on {formatDateHeader(date)}</span>
                        </div>
                      </div>
                      <div className="task-actions">
                        <button 
                          className="task-action restore" 
                          onClick={() => handleToggleTask(task)}
                          title="Mark as incomplete"
                        >
                          ↩
                        </button>
                        <button 
                          className="task-action delete" 
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete task"
                        >
                          🗑
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        {currentPopupItem && (
          <DetailPopup
            item={currentPopupItem}
            onClose={closePopup}
            onComplete={completeTaskFromPopup}
            container={document.body}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CompletedTasks;