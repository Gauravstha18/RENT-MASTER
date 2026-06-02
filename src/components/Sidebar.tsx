import React, { useState } from 'react';
import { Home, Users, DoorOpen, CreditCard, Building, Plus, LogOut } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ViewState } from '../types';
import { Modal } from './Modal';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export function Sidebar({ currentView, setView }: SidebarProps) {
  const { houses, activeHouseId, setActiveHouseId, addHouse, addRoom } = useAppContext();
  const [isAddHouseOpen, setIsAddHouseOpen] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseAddress, setNewHouseAddress] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState('');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'layout', label: 'Property Layout', icon: Building },
    { id: 'occupancy', label: 'Rooms & Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  const handleAddHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseName.trim()) return;
    const newId = addHouse({ name: newHouseName, address: newHouseAddress });
    
    const num = parseInt(numberOfRooms, 10);
    const floors = parseInt(numberOfFloors, 10);
    
    if (!isNaN(num) && num > 0) {
      if (!isNaN(floors) && floors > 0) {
        // Distribute rooms evenly (mostly) across floors
        const roomsPerFloor = Math.ceil(num / floors);
        for (let i = 1; i <= num; i++) {
          const floorNum = Math.ceil(i / roomsPerFloor);
          addRoom({
            houseId: newId,
            roomNumber: `R${i}`,
            rentAmount: 1000,
            floor: `Floor ${floorNum}`
          });
        }
      } else {
        for (let i = 1; i <= num; i++) {
          addRoom({
            houseId: newId,
            roomNumber: `Room ${i}`,
            rentAmount: 1000
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
    <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 h-screen">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white font-bold">RM</div>
          <h1 className="text-white font-semibold text-lg tracking-tight">RentMaster</h1>
        </div>
      </div>

      {/* House Switcher Section */}
      <div className="px-4 py-6 overflow-y-auto max-h-64">
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 block px-2">Your Properties</label>
        <div className="space-y-1">
          {houses.map(house => (
            <button 
              key={house.id}
              onClick={() => setActiveHouseId(house.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                activeHouseId === house.id 
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                  : 'text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span className="text-sm font-medium text-left flex-1 truncate">{house.name}</span>
              {activeHouseId === house.id && <span className="ml-auto text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-bold">Active</span>}
            </button>
          ))}
          <button 
            onClick={() => setIsAddHouseOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-slate-800 rounded-md border border-dashed border-slate-700 mt-2"
          >
            <span className="text-xs font-medium">+ Add New Property</span>
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="px-4 flex-1">
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 block px-2">Management</label>
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setView(item.id as ViewState)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  currentView === item.id 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">AD</div>
          <div className="flex-1">
            <p className="text-xs text-white font-medium">Admin User</p>
            <p className="text-[10px] text-slate-500">Master Account</p>
          </div>
        </div>
      </div>

      <Modal isOpen={isAddHouseOpen} onClose={() => setIsAddHouseOpen(false)} title="Add New Property">
        <form onSubmit={handleAddHouse} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
            <input 
              required
              type="text" 
              value={newHouseName}
              onChange={e => setNewHouseName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Sunrise Villa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input 
              type="text" 
              value={newHouseAddress}
              onChange={e => setNewHouseAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. 123 Main St"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rooms</label>
              <input 
                type="number" 
                value={numberOfRooms}
                onChange={e => setNumberOfRooms(e.target.value)}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g. 2"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Leave empty to add rooms manually later.</p>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsAddHouseOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Property</button>
          </div>
        </form>
      </Modal>
    </aside>
  );
}
