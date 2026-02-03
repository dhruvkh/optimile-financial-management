import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCommand?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, searchQuery, onSearchChange, onOpenCommand }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-neutral text-gray-800 font-sans">
      <Header 
        onMenuClick={toggleSidebar} 
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onOpenCommand={onOpenCommand || (() => {})}
      />
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isMobile={isMobile} 
      />

      <main 
        className={`pt-16 transition-all duration-300 ease-in-out ${
          sidebarOpen && !isMobile ? 'pl-64' : 'pl-0'
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
