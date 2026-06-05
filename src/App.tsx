import React, { useState } from 'react';
import { Menu, X, Loader2 } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PropertyLayout } from './components/PropertyLayout';
import { Occupancy } from './components/Occupancy';
import { Payments } from './components/Payments';
import { History } from './components/History';
import { MobileFAB } from './components/MobileFAB';
import { GlobalDashboard } from './components/GlobalDashboard';
import { Modal } from './components/Modal';
import { Home, Users, CreditCard, Building, Archive, ShieldAlert, CheckCircle2, Copy } from 'lucide-react';
import { ViewState } from './types';
import { SUPABASE_SQL_SETUP } from './lib/supabase';

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
  const { houses, activeHouseId, isSandboxMode, logout, user } = useAppContext();
  const currentHouse = houses.find(h => h.id === activeHouseId);
  const isSharedProperty = !!(
    currentHouse?.ownerEmail && 
    user?.email && 
    currentHouse.ownerEmail.toLowerCase().trim() !== user.email.toLowerCase().trim() &&
    currentHouse.ownerId !== user.id
  );

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3 relative z-20">
        <button onClick={toggleSidebar} className="p-2 text-slate-500 hover:bg-slate-100/50 rounded-md transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs">
              {activeHouseId === 'all' ? 'All Properties' : (currentHouse?.name || 'No Property Selected')} 
              <span className="hidden sm:inline"> Dashboard</span>
            </h2>
            {isSharedProperty && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200 hidden sm:inline-block">
                Shared
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate max-w-[150px] sm:max-w-xs">
            {activeHouseId === 'all' ? 'Unified Portfolio Overview' : 
             (isSharedProperty ? `Shared by ${currentHouse.ownerEmail}` : (currentHouse?.address || 'Add a property'))}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {isSandboxMode && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Demo Mode Active
            </span>
            <button
              onClick={logout}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              Login / Register
            </button>
          </div>
        )}
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
  const { 
    currentView, 
    setCurrentView, 
    activeHouseId, 
    user, 
    loadingUser, 
    isSandboxMode, 
    requiresDbMigration,
    setRequiresDbMigration,
    logout,
    houses,
    addHouse,
    addRoom
  } = useAppContext();
  
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  // Onboarding first property state
  const [isFirstPropertyModalOpen, setIsFirstPropertyModalOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState('');

  const activeHouses = houses.filter(h => !h.isDeleted);

  // Auto show popup when user is logged in but has no properties
  React.useEffect(() => {
    if (user && !loadingUser && activeHouses.length === 0) {
      setIsFirstPropertyModalOpen(true);
    } else {
      setIsFirstPropertyModalOpen(false);
    }
  }, [user, loadingUser, activeHouses.length]);

  const handleAddHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseName.trim()) return;

    const num = parseInt(numberOfRooms, 10);
    const floors = parseInt(numberOfFloors, 10);

    const floorsArray: string[] = [];
    if (!isNaN(floors) && floors > 0) {
      for (let f = 1; f <= floors; f++) {
        floorsArray.push(`Floor ${f}`);
      }
    } else {
      floorsArray.push('Floor 1');
    }

    const newId = addHouse({ 
      name: newHouseName, 
      address: newHouseAddress, 
      floors: floorsArray 
    });
    
    if (!isNaN(num) && num > 0) {
      if (!isNaN(floors) && floors > 0) {
        let roomCounter = 1;
        for (let f = 1; f <= floors; f++) {
          for (let r = 1; r <= num; r++) {
            addRoom({
              houseId: newId,
              roomNumber: `R${roomCounter}`,
              rentAmount: 1000,
              floor: `Floor ${f}`
            });
            roomCounter++;
          }
        }
      } else {
        for (let i = 1; i <= num; i++) {
          addRoom({
            houseId: newId,
            roomNumber: `Room ${i}`,
            rentAmount: 1000,
            floor: 'Floor 1'
          });
        }
      }
    }

    setNewHouseName('');
    setNewHouseAddress('');
    setNumberOfRooms('');
    setNumberOfFloors('');
    setIsFirstPropertyModalOpen(false);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 select-none font-sans">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-xs mt-3 font-mono text-center">Synchronizing cloud files...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onAuthSuccess={() => {}} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative flex-col">
      {requiresDbMigration && !isSandboxMode && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 flex items-start gap-3 flex-shrink-0 z-50 shadow-sm relative">
          <div className="bg-rose-100 p-1.5 rounded-full mt-0.5 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-rose-900">Database Schema Update Required</h3>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              Property sharing features depend on new database columns. Please run the provided SQL setup script in your Supabase SQL Editor. 
              <br/><span className="font-semibold">Shared properties will not load correctly until this is completed.</span>
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                setCopiedSql(true);
                setTimeout(() => setCopiedSql(false), 2000);
              }}
              className="mt-2 bg-white border border-rose-200 text-rose-700 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-50 transition-colors shadow-sm"
            >
              {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'SQL Snippet Copied!' : 'Copy SQL Script'}
            </button>
          </div>
          <button 
            onClick={() => setRequiresDbMigration(false)}
            className="p-1 hover:bg-rose-100 rounded-md text-rose-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden relative">
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

      <main className="flex-1 flex flex-col h-full bg-slate-50 w-full min-w-0 font-sans">
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

      {/* Onboarding first property modal */}
      <Modal 
        isOpen={isFirstPropertyModalOpen} 
        onClose={() => setIsFirstPropertyModalOpen(false)} 
        title="Create Your First Property"
      >
        <div className="mb-4">
          <p className="text-slate-600 text-xs leading-relaxed">
            Let's get started by defining your first real estate asset. You can automatically pre-generate individual rooms below or leave them blank to do so manually.
          </p>
        </div>
        <form onSubmit={handleAddHouse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Property Name *</label>
            <input 
              required
              type="text" 
              value={newHouseName}
              onChange={e => setNewHouseName(e.target.value)}
              className="w-full p-2 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
              placeholder="e.g. My Apartment Complex"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Address Location</label>
            <input 
              type="text" 
              value={newHouseAddress}
              onChange={e => setNewHouseAddress(e.target.value)}
              className="w-full p-2 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
              placeholder="e.g. Kathmandu, Nepal"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Rooms per Floor</label>
              <input 
                type="number" 
                value={numberOfRooms}
                onChange={e => setNumberOfRooms(e.target.value)}
                min="0"
                className="w-full p-2 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Number of Floors</label>
              <input 
                type="number" 
                value={numberOfFloors}
                onChange={e => setNumberOfFloors(e.target.value)}
                min="0"
                className="w-full p-2 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                placeholder="e.g. 3"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Pro Tip: Rooms will be automatically mapped under floors (e.g. R1, R2, R3...)</p>
          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button 
              type="submit" 
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              🚀 Launch Property Space
            </button>
          </div>
        </form>
      </Modal>
      </div>
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
