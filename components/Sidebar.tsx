import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useApp } from '../App';
import { UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

interface NavItem {
  label: string;
  icon: string;
  path: string;
  allowedRoles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', path: '/', allowedRoles: ['Admin', 'Finance Manager', 'Accountant', 'Operations Manager'] },
  { label: 'Customer Ledger', icon: 'account_balance_wallet', path: '/customers', allowedRoles: ['Admin', 'Finance Manager', 'Accountant'] },
  { label: 'Invoices', icon: 'receipt', path: '/invoices', allowedRoles: ['Admin', 'Finance Manager', 'Accountant'] },
  { label: 'Vendor Ledger', icon: 'store', path: '/vendors', allowedRoles: ['Admin', 'Finance Manager', 'Accountant'] },
  { label: 'Fleet Ledger', icon: 'directions_car', path: '/fleet', allowedRoles: ['Admin', 'Finance Manager', 'Accountant', 'Operations Manager'] },
  { label: 'Reconciliation', icon: 'sync_alt', path: '/reconciliation', allowedRoles: ['Admin', 'Finance Manager'] },
  { label: 'Reports', icon: 'bar_chart', path: '/reports', allowedRoles: ['Admin', 'Finance Manager', 'Accountant'] },
  { label: 'Settings', icon: 'settings', path: '/settings', allowedRoles: ['Admin', 'Finance Manager'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isMobile }) => {
  const { state, dispatch } = useApp();
  const location = useLocation();

  const baseClasses = "fixed top-0 left-0 h-full bg-white shadow-xl z-30 transition-transform duration-300 ease-in-out border-r border-gray-200";
  const visibilityClasses = isOpen ? "translate-x-0" : "-translate-x-full";
  const mobileClasses = isMobile ? "w-64" : "w-64"; 
  
  // Overlay for mobile
  const overlay = isMobile && isOpen ? (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-20"
      onClick={onClose}
    />
  ) : null;

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'SWITCH_USER', payload: e.target.value as UserRole });
  };

  return (
    <>
      {overlay}
      <aside className={`${baseClasses} ${visibilityClasses} ${mobileClasses} flex flex-col pt-16`}>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            {navItems.filter(item => item.allowedRoles.includes(state.currentUser.role)).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && onClose()}
                  className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-primary border-r-4 border-primary' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className={`material-icons mr-3 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center mb-3">
             <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-3 text-sm">
               {state.currentUser.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-medium text-gray-900 truncate">{state.currentUser.name}</p>
               <p className="text-xs text-green-600 flex items-center">
                 <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span> Online
               </p>
             </div>
          </div>
          
          <div className="mt-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Simulate Role</label>
            <select 
              value={state.currentUser.role} 
              onChange={handleRoleChange}
              className="w-full mt-1 text-xs border-gray-300 rounded shadow-sm focus:border-primary focus:ring focus:ring-primary p-1"
            >
              <option value="Admin">Admin</option>
              <option value="Finance Manager">Finance Manager</option>
              <option value="Accountant">Accountant</option>
              <option value="Operations Manager">Operations Manager</option>
            </select>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
