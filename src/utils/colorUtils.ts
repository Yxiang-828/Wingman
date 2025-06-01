/**
 * Standardized color utilities for consistent theming
 */

export const getStatusColor = (status: 'completed' | 'pending' | 'failed' | 'success' | 'warning' | 'error' | 'info') => {
  switch (status) {
    case 'completed':
    case 'success':
      return 'var(--color-success)';
    case 'pending':
      return 'var(--color-accent-primary)';
    case 'failed':
    case 'error':
      return 'var(--color-error)';
    case 'warning':
      return 'var(--color-warning)';
    case 'info':
      return 'var(--color-info)';
    default:
      return 'var(--color-text-muted)';
  }
};

export const getDashboardColor = (type: 'task' | 'event' | 'meeting' | 'personal' | 'reminder') => {
  switch (type) {
    case 'task':
      return 'var(--color-dashboard-pending)';
    case 'event':
      return 'var(--color-dashboard-event)';
    case 'meeting':
      return 'var(--color-dashboard-meeting)';
    case 'personal':
      return 'var(--color-dashboard-personal)';
    case 'reminder':
      return 'var(--color-dashboard-reminder)';
    default:
      return 'var(--color-accent-primary)';
  }
};

export const getModelColor = (status: 'recommended' | 'downloaded' | 'selected' | 'disabled') => {
  switch (status) {
    case 'recommended':
      return 'var(--color-model-recommended)';
    case 'downloaded':
      return 'var(--color-model-downloaded)';
    case 'selected':
      return 'var(--color-model-selected)';
    case 'disabled':
      return 'var(--color-model-disabled)';
    default:
      return 'var(--color-text-muted)';
  }
};