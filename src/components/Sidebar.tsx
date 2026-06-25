import React, { useState } from 'react';
import { Home, Users, DoorOpen, CreditCard, Building, Plus, LogOut, Archive, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ViewState } from '../types';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onClose?: () => void;
}

export function Sidebar({ currentView, setView, onClose }: SidebarProps) {
  const { houses, activeHouseId, setActiveHouseId, addHouse, addRoom, rooms, tenants, user, logout } = useAppContext();
  const [isAddHouseOpen, setIsAddHouseOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState('');

  const activeHouses = houses.filter(h => !h.isDeleted);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'layout', label: 'Property Layout', icon: Building },
    { id: 'occupancy', label: 'Rooms & Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'history', label: 'Archive', icon: Archive },
  ];

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
    setIsAddHouseOpen(false);
  };

  return (
    <aside className="w-64 bg-zinc-900 flex flex-col border-r border-zinc-800 shrink-0 h-screen">
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-white font-bold">RM</div>
          <h1 className="text-white font-semibold text-lg tracking-tight">RentMaster</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors md:hidden block">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* House Switcher Section */}
      <div className="px-4 py-6 overflow-y-auto max-h-64 border-b border-zinc-800">
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 block px-2">Your Properties</label>
        <div className="space-y-1">
          <button 
            onClick={() => {
              setActiveHouseId('all');
              if (onClose) onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              activeHouseId === 'all'
                ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30' 
                : 'text-zinc-500 hover:bg-zinc-800 border border-transparent'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium text-left flex-1 truncate">All Properties</span>
          </button>
          
          <div className="h-px bg-zinc-800 my-2 shadow-sm"></div>

          {activeHouses.map(house => {
            const houseRooms = rooms.filter(r => r.houseId === house.id);
            const totalRooms = houseRooms.length;
            const occupiedRooms = houseRooms.filter(r => tenants.some(t => t.roomIds?.includes(r.id))).length;
            const emptyRooms = totalRooms - occupiedRooms;

            return (
            <button 
              key={house.id}
              onClick={() => {
                setActiveHouseId(house.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-start gap-3 px-3 py-2 rounded-md transition-colors ${
                activeHouseId === house.id 
                  ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30' 
                  : 'text-zinc-500 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              <div className="flex-1 flex flex-col justify-center items-start text-left truncate overflow-hidden pr-2">
                <span className={`text-sm font-medium flex items-center gap-2 ${activeHouseId === house.id ? 'text-teal-400' : 'text-zinc-300'}`}>
                  {house.name}
                </span>
                {house.ownerEmail && user?.email && house.ownerEmail.toLowerCase().trim() !== user.email.toLowerCase().trim() && house.ownerId !== user.id && (
                  <span className="text-[9px] font-medium text-amber-500/90 mt-0.5 truncate max-w-full">
                    Shared by {house.ownerEmail}
                  </span>
                )}
                <span className="text-[10px] mt-0.5 mt-1 block truncate w-full">
                  <span className="text-white font-bold">{totalRooms}</span> <span className="opacity-70">Rms</span> · <span className="text-emerald-400 font-bold">{occupiedRooms}</span> <span className="text-emerald-400/70">F</span> / <span className="text-red-400 font-bold">{emptyRooms}</span> <span className="text-red-400/70">E</span>
                </span>
              </div>
              {activeHouseId === house.id && <span className="text-[10px] bg-teal-500/30 text-teal-300 px-1.5 py-0.5 rounded uppercase font-bold shrink-0 mt-0.5">Active</span>}
            </button>
            )
          })}
          <button 
            onClick={() => setIsAddHouseOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:bg-zinc-800 rounded-md border border-dashed border-zinc-700 mt-2"
          >
            <span className="text-xs font-medium">+ Add New Property</span>
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      {activeHouseId !== 'all' ? (
        <nav className="px-4 flex-1">
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 block px-2">Management</label>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setView(item.id as ViewState);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    currentView === item.id 
                      ? 'bg-zinc-800 text-white' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <div className="flex-1" style={{ height: '310.667px' }}></div>
      )}

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-xs text-white font-bold shrink-0">
            {user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-bold truncate">{user?.displayName || 'User'}</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate">@{user?.displayName?.toLowerCase() || 'user'}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsLogoutModalOpen(true)} 
          title="Sign Out" 
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to sign in again to access your properties."
        confirmText="Sign Out"
      />

      <Modal isOpen={isAddHouseOpen} onClose={() => setIsAddHouseOpen(false)} title="Add New Property">
        <form onSubmit={handleAddHouse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
            <input 
              required
              type="text" 
              value={newHouseName}
              onChange={e => setNewHouseName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g. Sunrise Villa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input 
              type="text" 
              value={newHouseAddress}
              onChange={e => setNewHouseAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g. 123 Main St"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rooms per Floor</label>
              <input 
                type="number" 
                value={numberOfRooms}
                onChange={e => setNumberOfRooms(e.target.value)}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Floors</label>
              <input 
                type="number" 
                value={numberOfFloors}
                onChange={e => setNumberOfFloors(e.target.value)}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="e.g. 2"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Leave empty to add rooms manually later.</p>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsAddHouseOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Save Property</button>
          </div>
        </form>
      </Modal>
    </aside>
  );
}
