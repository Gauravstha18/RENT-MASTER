import React, { useState, useEffect } from 'react';
import { Building, Image as ImageIcon, DoorOpen, Plus, Edit2, Trash2, Info, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Modal } from './Modal';
import { ConfirmModal } from './ConfirmModal';
import { Room } from '../types';
import { formatWithNepaliDate, getTodayDateStr, calculateProRatedAmount } from '../lib/dateUtils';

export function PropertyLayout() {
  const { houses, rooms, activeHouseId, updateHouse, deleteHouse, addRoom, updateRoom, deleteRoom, deleteFloor, tenants, getTenantTotalRent, globalAction, setGlobalAction, user } = useAppContext();
  
  const currentHouse = houses.find(h => h.id === activeHouseId);
  const isOwner = user && currentHouse && (
    (user.id && currentHouse.ownerId && user.id === currentHouse.ownerId) ||
    (user.email && currentHouse.ownerEmail && user.email.toLowerCase().trim() === currentHouse.ownerEmail.toLowerCase().trim()) ||
    !currentHouse.ownerEmail
  );
  const houseRooms = rooms.filter(r => r.houseId === activeHouseId);

  // Filters for rooms in current floor
  const [roomSearch, setRoomSearch] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<'all' | 'occupied' | 'vacant'>('all');

  // Collapsible view state for property layout floors list sidebar
  const [isFloorsSidebarCollapsed, setIsFloorsSidebarCollapsed] = useState(false);

  // Modal states
  const [isImageUrlModalOpen, setIsImageUrlModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  
  const [isBulkRentModalOpen, setIsBulkRentModalOpen] = useState(false);
  const [bulkRentAmount, setBulkRentAmount] = useState('');

  const handleBulkRentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeBulkRent(false);
  };

  const executeBulkRent = (applyToAllFloors = false) => {
    if (!bulkRentAmount) return;
    if (!applyToAllFloors && !activeFloor) return;
    
    const rentValue = Number(bulkRentAmount);
    if (isNaN(rentValue) || rentValue < 0) return;

    if (applyToAllFloors) {
      // Update all rooms in this property across ALL floors
      houseRooms.forEach(room => {
        updateRoom(room.id, { rentAmount: rentValue });
      });
    } else {
      // Update all rooms in the active floor only
      const roomsInFloor = houseRooms.filter(r => (r.floor || 'Floor 1') === activeFloor);
      roomsInFloor.forEach(room => {
        updateRoom(room.id, { rentAmount: rentValue });
      });
    }
    
    setIsBulkRentModalOpen(false);
    setBulkRentAmount('');
  };

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
  const [newFloorRoomsCount, setNewFloorRoomsCount] = useState<string>('');
  const [newFloorBaseRent, setNewFloorBaseRent] = useState<string>('');

  const [confirmDeleteFloorName, setConfirmDeleteFloorName] = useState<string | null>(null);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);

  // Modals for editing property and floor
  const [isEditPropertyOpen, setIsEditPropertyOpen] = useState(false);
  const [editPropertyName, setEditPropertyName] = useState('');
  const [editPropertyAddress, setEditPropertyAddress] = useState('');

  const handlePropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHouse) return;
    updateHouse(currentHouse.id, { name: editPropertyName, address: editPropertyAddress });
    setIsEditPropertyOpen(false);
  };

  const [isEditFloorOpen, setIsEditFloorOpen] = useState(false);
  const [editFloorName, setEditFloorName] = useState('');

  const handleFloorEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHouse || !activeFloor) return;
    const cleanFloor = editFloorName.trim();
    if (!cleanFloor || cleanFloor === activeFloor) return;

    // Update house floors array
    const currentFloors = currentHouse.floors || [];
    const newFloors = currentFloors.map(f => f === activeFloor ? cleanFloor : f);
    updateHouse(currentHouse.id, { floors: newFloors });

    // Update all rooms in this floor
    const roomsInFloor = houseRooms.filter(r => (r.floor || 'Floor 1') === activeFloor);
    roomsInFloor.forEach(r => {
      updateRoom(r.id, { floor: cleanFloor });
    });

    setActiveFloor(cleanFloor);
    setActiveFloors(prev => prev.map(f => f === activeFloor ? cleanFloor : f));
    setIsEditFloorOpen(false);
  };

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

  const uniqueFloors = Array.from(floorsMap.keys()).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10);
    const numB = parseInt(b.replace(/\D/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });
  const [activeFloor, setActiveFloor] = useState<string | null>(null);
  const [activeFloors, setActiveFloors] = useState<string[]>([]);

  // If active floor is not set or not in unique floors, default to first floor
  React.useEffect(() => {
    if (uniqueFloors.length > 0 && (!activeFloor || !uniqueFloors.includes(activeFloor))) {
      setActiveFloor(uniqueFloors[0]);
    }
  }, [uniqueFloors, activeFloor]);

  // Sync activeFloors with uniqueFloors, selecting first 5 floors by default, supporting multi-select
  React.useEffect(() => {
    if (uniqueFloors.length > 0) {
      if (activeFloors.length === 0) {
        setActiveFloors(uniqueFloors.slice(0, 5));
      } else {
        const validFloors = activeFloors.filter(f => uniqueFloors.includes(f));
        if (validFloors.length !== activeFloors.length) {
          setActiveFloors(validFloors.length > 0 ? validFloors : uniqueFloors.slice(0, 5));
        }
      }
    }
  }, [uniqueFloors]);

  const handleAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFloorName = newFloorName.trim();
    if (!cleanFloorName) return;
    
    const currentFloors = currentHouse.floors || [];
    if (!currentFloors.includes(cleanFloorName)) {
      updateHouse(currentHouse.id, { floors: [...currentFloors, cleanFloorName] });
    }
    
    // Auto generate rooms if count is provided
    const count = parseInt(newFloorRoomsCount, 10);
    if (!isNaN(count) && count > 0) {
      const baseRent = Number(newFloorBaseRent) || 0;
      for (let i = 1; i <= count; i++) {
        // e.g. if the floor is "Floor 1", rooms will be "101", "102" etc.
        // Let's try to extract a number from floor name
        const floorMatch = cleanFloorName.match(/\d+/);
        let prefix = '';
        if (floorMatch) {
           prefix = floorMatch[0];
        } else {
           prefix = cleanFloorName.substring(0, 1).toUpperCase();
        }
        const roomNumber = `${prefix}${i.toString().padStart(2, '0')}`;
        
        addRoom({
          houseId: currentHouse.id,
          roomNumber: roomNumber,
          rentAmount: baseRent,
          floor: cleanFloorName
        });
      }
    }

    setActiveFloor(cleanFloorName);
    setIsFloorModalOpen(false);
    setNewFloorName('');
    setNewFloorRoomsCount('');
    setNewFloorBaseRent('');
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'read' | 'write'>('read');

  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHouse || !shareEmail.trim()) return;
    
    const email = shareEmail.trim().toLowerCase();
    const currentCollaborators = currentHouse.collaborators || [];
    
    // Check if already a collaborator
    if (!currentCollaborators.some(c => c.email === email)) {
      updateHouse(currentHouse.id, { 
        collaborators: [...currentCollaborators, { email, role: shareRole }] 
      });
    }
    
    setShareEmail('');
    setShareRole('read');
  };
  
  const removeCollaborator = (emailToRemove: string) => {
    if (!currentHouse) return;
    const currentCollaborators = currentHouse.collaborators || [];
    updateHouse(currentHouse.id, {
      collaborators: currentCollaborators.filter(c => c.email !== emailToRemove)
    });
  };

  const updateCollaboratorRole = (emailToUpdate: string, newRole: 'read' | 'write') => {
    if (!currentHouse) return;
    const currentCollaborators = currentHouse.collaborators || [];
    updateHouse(currentHouse.id, {
      collaborators: currentCollaborators.map(c => c.email === emailToUpdate ? { ...c, role: newRole } : c)
    });
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
    setConfirmDeleteFloorName(floorName);
  };

  const executeDeleteFloor = () => {
    if (!currentHouse || !confirmDeleteFloorName) return;
    const floorName = confirmDeleteFloorName;
    
    deleteFloor(currentHouse.id, floorName);
    
    if (activeFloor === floorName) {
      setActiveFloor(uniqueFloors.find(f => f !== floorName) || null);
    }
    setConfirmDeleteFloorName(null);
  };

  const handleRoomDelete = (roomId: string) => {
    setConfirmDeleteRoomId(roomId);
  };

  const executeDeleteRoom = () => {
    if (!confirmDeleteRoomId) return;
    deleteRoom(confirmDeleteRoomId);
    setConfirmDeleteRoomId(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{currentHouse.name}</h1>
              {isOwner && (
                <button 
                  onClick={() => {
                    setEditPropertyName(currentHouse.name);
                    setEditPropertyAddress(currentHouse.address || '');
                    setIsEditPropertyOpen(true);
                  }} 
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                  title="Edit Property Info"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-slate-500 mt-1">{currentHouse.address}</p>
          </div>
          <div className="text-right">
            <div className="flex gap-2 justify-end mb-2">
              {isOwner && (
                <>
                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                  >
                    Share Property
                  </button>
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
                </>
              )}
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
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-800">Property Layout</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsFloorModalOpen(true)}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Floor
            </button>
            <button 
              onClick={() => openRoomModal()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold cursor-pointer"
            >
              <DoorOpen className="w-4 h-4" /> Add New Room
            </button>
          </div>
        </div>

        {uniqueFloors.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed animate-in fade-in duration-300">
            <p className="text-slate-400 font-medium">No layout defined. Add rooms to build your property structure.</p>
          </div>
        ) : (
          <div className="flex flex-col shadow-sm bg-white border border-slate-200 rounded-xl overflow-hidden animate-in fade-in duration-300">
            {/* Top Collapsible Floor Selector Panel */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 transition-all duration-300 select-none">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Building Floors</h3>
                  </div>
                  <button
                    onClick={() => {
                      const allSelected = activeFloors.length === uniqueFloors.length;
                      if (allSelected) {
                        setActiveFloors(uniqueFloors.slice(0, 5));
                      } else {
                        setActiveFloors(uniqueFloors);
                      }
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                  >
                    {activeFloors.length === uniqueFloors.length ? "Reset Selection" : "Show All"}
                  </button>
                </div>
                <button
                  onClick={() => setIsFloorsSidebarCollapsed(!isFloorsSidebarCollapsed)}
                  className="px-2.5 py-1.5 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-slate-200 bg-white shadow-sm"
                  title={isFloorsSidebarCollapsed ? "Expand Floor List" : "Collapse Floor List"}
                >
                  {isFloorsSidebarCollapsed ? (
                    <>
                      <span>Expand List</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Collapse Upward</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {isFloorsSidebarCollapsed ? (
                /* Collapsed: Only display active floors in expanding cards */
                <div className="w-full flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 overflow-x-auto py-1 scrollbar-none">
                  {activeFloors.length === uniqueFloors.length && (
                    <div 
                      onClick={() => {
                        setActiveFloors(uniqueFloors.slice(0, 5));
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold border border-indigo-600 shadow-sm cursor-pointer whitespace-nowrap active:scale-95 transition-all shrink-0"
                    >
                      <span className="w-1.5 h-5 rounded-full shrink-0 bg-white/40"></span>
                      <span>All Floors ({uniqueFloors.length})</span>
                    </div>
                  )}
                  {activeFloors.length !== uniqueFloors.length && uniqueFloors.filter(f => activeFloors.includes(f)).length > 0 ? (
                    uniqueFloors.filter(f => activeFloors.includes(f)).map(f => (
                      <div 
                        key={f} 
                        onClick={() => {
                          setActiveFloor(f);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold border border-indigo-600 shadow-sm cursor-pointer whitespace-nowrap active:scale-95 transition-all shrink-0"
                      >
                        <span className="w-1.5 h-5 rounded-full shrink-0 bg-white/40"></span>
                        <span>{f}</span>
                      </div>
                    ))
                  ) : activeFloors.length !== uniqueFloors.length && (
                    <span className="text-xs text-slate-400">No floors selected.</span>
                  )}
                </div>
              ) : (
                /* Expanded: List all floors in ascending order (sorted upward Floor 1, Floor 2...) */
                <div className="overflow-y-auto max-h-[180px] p-1 pr-1.5 scrollbar-thin scrollbar-thumb-slate-200/80 scrollbar-track-transparent animate-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                    <button
                      onClick={() => {
                        const allSelected = activeFloors.length === uniqueFloors.length;
                        if (allSelected) {
                          setActiveFloors(uniqueFloors.slice(0, 1));
                        } else {
                          setActiveFloors(uniqueFloors);
                        }
                      }}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-with-scale border cursor-pointer ${
                        activeFloors.length === uniqueFloors.length 
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-600 shadow-md shadow-indigo-600/15 scale-[1.02] z-10' 
                          : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      <span className={`w-1 h-3 rounded-full shrink-0 ${activeFloors.length === uniqueFloors.length ? 'bg-white/40' : 'bg-indigo-400'}`}></span>
                      <span className="truncate">All Floors ({uniqueFloors.length})</span>
                    </button>
                    {uniqueFloors.map(f => {
                      const isSelected = activeFloors.includes(f);
                      return (
                        <button
                          key={f}
                          onClick={() => {
                            if (isSelected) {
                              if (activeFloors.length > 1) {
                                setActiveFloors(activeFloors.filter(x => x !== f));
                              }
                            } else {
                              setActiveFloors([...activeFloors, f]);
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02] z-10' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-1 h-3 rounded-full shrink-0 ${isSelected ? 'bg-white/40' : 'bg-slate-200'}`}></span>
                          <span className="truncate">{f}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 bg-white min-h-[400px] flex flex-col">
              {/* Filter panel inside Property Layout */}
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${roomStatusFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('occupied')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${roomStatusFilter === 'occupied' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Occupied
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomStatusFilter('vacant')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${roomStatusFilter === 'vacant' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
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

              <div className="flex-1 overflow-y-auto max-h-[700px] divide-y divide-slate-100">
                {uniqueFloors.filter(f => activeFloors.includes(f)).length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    Please select at least one floor above to view its layout.
                  </div>
                ) : (
                  uniqueFloors.filter(f => activeFloors.includes(f)).map(floor => {
                    const rawRooms = floorsMap.get(floor) || [];
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

                    return (
                      <div key={floor} className="flex flex-col animate-in fade-in duration-300">
                        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                          <div>
                            <h3 className="font-bold text-lg text-slate-800">{floor}</h3>
                            <p className="text-xs text-slate-400 font-medium">{filteredRooms.length} of {rawRooms.length} Rooms configured</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button 
                              onClick={() => {
                                setActiveFloor(floor);
                                setEditFloorName(floor);
                                setIsEditFloorOpen(true);
                              }}
                              className="text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                              title="Rename Floor"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Rename
                            </button>
                            <button 
                              onClick={() => {
                                setActiveFloor(floor);
                                setIsBulkRentModalOpen(true);
                              }}
                              className="text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                              title="Edit Base Rent for Floor"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Bulk Rent
                            </button>
                            <button 
                              onClick={() => handleDeleteFloor(floor)}
                              className="text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                              title="Delete Floor"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                            <button 
                              onClick={() => {
                                setActiveFloor(floor);
                                openRoomModal(undefined, floor);
                              }}
                              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Room
                            </button>
                          </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 content-start">
                          {filteredRooms.length === 0 ? (
                            <div className="col-span-full py-8 text-center text-slate-400 text-xs font-medium">
                              No rooms matching parameters on this floor.
                            </div>
                          ) : (
                            filteredRooms.map(room => {
                              const tenant = tenants.find(t => t.roomIds.includes(room.id));
                              const isOccupied = !!tenant;
                              return (
                                <div 
                                  key={room.id} 
                                  onClick={() => openRoomInfo(room)}
                                  className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 bg-white group flex flex-col justify-between cursor-pointer"
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 text-sm">{room.roomNumber}</span>
                                      {isOccupied ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250/20">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                          Occupied
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-250/20">
                                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                          Vacant
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); openRoomModal(room); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-slate-50 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleRoomDelete(room.id); }} className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-between items-end border-t border-slate-100 pt-2.5 mt-2">
                                    <div>
                                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Base Rent</div>
                                      <div className="font-mono font-extrabold text-slate-800 text-sm">NPR {room.rentAmount}</div>
                                    </div>
                                    {isOccupied && tenant && (
                                      <div className="text-right">
                                        <span className="text-[10px] text-indigo-600 font-bold block truncate max-w-[130px]" title={tenant.name}>{tenant.name}</span>
                                        <span className="text-[9px] text-slate-400 font-semibold block">Joined: {tenant.startDate ? formatWithNepaliDate(tenant.startDate) : 'N/A'}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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

      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Property">
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Add collaborators to this property by entering their email addresses. Shared users will get full access to view and manage rooms, tenants, and payments for this property.
          </p>
          
          <form onSubmit={handleShareSubmit} className="flex gap-2 items-center">
            <input 
              type="email" 
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              placeholder="Enter collaborator's email..."
              required
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <select
              value={shareRole}
              onChange={e => setShareRole(e.target.value as 'read' | 'write')}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none cursor-pointer"
            >
              <option value="read">View Only</option>
              <option value="write">Can Edit</option>
            </select>
            <button 
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition"
            >
              Add
            </button>
          </form>

          {currentHouse.collaborators && currentHouse.collaborators.length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Collaborators</h4>
              <ul className="space-y-2">
                {currentHouse.collaborators.map(c => (
                  <li key={c.email} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                    <span className="text-sm font-semibold text-slate-800">{c.email}</span>
                    <div className="flex items-center gap-3">
                      <select
                        value={c.role}
                        onChange={e => updateCollaboratorRole(c.email, e.target.value as 'read' | 'write')}
                        className="text-xs p-1 bg-white border border-slate-200 rounded text-slate-600 outline-none cursor-pointer"
                      >
                        <option value="read">View Only</option>
                        <option value="write">Can Edit</option>
                      </select>
                      <button 
                        type="button" 
                        onClick={() => removeCollaborator(c.email)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

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

      <Modal isOpen={isBulkRentModalOpen} onClose={() => setIsBulkRentModalOpen(false)} title="Bulk Rent Adjustment">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Base Rent Amount (NPR)</label>
            <input 
              required
              type="number" 
              value={bulkRentAmount}
              onChange={e => setBulkRentAmount(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              min="0"
              step="any"
              placeholder="e.g. 5000"
            />
            <p className="text-[10px] text-slate-500 mt-1">Specify key rent rate to apply bulk changes.</p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
            <button type="button" onClick={() => setIsBulkRentModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium cursor-pointer">Cancel</button>
            <button 
              type="button" 
              onClick={() => executeBulkRent(false)} 
              disabled={!bulkRentAmount}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              Apply to {activeFloor} Only
            </button>
            <button 
              type="button" 
              onClick={() => executeBulkRent(true)} 
              disabled={!bulkRentAmount}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              Apply to All Floors
            </button>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Number of Rooms <span className="text-slate-400 font-normal text-[10px]">(optional)</span></label>
              <input 
                type="number" 
                min="0"
                value={newFloorRoomsCount}
                onChange={e => setNewFloorRoomsCount(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Base Rent <span className="text-slate-400 font-normal text-[10px]">(optional)</span></label>
              <input 
                type="number" 
                min="0"
                value={newFloorBaseRent}
                onChange={e => setNewFloorBaseRent(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. 5000"
                disabled={!newFloorRoomsCount || newFloorRoomsCount === '0'}
              />
            </div>
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
      <Modal isOpen={isEditPropertyOpen} onClose={() => setIsEditPropertyOpen(false)} title="Edit Property Information">
        <form onSubmit={handlePropertySubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property Name</label>
            <input 
              required
              type="text" 
              value={editPropertyName}
              onChange={e => setEditPropertyName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input 
              type="text" 
              value={editPropertyAddress}
              onChange={e => setEditPropertyAddress(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsEditPropertyOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Save Changes</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditFloorOpen} onClose={() => setIsEditFloorOpen(false)} title="Rename Floor">
        <form onSubmit={handleFloorEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Floor Name</label>
            <input 
              required
              type="text" 
              value={editFloorName}
              onChange={e => setEditFloorName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsEditFloorOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Save Name</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDeleteFloorName !== null}
        title="Delete Floor"
        message={
          <>
            Are you sure you want to delete <strong>{confirmDeleteFloorName}</strong>? 
            This will also permanently delete all its rooms. 
            <br/><br/>
            <span className="text-rose-600 font-semibold">Warning: Any tenants assigned to these rooms will be forcibly unassigned from them.</span>
          </>
        }
        onConfirm={executeDeleteFloor}
        onCancel={() => setConfirmDeleteFloorName(null)}
        confirmText="Delete Floor"
      />

      <ConfirmModal
        isOpen={confirmDeleteRoomId !== null}
        title="Delete Room"
        message={
          <>
            Are you sure you want to delete this room?
            <br/><br/>
            <span className="text-rose-600 font-semibold">Warning: If a tenant is assigned to this room, they will be forcibly unassigned from it.</span>
          </>
        }
        onConfirm={executeDeleteRoom}
        onCancel={() => setConfirmDeleteRoomId(null)}
        confirmText="Delete Room"
      />

    </div>
  );
}
