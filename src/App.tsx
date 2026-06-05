import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PropertyLayout } from './components/PropertyLayout';
import { Occupancy } from './components/Occupancy';
import { Payments } from './components/Payments';
import { History } from './components/History';
import { MobileFAB } from './components/MobileFAB';
import { GlobalDashboard } from './components/GlobalDashboard';
import { Home, Users, CreditCard, Building, Archive } from 'lucide-react';
import { ViewState } from './types';

function MobileBottomNav() {
  const { currentView, setCurrentView, activeHouseId } = useAppContext();
  
  if (activeHouseId === 'all') return null;
  
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'layout', label: 'Property', icon: Building },
    { id: 'occupancy', label: 'Rooms', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-center px-1 pb-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as ViewState)}
            className={`flex flex-col items-center pt-3 pb-2 px-2 flex-1 transition-colors ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
        {/* Combine history to reduce bottom tab clutter, or keep it. Let's add it */}
        <button
          onClick={() => setCurrentView('history')}
          className={`flex flex-col items-center pt-3 pb-2 px-2 flex-1 transition-colors ${currentView === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Archive className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-wider">History</span>
        </button>
      </div>
    </div>
  );
}

function GlobalHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { houses, activeHouseId } = useAppContext();
  const currentHouse = houses.find(h => h.id === activeHouseId);
  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3 relative z-20">
        <button onClick={toggleSidebar} className="p-2 text-slate-500 hover:bg-slate-100/50 rounded-md transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs">
            {activeHouseId === 'all' ? 'All Properties' : (currentHouse?.name || 'No Property Selected')} 
            <span className="hidden sm:inline"> Dashboard</span>
          </h2>
          <p className="text-xs text-slate-500 truncate max-w-[150px] sm:max-w-xs">
            {activeHouseId === 'all' ? 'Unified Portfolio Overview' : (currentHouse?.address || 'Add a property')}
          </p>
        </div>
      </div>
      <div className="flex gap-2 sm:gap-3">
      </div>
    </header>
  );
}

function GlobalFooter() {
  return (
    <footer className="h-10 bg-white border-t border-slate-200 px-4 sm:px-8 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> <span className="hidden sm:inline">System Online</span>
        </div>
      </div>
      <div>Last Update: Just now</div>
    </footer>
  );
}

function AppContent() {
  const { currentView, setCurrentView, activeHouseId } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-transform duration-300 ease-in-out transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative w-64 ${isSidebarOpen ? 'md:translate-x-0 md:w-64' : 'md:hidden md:w-0'}`}>
        <Sidebar currentView={currentView} setView={(view) => { setCurrentView(view); if (window.innerWidth <= 768) setIsSidebarOpen(false); }} />
      </div>

      <main className="flex-1 flex flex-col h-full bg-slate-50 w-full min-w-0">
        <GlobalHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <div className="flex-1 overflow-auto pb-20 md:pb-0">
          {activeHouseId === 'all' ? (
            <GlobalDashboard />
          ) : (
            <>
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'layout' && <PropertyLayout />}
              {currentView === 'occupancy' && <Occupancy />}
              {currentView === 'payments' && <Payments />}
              {currentView === 'history' && <History />}
            </>
          )}
        </div>
        
        <div className="hidden md:block">
          <GlobalFooter />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Mobile Floating Action Button Menu overlay (optional now that we have bottom nav, but keeping it for context actions) */}
      <MobileFAB />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
