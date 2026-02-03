import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, formatINR } from '../App';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  type: string;
  label: string;
  icon: string;
  path?: string;
  sub?: string;
  id?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { state } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Actions
  const staticActions: CommandItem[] = [
    { type: 'nav', label: 'Go to Dashboard', icon: 'dashboard', path: '/' },
    { type: 'nav', label: 'Create New Invoice', icon: 'add_circle', path: '/invoices/create' },
    { type: 'nav', label: 'View Customers', icon: 'people', path: '/customers' },
    { type: 'nav', label: 'View Fleet', icon: 'directions_car', path: '/fleet' },
    { type: 'nav', label: 'Settings', icon: 'settings', path: '/settings' },
  ];

  // Dynamic Results
  const customerResults: CommandItem[] = state.customers
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .map(c => ({ type: 'customer', label: c.name, sub: 'Customer', icon: 'business', id: c.id }));
    
  const invoiceResults: CommandItem[] = state.invoices
    .filter(i => i.invoiceNumber.toLowerCase().includes(query.toLowerCase()))
    .map(i => ({ type: 'invoice', label: i.invoiceNumber, sub: `${i.customerName} • ${formatINR(i.amount)}`, icon: 'receipt', id: i.id }));

  const filteredItems = query === '' 
    ? staticActions 
    : [...staticActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase())), ...customerResults.slice(0, 3), ...invoiceResults.slice(0, 3)];

  const handleSelect = (item: CommandItem) => {
    onClose();
    if (item.type === 'nav' && item.path) {
      navigate(item.path);
    } else if (item.type === 'customer') {
      navigate('/customers', { state: { searchQuery: item.label } });
    } else if (item.type === 'invoice') {
      navigate('/invoices', { state: { searchQuery: item.label } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setActiveIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      setActiveIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      handleSelect(filteredItems[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-gray-900 bg-opacity-50 transition-opacity duration-200" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden transform transition-all scale-100 ring-1 ring-black ring-opacity-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative border-b border-gray-100">
          <span className="material-icons absolute left-4 top-3.5 text-gray-400">search</span>
          <input
            ref={inputRef}
            type="text"
            className="w-full py-4 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none text-lg"
            placeholder="Search or jump to... (Ctrl+K)"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-4 top-4 bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-500 border border-gray-200">
             ESC
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto py-2">
           {filteredItems.length === 0 ? (
             <div className="p-4 text-center text-gray-500">No results found.</div>
           ) : (
             filteredItems.map((item, index) => (
               <div
                 key={index}
                 className={`flex items-center px-4 py-3 cursor-pointer ${index === activeIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'}`}
                 onClick={() => handleSelect(item)}
                 onMouseEnter={() => setActiveIndex(index)}
               >
                 <span className={`material-icons mr-4 ${index === activeIndex ? 'text-blue-600' : 'text-gray-400'}`}>{item.icon}</span>
                 <div className="flex-1">
                   <div className="font-medium">{item.label}</div>
                   {item.sub && <div className="text-xs text-gray-500">{item.sub}</div>}
                 </div>
                 {index === activeIndex && <span className="material-icons text-blue-400 text-sm">subdirectory_arrow_left</span>}
               </div>
             ))
           )}
        </div>
        
        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 border-t border-gray-100 flex justify-between">
           <span><strong>Tip:</strong> Search invoices by #ID or customers by Name</span>
           <span>Optimile OS v2.4</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;