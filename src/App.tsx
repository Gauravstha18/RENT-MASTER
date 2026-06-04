import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PropertyLayout } from './components/PropertyLayout';
import { Occupancy } from './components/Occupancy';
import { Payments } from './components/Payments';
import { MobileFAB } from './components/MobileFAB';
import { ViewState } from './types';

function GlobalHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { houses, activeHouseId } = useAppContext();
  const currentHouse = houses.find(h => h.id === activeHouseId);
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
      <div className="flex items-center gap-3 relative z-20">
        <button onClick={toggleSidebar} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs">{currentHouse?.name || 'No Property Selected'} <span className="hidden sm:inline">Dashboard</span></h2>
          <p className="text-xs text-slate-500 truncate max-w-[150px] sm:max-w-xs">{currentHouse?.address || 'Add a property'}</p>
        </div>
      </div>
      <div className="flex gap-2 sm:gap-3">
        <button className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm hidden sm:block">Export Report</button>
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
  const { currentView, setCurrentView } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-50 md:z-0`}>
        <Sidebar currentView={currentView} setView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} />
      </div>

      <main className="flex-1 flex flex-col h-full bg-slate-50 w-full md:w-auto">
        <GlobalHeader toggleSidebar={() => setIsSidebarOpen(true)} />
        
        <div className="flex-1 overflow-auto">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'layout' && <PropertyLayout />}
          {currentView === 'occupancy' && <Occupancy />}
          {currentView === 'payments' && <Payments />}
        </div>
        
        <GlobalFooter />
      </main>

      {/* Mobile Floating Action Button Menu overlay */}
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
