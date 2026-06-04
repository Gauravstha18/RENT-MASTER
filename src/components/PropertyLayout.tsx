import React, { useState, useEffect } from 'react';
import { Building, Image as ImageIcon, DoorOpen, Plus, Edit2, Trash2, Info, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from './Modal';
import { Room } from '../types';
import { formatWithNepaliDate, getTodayDateStr, calculateProRatedAmount } from '../lib/dateUtils';

export function PropertyLayout() {
  const { houses, rooms, activeHouseId, updateHouse, deleteHouse, addRoom, updateRoom, deleteRoom, tenants, getTenantTotalRent, globalAction, setGlobalAction } = useAppContext();
  
  const currentHouse = houses.find(h => h.id === activeHouseId);
  const houseRooms = rooms.filter(r => r.houseId === activeHouseId);

  // Filters for rooms in current floor
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<'all' | 'occupied' | 'vacant'>('all');

  // Modal states
  const [isImageUrlModalOpen, setIsImageUrlModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [floor, setFloor] = useState('');

  const [viewRoomInfo, setViewRoomInfo] = useState<Room | null>(null);

  const openRoomInfo = (room: Room) => {
    setViewRoomInfo(room);
  };

  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  const [isUtilityModalOpen, setIsUtilityModalOpen] = useState(false);
  const [elecRate, setElecRate] = useState('');
  const [elecBilling, setElecBilling] = useState<'unit'|'fixed'>('unit');
  const [waterRate, setWaterRate] = useState('');
  const [waterBilling, setWaterBilling] = useState<'unit'|'fixed'>('fixed');
  const [trashRate, setTrashRate] = useState('');
  const [trashBilling, setTrashBilling] = useState<'unit'|'fixed'>('fixed');

  if (!currentHouse) return null;

  // Group rooms by floor
  // If property has no floor, group under 'Floor 1'
  const floorsMap = new Map<string, Room[]>();
  
  if (currentHouse.floors) {
    currentHouse.floors.forEach(f => {
      floorsMap.set(f, []);
    });
  }

  houseRooms.forEach(room => {
    const f = room.floor && room.floor.trim() !== '' ? room.floor : 'Floor 1';
    if (!floorsMap.has(f)) {
      floorsMap.set(f, []);
    }
    floorsMap.get(f)!.push(room);
  });

  if (floorsMap.size === 0) {
    floorsMap.set('Floor 1', []);
  }

  const uniqueFloors = Array.from(floorsMap.keys()).sort();
  const [activeFloor, setActiveFloor] = useState<string | null>(null);

  // If active floor is not set or not in unique floors, default to first floor
  React.useEffect(() => {
    if (uniqueFloors.length > 0 && (!activeFloor || !uniqueFloors.includes(activeFloor))) {
      setActiveFloor(uniqueFloors[0]);
    }
  }, [uniqueFloors, activeFloor]);

  const handleAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFloorName.trim()) return;
    
    const currentFloors = currentHouse.floors || [];
    if (!currentFloors.includes(newFloorName.trim())) {
      updateHouse(currentHouse.id, { floors: [...currentFloors, newFloorName.trim()] });
    }
    setActiveFloor(newFloorName.trim());
    setIsFloorModalOpen(false);
    setNewFloorName('');
  };

  const openUtilityModal = () => {
    setElecRate(currentHouse.electricityRate?.toString() || '');
    setElecBilling(currentHouse.electricityBillingType || 'unit');
    setWaterRate(currentHouse.waterRate?.toString() || '');
    setWaterBilling(currentHouse.waterBillingType || 'fixed');
    setTrashRate(currentHouse.trashCollectionRate?.toString() || '');
    setTrashBilling(currentHouse.trashBillingType || 'fixed');
    setIsUtilityModalOpen(true);
  };

  const handleUtilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateHouse(currentHouse.id, {
      electricityRate: elecRate ? Number(elecRate) : undefined,
      electricityBillingType: elecBilling,
      waterRate: waterRate ? Number(waterRate) : undefined,
      waterBillingType: waterBilling,
      trashCollectionRate: trashRate ? Number(trashRate) : undefined,
      trashBillingType: trashBilling,
    });
    setIsUtilityModalOpen(false);
  };

  const handleUpdateImage = (e: React.FormEvent) => {
    e.preventDefault();
    updateHouse(currentHouse.id, { imageUrl: imageUrlInput });
    setIsImageUrlModalOpen(false);
  };

  const openRoomModal = (room?: Room, prefillFloor?: string) => {
    if (room) {
      setEditingRoom(room);
      setRoomNumber(room.roomNumber);
      setRentAmount(room.rentAmount.toString());
      setFloor(room.floor || '');
    } else {
      setEditingRoom(null);
      setRoomNumber('');
      setRentAmount('');
      setFloor(prefillFloor && prefillFloor !== 'Floor 1' ? prefillFloor : 'Floor 1');
    }
    setIsRoomModalOpen(false); // Close first just in case
    setTimeout(() => setIsRoomModalOpen(true), 10);
  };

  useEffect(() => {
    if (globalAction === 'room') {
      openRoomModal();
      setGlobalAction(null);
    }
  }, [globalAction, setGlobalAction]);

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHouseId || !roomNumber.trim() || !rentAmount) return;

    if (editingRoom) {
      updateRoom(editingRoom.id, { roomNumber, rentAmount: Number(rentAmount), floor });
    } else {
      addRoom({ houseId: activeHouseId, roomNumber, rentAmount: Number(rentAmount), floor });
    }
    setIsRoomModalOpen(false);
  };

  const handleDeleteFloor = (floorName: string) => {
    const roomsInFloor = houseRooms.filter(r => (r.floor || 'Floor 1') === floorName);
    const hasOccupiedRoom = roomsInFloor.some(r => tenants.some(t => t.roomIds.includes(r.id)));
    
    if (hasOccupiedRoom) {
      alert("Cannot delete floor because it has occupied rooms. Please unassign tenants first.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${floorName}? This will also delete all ${roomsInFloor.length} rooms on this floor. This action cannot be undone.`)) {
      roomsInFloor.forEach(r => deleteRoom(r.id));
      
      const currentFloors = currentHouse.floors || [];
      updateHouse(currentHouse.id, {
        floors: currentFloors.filter(f => f !== floorName)
      });
      
      if (activeFloor === floorName) {
        setActiveFloor(uniqueFloors.find(f => f !== floorName) || null);
      }
    }
  };

  const handleRoomDelete = (roomId: string) => {
    const isOccupied = tenants.some(t => t.roomIds.includes(roomId));
    if (isOccupied) {
      alert("Please unassign the tenant from this room before deleting.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this room?")) {
      deleteRoom(roomId);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Property Cover Header */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="h-48 sm:h-64 bg-slate-100 relative group overflow-hidden">
          {currentHouse.imageUrl ? (
            <img 
              src={currentHouse.imageUrl} 
              alt={currentHouse.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.className = 'hidden';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <Building className="w-16 h-16 mb-4 opacity-50" />
              <p className="font-medium">No Property Preview</p>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              onClick={() => {
                setImageUrlInput(currentHouse.imageUrl || '');
                setIsImageUrlModalOpen(true);
              }}
              className="bg-white text-slate-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ImageIcon className="w-4 h-4" /> Edit Preview Image
            </button>
          </div>
        </div>
        <div className="p-6 md:p-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{currentHouse.name}</h1>
            <p className="text-slate-500 mt-1">{currentHouse.address}</p>
          </div>
          <div className="text-right">
            <div className="flex gap-2 justify-end mb-2">
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this entire property? This will also remove all rooms and tenants associated with it. This action cannot be undone.")) {
                    deleteHouse(currentHouse.id);
                  }
                }}
                className="text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-200"
              >
                Delete Property
              </button>
              <button 
                onClick={openUtilityModal}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
              >
                Setup Utility Rates
              </button>
            </div>
            <p className="text-3xl font-bold text-slate-900">{houseRooms.length}</p>
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Rooms</p>
          </div>
        </div>
      </div>

      {/* Floors Layout */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Property Layout</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsFloorModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Add Floor
            </button>
            <button 
              onClick={() => openRoomModal()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold"
            >
              <DoorOpen className="w-4 h-4" /> Add New Room
            </button>
          </div>
        </div>

        {uniqueFloors.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
            <p className="text-slate-400 font-medium">No layout defined. Add rooms to build your property structure.</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row shadow-sm bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Vertical Stack Sidebar (Basement to Top) */}
            <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0 flex flex-col pt-6 gap-2">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2 pl-2">Building Overview</h3>
              <div className="flex flex-col gap-1 relative">
                {/* Visual spine */}
                <div className="absolute left-[20px] top-6 bottom-6 w-0.5 bg-slate-200 -z-10 rounded-full hidden md:block"></div>
                {[...uniqueFloors].reverse().map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFloor(f)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold w-full text-left transition-all border ${
                      activeFloor === f 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-[1.02] z-10' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-1.5 h-6 rounded-full shrink-0 ${activeFloor === f ? 'bg-white/40' : 'bg-slate-200'}`}></span>
                    <span className="truncate">{f}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-white min-h-[400px]">
              {activeFloor && (
                <div className="animate-in fade-in duration-300 flex flex-col h-full">
                  <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-bold text-xl text-slate-800">{activeFloor}</h3>
                      <p className="text-xs text-slate-400 font-medium">{floorsMap.get(activeFloor)?.length || 0} Rooms configured</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteFloor(activeFloor)}
                        className="text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                        title="Delete Floor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openRoomModal(undefined, activeFloor)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Room
                      </button>
                    </div>
                  </div>

                  {/* Filter panel inside Property Layout */}
                  <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setRoomStatusFilter('all')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${roomStatusFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomStatusFilter('occupied')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${roomStatusFilter === 'occupied' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                      >
                        Occupied
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomStatusFilter('vacant')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${roomStatusFilter === 'vacant' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                      >
                        Vacant
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={roomSearch}
                        onChange={e => setRoomSearch(e.target.value)}
                        placeholder="Search by room or tenant..."
                        className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start">
                    {(() => {
                      const rawRooms = floorsMap.get(activeFloor) || [];
                      const filteredRooms = rawRooms.filter(room => {
                        const tenant = tenants.find(t => t.roomIds.includes(room.id));
                        const isOccupied = !!tenant;

                        const matchesSearch = room.roomNumber.toLowerCase().includes(roomSearch.toLowerCase()) || 
                          (tenant && tenant.name.toLowerCase().includes(roomSearch.toLowerCase()));

                        const matchesStatus = roomStatusFilter === 'all' || 
                          (roomStatusFilter === 'occupied' && isOccupied) || 
                          (roomStatusFilter === 'vacant' && !isOccupied);

                        return matchesSearch && matchesStatus;
                      });

                      if (filteredRooms.length === 0) {
                        return (
                          <div className="col-span-full py-12 text-center text-slate-400 font-medium">
                            No rooms matching filtered search query found on this floor.
                          </div>
                        );
                      }

                      return filteredRooms.map(room => {
                        const tenant = tenants.find(t => t.roomIds.includes(room.id));
                        const isOccupied = !!tenant;
                        return (
                          <div 
                            key={room.id} 
                            onClick={() => openRoomInfo(room)}
                            className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all bg-white group flex flex-col justify-between cursor-pointer"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                {isOccupied ? (
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" title="Occupied"></div>
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-rose-500" title="Vacant"></div>
                                )}
                                <span className="font-bold text-slate-800">{room.roomNumber}</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); openRoomModal(room); }} className="p-1 text-slate-400 hover:text-indigo-600" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleRoomDelete(room.id); }} className="p-1 text-slate-400 hover:text-rose-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-end border-t border-slate-100 pt-2.5 mt-2">
                              <div>
                                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Base Rent</div>
                                <div className="font-mono font-bold text-slate-800 text-sm">NPR {room.rentAmount}</div>
                              </div>
                              {isOccupied && tenant && (
                                <div className="text-right">
                                  <span className="text-[10px] text-indigo-600 font-semibold block truncate max-w-[130px]" title={tenant.name}>{tenant.name}</span>
                                  <span className="text-[9px] text-slate-400 font-semibold block">Joined: {tenant.startDate ? formatWithNepaliDate(tenant.startDate) : 'N/A'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewRoomInfo && (() => {
        const tenant = tenants.find(t => t.roomIds.includes(viewRoomInfo.id));
        const expectedRent = tenant ? getTenantTotalRent(tenant) : 0;
        const todayStr = getTodayDateStr();
        const calcArgs = tenant && tenant.startDate ? calculateProRatedAmount(tenant.startDate, todayStr, expectedRent, tenant.rentCycle) : null;
        
        return (
          <Modal isOpen={!!viewRoomInfo} onClose={() => setViewRoomInfo(null)} title={`Room ${viewRoomInfo.roomNumber} Overview`}>
            <div className="space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tenant ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {tenant ? <Info className="w-6 h-6" /> : <DoorOpen className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Room {viewRoomInfo.roomNumber}</h3>
                  <p className="text-sm font-medium text-slate-500">{viewRoomInfo.floor || 'No Floor Assigned'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Base Rent</p>
                  <p className="font-mono font-bold text-slate-900 text-lg">NPR {viewRoomInfo.rentAmount}</p>
                </div>
              </div>

              {tenant ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Current Tenant</p>
                      <p className="font-bold text-slate-900 text-lg">{tenant.name}</p>
                      <p className="text-sm text-slate-600">{tenant.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Status</p>
                      <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Occupied</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Joined Since</p>
                      <p className="font-mono text-sm font-bold text-slate-800">{formatWithNepaliDate(tenant.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Total Rent Rate / {tenant.rentCycle}</p>
                      <p className="font-mono text-sm font-bold text-slate-800">NPR {expectedRent}</p>
                    </div>
                  </div>

                  {calcArgs && (
                     <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-2">
                       <p className="flex justify-between items-center mb-1">
                         <span className="text-xs uppercase font-bold tracking-wider text-indigo-600">Billed Till Today</span>
                         <span className="font-mono font-bold text-base text-indigo-700">NPR {calcArgs.due}</span>
                       </p>
                       <p className="flex justify-between items-center">
                         <span className="text-[10px] text-indigo-400 font-medium">As of {formatWithNepaliDate(todayStr)}</span>
                         <span className="text-[10px] text-indigo-400 font-bold">{calcArgs.daysActive} days active</span>
                       </p>
                     </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-8 text-center">
                  <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DoorOpen className="w-6 h-6 text-rose-600" />
                  </div>
                  <h4 className="text-lg font-bold text-rose-800 mb-1">Room Available</h4>
                  <p className="text-sm text-rose-600 font-medium">This room is vacant and ready to be assigned to a new tenant.</p>
                </div>
              )}
            </div>
            <div className="pt-6 flex justify-end">
              <button type="button" onClick={() => setViewRoomInfo(null)} className="px-5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors text-sm font-bold">
                Close
              </button>
            </div>
          </Modal>
        );
      })()}

      <Modal isOpen={isUtilityModalOpen} onClose={() => setIsUtilityModalOpen(false)} title="Utility Provider Rates">
        <form onSubmit={handleUtilitySubmit} className="space-y-0">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Utility Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Billing Structure</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Rate / Amount (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Electricity</td>
                  <td className="px-4 py-3">
                    <select 
                      value={elecBilling}
                      onChange={e => setElecBilling(e.target.value as 'unit'|'fixed')}
                      className="p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-slate-600 w-full max-w-[150px]"
                    >
                      <option value="unit">Per Unit (kWh)</option>
                      <option value="fixed">Fixed Flat / Month</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={elecRate}
                      onChange={e => setElecRate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none max-w-[120px]"
                      placeholder="0.00" min="0" step="any"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Water</td>
                  <td className="px-4 py-3">
                    <select 
                      value={waterBilling}
                      onChange={e => setWaterBilling(e.target.value as 'unit'|'fixed')}
                      className="p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-slate-600 w-full max-w-[150px]"
                    >
                      <option value="unit">Per Unit / Gallon</option>
                      <option value="fixed">Fixed Flat / Month</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={waterRate}
                      onChange={e => setWaterRate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none max-w-[120px]"
                      placeholder="0.00" min="0" step="any"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Trash Collection</td>
                  <td className="px-4 py-3">
                    <select 
                      value={trashBilling}
                      onChange={e => setTrashBilling(e.target.value as 'unit'|'fixed')}
                      className="p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-slate-600 w-full max-w-[150px]"
                    >
                      <option value="unit">Per Unit</option>
                      <option value="fixed">Fixed Flat / Month</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={trashRate}
                      onChange={e => setTrashRate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none max-w-[120px]"
                      placeholder="0.00" min="0" step="any"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="pt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setIsUtilityModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold shadow-sm transition-colors">Save Rates</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isImageUrlModalOpen} onClose={() => setIsImageUrlModalOpen(false)} title="Update Property Preview">
        <form onSubmit={handleUpdateImage} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
            <input 
              type="url" 
              value={imageUrlInput}
              onChange={e => setImageUrlInput(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="https://example.com/house.jpg"
            />
            <p className="text-[10px] text-slate-500 mt-1">Paste a valid URL of an image.</p>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsImageUrlModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Save Image</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isFloorModalOpen} onClose={() => setIsFloorModalOpen(false)} title="Add New Floor">
        <form onSubmit={handleAddFloor} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Floor Name</label>
            <input 
              required
              type="text" 
              value={newFloorName}
              onChange={e => setNewFloorName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. Floor 3, Ground Floor"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsFloorModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Add Floor</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title={editingRoom ? "Edit Room" : "Add New Room"}>
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Room Number / Name</label>
            <input 
              required
              type="text" 
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Floor</label>
            <select 
              value={floor}
              onChange={e => setFloor(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              {uniqueFloors.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base Rent Amount (NPR)</label>
            <input 
              required
              type="number" 
              value={rentAmount}
              onChange={e => setRentAmount(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              min="0"
              step="any"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsRoomModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
              {editingRoom ? 'Save Changes' : 'Add Room'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
