import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import Logo from '../customer_logo.jpeg';
interface HeaderProps {
  onMenuClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCommand: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, searchQuery, onSearchChange, onOpenCommand }) => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = state.notifications.length;

  const handleNotificationClick = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-primary text-white shadow-md z-40 flex items-center px-4 justify-between transition-colors duration-200">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-full hover:bg-white/10 focus:outline-none mr-4 transition-colors"
        >
          <span className="material-icons text-white">menu</span>
        </button>
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className=" pt-1 ">
        <div className="flex items-center justify-left">
          <img src={Logo} alt="Optimile logo" className="object-cover" style={{ width: '10%', height: '20%' }} />
        </div>
        <p className="text-[6px] uppercase tracking-widest text-white-500 mt-1 text-left">powered by Optimile</p>
      </div>
        </div>
      </div>

      {/* Global Search / Command Trigger */}
      <div className="flex-1 max-w-xl mx-4 hidden md:block">
        <div 
          className="relative group cursor-text" 
          onClick={onOpenCommand}
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons text-blue-300 group-hover:text-white transition-colors">search</span>
          </div>
          <input
            type="text"
            readOnly
            placeholder="Search Customers, Invoices, Fleet... (Ctrl+K)"
            className="block w-full pl-10 pr-3 py-2 border-none rounded-md leading-5 bg-blue-800/50 text-white placeholder-blue-200 focus:outline-none focus:bg-white/20 sm:text-sm transition-all duration-200 cursor-pointer"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
             <kbd className="hidden sm:inline-block border border-blue-400 rounded px-1 text-xs text-blue-200 font-sans">⌘K</kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Notification Center */}
        <div className="relative" ref={notifRef}>
          <button 
            className="p-2 rounded-full hover:bg-white/10 relative transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <span className="material-icons text-white">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-primary"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50 ring-1 ring-black ring-opacity-5 origin-top-right transform transition-all duration-200">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                 <span className="text-xs text-gray-500">{unreadCount} New</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {state.notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">No new notifications</div>
                ) : (
                  state.notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors flex items-start"
                      onClick={() => handleNotificationClick(notif.id)}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full mr-3 ${
                        notif.type === 'error' ? 'bg-red-500' : 
                        notif.type === 'warning' ? 'bg-yellow-500' : 
                        notif.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm text-gray-800">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">Just now</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {state.notifications.length > 0 && (
                <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                   <button className="text-xs text-blue-600 hover:underline" onClick={() => state.notifications.forEach(n => handleNotificationClick(n.id))}>
                     Clear All
                   </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="p-2 rounded-full hover:bg-white/10 transition-colors hidden sm:block">
           <span className="material-icons text-white">help_outline</span>
        </button>
        
        {/* User Profile Snippet */}
        <div className="ml-2 pl-2 border-l border-blue-400 hidden sm:flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold ring-2 ring-blue-400">
               {state.currentUser.name.charAt(0)}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
