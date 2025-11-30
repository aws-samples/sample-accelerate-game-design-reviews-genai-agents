import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Alert, Flex } from '@aws-amplify/ui-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 means persistent
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  // Convenience methods
  showError: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000 // Default 5 seconds
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (if not persistent)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const showError = useCallback((title: string, message?: string) => {
    addNotification({ type: 'error', title, ...(message && { message }) });
  }, [addNotification]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addNotification({ type: 'success', title, ...(message && { message }) });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    addNotification({ type: 'warning', title, ...(message && { message }) });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    addNotification({ type: 'info', title, ...(message && { message }) });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        maxWidth: '400px',
        width: '100%'
      }}
    >
      <Flex direction="column" gap="0.5rem">
        {notifications.map(notification => (
          <Alert
            key={notification.id}
            variation={notification.type}
            isDismissible={true}
            onDismiss={() => removeNotification(notification.id)}
            heading={notification.title}
          >
            {notification.message}
          </Alert>
        ))}
      </Flex>
    </div>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};