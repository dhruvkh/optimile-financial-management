import React, { useEffect } from 'react';
import { useApp } from '../App';
import { Notification } from '../types';

const ToastItem: React.FC<{ notification: Notification; onClose: (id: string) => void }> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 3000); // Auto close after 3s
    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const bgColors: Record<Notification['type'], string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
  };

  const icons: Record<Notification['type'], string> = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
  };

  return (
    <div className={`flex items-center w-full max-w-xs p-4 mb-4 text-white rounded-lg shadow dark:bg-gray-800 ${bgColors[notification.type]}`} role="alert">
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-white bg-opacity-20">
        <span className="material-icons text-sm">{icons[notification.type]}</span>
      </div>
      <div className="ml-3 text-sm font-normal">{notification.message}</div>
      <button 
        onClick={() => onClose(notification.id)}
        className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 text-white hover:bg-white hover:bg-opacity-20 focus:ring-2 focus:ring-gray-300"
      >
        <span className="material-icons text-sm">close</span>
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { state, dispatch } = useApp();

  const handleClose = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {state.notifications.map((n) => (
        <ToastItem key={n.id} notification={n} onClose={handleClose} />
      ))}
    </div>
  );
};

export default ToastContainer;