import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Loader2, Home, Users, CreditCard, Building, Archive, ShieldAlert, CheckCircle2, Copy, Search, DoorOpen, UserCheck } from 'lucide-react';
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-zinc-200 z-40 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-center px-1 pb-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id as ViewState)}
            className={`flex flex-col items-center pt-3 pb-2 px-2 flex-1 transition-colors ${currentView === item.id ? 'text-teal-600' : 'text-zinc-500 hover:text-zinc-600'}`}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        {/* Combine history to reduce bottom tab clutter, or keep it. Let's add it */}
        <button
          onClick={() => setCurrentView('history')}
          className={`flex flex-col items-center pt-3 pb-2 px-2 flex-1 transition-colors ${currentView === 'history' ? 'text-teal-600' : 'text-zinc-500 hover:text-zinc-600'}`}
        >
          <Archive className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold uppercase tracking-widest">History</span>
        </button>
      </div>
    </div>
  );
}

function GlobalSearchBox() {
  const { houses, rooms, tenants, setActiveHouseId, setCurrentView, setSearchTargetRoomId } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedSearch = searchQuery.toLowerCase();

  // 1. Properties
  const matchingProperties = houses.filter(h => 
    !h.isDeleted && (
      String(h.name || '').toLowerCase().includes(normalizedSearch) ||
      String(h.address || '').toLowerCase().includes(normalizedSearch)
    )
  ).slice(0, 3);

  // 2. Rooms
  const matchingRooms = rooms.filter(r => 
    String(r.roomNumber || '').toLowerCase().includes(normalizedSearch)
  ).slice(0, 4);

  // 3. Tenants
  const matchingTenants = tenants.filter(t => 
    String(t.name || '').toLowerCase().includes(normalizedSearch) ||
    String(t.phone || '').toLowerCase().includes(normalizedSearch)
  ).slice(0, 4);

  const hasResults = matchingProperties.length > 0 || matchingRooms.length > 0 || matchingTenants.length > 0;

  const handlePropertyClick = (propertyId: string) => {
    setActiveHouseId(propertyId);
    setCurrentView('dashboard');
    setSearchQuery('');
    setIsFocused(false);
  };

  const handleRoomClick = (roomId: string, houseId: string) => {
    setActiveHouseId(houseId);
    setSearchTargetRoomId(roomId);
    setCurrentView('occupancy');
    setSearchQuery('');
    setIsFocused(false);
  };

  const handleTenantClick = (tenant: any) => {
    setActiveHouseId(tenant.houseId);
    const tenantRoomId = tenant.roomIds?.[0] || null;
    if (tenantRoomId) {
      setSearchTargetRoomId(tenantRoomId);
    }
    setCurrentView('occupancy');
    setSearchQuery('');
    setIsFocused(false);
  };

  return (
    <div className="relative w-full z-50" ref={searchRef}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder="Global Search (Properties, Rooms, Tenants)..."
        className="pl-9 pr-4 py-2 bg-zinc-100/80 border border-transparent rounded-xl text-sm outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 w-full transition-all text-zinc-700 font-medium placeholder:font-normal"
      />
      
      {isFocused && searchQuery && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden max-h-96 overflow-y-auto">
          {!hasResults ? (
            <div className="p-4 text-center text-sm text-zinc-500">No results found for "{searchQuery}"</div>
          ) : (
            <div className="py-2 divide-y divide-zinc-100">
              {/* Properties Section */}
              {matchingProperties.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <Building className="w-3 h-3" /> Properties
                  </div>
                  {matchingProperties.map(prop => (
                    <button
                      key={prop.id}
                      onClick={() => handlePropertyClick(prop.id)}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-50 flex flex-col group transition-colors border-l-2 border-transparent hover:border-teal-500"
                    >
                      <span className="font-semibold text-zinc-800 text-sm group-hover:text-teal-700">{prop.name}</span>
                      <span className="text-xs text-zinc-500">{prop.address || 'No address'}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Rooms Section */}
              {matchingRooms.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <DoorOpen className="w-3 h-3" /> Rooms
                  </div>
                  {matchingRooms.map(room => {
                    const prop = houses.find(h => h.id === room.houseId);
                    return (
                      <button
                        key={room.id}
                        onClick={() => handleRoomClick(room.id, room.houseId)}
                        className="w-full text-left px-4 py-2 hover:bg-zinc-50 flex items-center justify-between group transition-colors border-l-2 border-transparent hover:border-teal-500"
                      >
                        <div>
                          <span className="font-semibold text-zinc-800 text-sm group-hover:text-teal-700">Room {room.roomNumber}</span>
                          <span className="text-xs text-zinc-500 ml-2">({prop?.name || 'Unknown Property'})</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-500">NPR {room.rentAmount?.toLocaleString()}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tenants Section */}
              {matchingTenants.length > 0 && (
                <div className="py-2">
                  <div className="px-3 pb-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Tenants
                  </div>
                  {matchingTenants.map(tenant => {
                    const prop = houses.find(h => h.id === tenant.houseId);
                    const tenantRooms = rooms.filter(r => tenant.roomIds?.includes(r.id)).map(r => r.roomNumber).join(', ');
                    return (
                      <button
                        key={tenant.id}
                        onClick={() => handleTenantClick(tenant)}
                        className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center justify-between group transition-colors border-l-2 border-transparent hover:border-teal-500"
                      >
                        <div>
                          <div className="font-semibold text-zinc-800 text-sm group-hover:text-teal-700">{tenant.name}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {prop?.name} {tenantRooms ? `• Room ${tenantRooms}` : ''}
                          </div>
                        </div>
                        {tenant.phone && <span className="text-xs font-mono text-zinc-400">{tenant.phone}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GlobalHeader({ toggleSidebar, isSidebarOpen }: { toggleSidebar: () => void, isSidebarOpen: boolean }) {
  const { houses, activeHouseId, isSandboxMode, logout, user } = useAppContext();
  const currentHouse = houses.find(h => h.id === activeHouseId);
  const isSharedProperty = !!(
    currentHouse?.ownerEmail && 
    user?.email && 
    currentHouse.ownerEmail.toLowerCase().trim() !== user.email.toLowerCase().trim() &&
    currentHouse.ownerId !== user.id
  );

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3 relative z-20">
        <button onClick={toggleSidebar} className="p-2 text-zinc-500 hover:bg-zinc-100/50 rounded-md transition-colors block">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 truncate max-w-[150px] sm:max-w-xs">
              {activeHouseId === 'all' ? 'All Properties' : (currentHouse?.name || 'No Property Selected')} 
              <span className="hidden sm:inline"> Dashboard</span>
            </h2>
            {isSharedProperty && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest rounded-full border border-amber-200 hidden sm:inline-block">
                Shared
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate max-w-[150px] sm:max-w-xs">
            {activeHouseId === 'all' ? 'Unified Portfolio Overview' : 
             (isSharedProperty ? `Shared by ${currentHouse.ownerEmail}` : (currentHouse?.address || 'Add a property'))}
          </p>
        </div>
      </div>
      
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        <GlobalSearchBox />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {isSandboxMode && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-teal-50/50 border border-teal-100 text-teal-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              Demo Mode Active
            </span>
            <button
              onClick={logout}
              className="bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
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
    <footer className="h-10 bg-white border-t border-zinc-200 px-4 sm:px-8 flex items-center justify-between text-[10px] text-zinc-500 font-medium shrink-0">
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
    addRoom,
    globalAction,
    setGlobalAction
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

  React.useEffect(() => {
    if (globalAction === 'add-property') {
      setIsFirstPropertyModalOpen(true);
      setGlobalAction(null);
    }
  }, [globalAction, setGlobalAction]);

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
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-4 select-none font-sans">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        <p className="text-zinc-500 text-xs mt-3 font-mono text-center">Synchronizing cloud files...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onAuthSuccess={() => {}} />;
  }

  if (requiresDbMigration && !isSandboxMode) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50 font-sans text-zinc-800 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8 flex flex-col items-center text-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Database Update Required</h2>
          <p className="text-sm text-zinc-600 leading-relaxed mb-6">
            We've released new features that require your database schema to be updated. You must run the latest SQL setup script before you can continue using the dashboard. Data entered without this update will not be saved correctly.
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
              setCopiedSql(true);
              setTimeout(() => setCopiedSql(false), 2000);
            }}
            className="w-full bg-zinc-900 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-sm"
          >
            {copiedSql ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            {copiedSql ? 'SQL Script Copied!' : 'Copy SQL Script'}
          </button>
          
          <button
             onClick={() => window.location.reload()}
             className="w-full mt-3 bg-white border border-zinc-200 text-zinc-700 font-medium py-2.5 rounded-lg flex items-center justify-center hover:bg-zinc-50 transition-colors"
          >
             I have updated the database
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-800 overflow-hidden relative flex-col">
      <div className="flex flex-1 overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0 md:w-0'
      } md:relative overflow-hidden`}>
        <Sidebar currentView={currentView} setView={(view) => { setCurrentView(view); if (window.innerWidth <= 768) setIsSidebarOpen(false); }} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-full bg-zinc-50 w-full min-w-0 font-sans">
        <GlobalHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
        
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
          <p className="text-zinc-600 text-xs leading-relaxed">
            Let's get started by defining your first real estate asset. You can automatically pre-generate individual rooms below or leave them blank to do so manually.
          </p>
        </div>
        <form onSubmit={handleAddHouse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Property Name *</label>
            <input 
              required
              type="text" 
              value={newHouseName}
              onChange={e => setNewHouseName(e.target.value)}
              className="w-full p-2 border border-zinc-200 text-zinc-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-zinc-50"
              placeholder="e.g. My Apartment Complex"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Address Location</label>
            <input 
              type="text" 
              value={newHouseAddress}
              onChange={e => setNewHouseAddress(e.target.value)}
              className="w-full p-2 border border-zinc-200 text-zinc-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-zinc-50"
              placeholder="e.g. Kathmandu, Nepal"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Rooms per Floor</label>
              <input 
                type="number" 
                value={numberOfRooms}
                onChange={e => setNumberOfRooms(e.target.value)}
                min="0"
                className="w-full p-2 border border-zinc-200 text-zinc-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-zinc-50"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">Number of Floors</label>
              <input 
                type="number" 
                value={numberOfFloors}
                onChange={e => setNumberOfFloors(e.target.value)}
                min="0"
                className="w-full p-2 border border-zinc-200 text-zinc-800 text-xs font-medium rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-zinc-50"
                placeholder="e.g. 3"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500">Pro Tip: Rooms will be automatically mapped under floors (e.g. R1, R2, R3...)</p>
          <div className="pt-4 flex justify-end gap-2 border-t border-zinc-100">
            <button 
              type="submit" 
              className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
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
